/**
 * Strava: OAuth per bruker og synk av aktiviteter til logg. Kjører kun server-side (client secret).
 * Port av legacy lib/strava.py.
 */
import { env } from '$env/dynamic/private';
import type { Klient } from '$lib/supabase/queries';
import { hukAv, kjenteStravaIder, leggTilLogg } from '$lib/supabase/queries';
import { dagensOkter, slotForOkt } from '$lib/plan/model';

const AUTH_URL = 'https://www.strava.com/oauth/authorize';
const TOKEN_URL = 'https://www.strava.com/oauth/token';
const API = 'https://www.strava.com/api/v3';

export const TYPEMAP: Record<string, string> = {
	Run: 'Løp',
	TrailRun: 'Løp',
	VirtualRun: 'Løp',
	Ride: 'Sykkel',
	VirtualRide: 'Sykkel',
	GravelRide: 'Sykkel',
	MountainBikeRide: 'Sykkel',
	EBikeRide: 'Sykkel',
	Swim: 'Svøm',
	WeightTraining: 'Styrke',
	Workout: 'Styrke',
	Crossfit: 'Styrke'
};

export function konfigurert(): boolean {
	return !!(env.STRAVA_CLIENT_ID && env.STRAVA_CLIENT_SECRET);
}

export function autoriserUrl(redirectUri: string): string {
	const q = new URLSearchParams({
		client_id: env.STRAVA_CLIENT_ID ?? '',
		response_type: 'code',
		redirect_uri: redirectUri,
		approval_prompt: 'auto',
		scope: 'activity:read_all'
	});
	return `${AUTH_URL}?${q}`;
}

type TokenSvar = { access_token: string; refresh_token: string; expires_at: number; athlete?: { id: number } };

async function tokenKall(body: Record<string, string>): Promise<TokenSvar> {
	const r = await fetch(TOKEN_URL, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: env.STRAVA_CLIENT_ID ?? '',
			client_secret: env.STRAVA_CLIENT_SECRET ?? '',
			...body
		})
	});
	if (!r.ok) throw new Error(`Strava token-feil ${r.status}: ${await r.text()}`);
	return (await r.json()) as TokenSvar;
}

export async function byttKode(sb: Klient, code: string): Promise<void> {
	const j = await tokenKall({ code, grant_type: 'authorization_code' });
	const { error } = await sb.from('strava_tokens').upsert(
		{ access: j.access_token, refresh: j.refresh_token, expires: j.expires_at, athlete_id: j.athlete ? String(j.athlete.id) : null },
		{ onConflict: 'user_id' }
	);
	if (error) throw new Error(error.message);
}

export async function tilkoblet(sb: Klient): Promise<boolean> {
	const { count } = await sb.from('strava_tokens').select('user_id', { count: 'exact', head: true });
	return (count ?? 0) > 0;
}

export async function kobleFra(sb: Klient): Promise<void> {
	const { error } = await sb.from('strava_tokens').delete().neq('access', '');
	if (error) throw new Error(error.message);
}

async function accessToken(sb: Klient, userId?: string): Promise<string | null> {
	let q = sb.from('strava_tokens').select('*');
	if (userId) q = q.eq('user_id', userId);
	const { data: tok } = await q.maybeSingle();
	if (!tok) return null;
	if (tok.expires - 60 < Date.now() / 1000) {
		const j = await tokenKall({ refresh_token: tok.refresh, grant_type: 'refresh_token' });
		await sb
			.from('strava_tokens')
			.update({ access: j.access_token, refresh: j.refresh_token, expires: j.expires_at })
			.eq('user_id', tok.user_id);
		return j.access_token;
	}
	return tok.access;
}

type Aktivitet = {
	id: number;
	name?: string;
	sport_type?: string;
	type?: string;
	distance?: number;
	moving_time?: number;
	start_date_local: string;
};

/**
 * Fletter dubletter mellom Strava-rader og rader uten Strava-ID (historikkimport/manuelt) som
 * beskriver samme økt: lik dato, type, varighet (hele minutter) og distanse (±0,2 km).
 * Strava-raden beholdes (den har ID-en som hindrer nye dubletter) og arver navnet fra den
 * andre raden, som gjerne er mer beskrivende. Én-til-én: hver rad flettes høyst én gang.
 */
export async function flettDubletter(sb: Klient, userId?: string): Promise<number> {
	let q = sb.from('logg').select('id, dato, type, km, minutter, navn, strava_id');
	if (userId) q = q.eq('user_id', userId);
	const { data: rader, error } = await q;
	if (error) throw new Error(error.message);
	const nokkel = (r: { dato: string; type: string; minutter: number }) =>
		`${r.dato}|${r.type}|${Math.round(Number(r.minutter))}`;
	const utenId = new Map<string, typeof rader>();
	for (const r of rader.filter((x) => !x.strava_id)) {
		const k = nokkel(r);
		utenId.set(k, [...(utenId.get(k) ?? []), r]);
	}
	let flettet = 0;
	for (const s of rader.filter((x) => x.strava_id)) {
		const kandidater = utenId.get(nokkel(s)) ?? [];
		const i = kandidater.findIndex((k) => Math.abs(Number(k.km) - Number(s.km)) <= 0.2);
		if (i < 0) continue;
		const [tvilling] = kandidater.splice(i, 1);
		if (tvilling.navn && tvilling.navn !== s.navn) {
			const { error: e1 } = await sb.from('logg').update({ navn: tvilling.navn }).eq('id', s.id);
			if (e1) throw new Error(e1.message);
		}
		const { error: e2 } = await sb.from('logg').delete().eq('id', tvilling.id);
		if (e2) throw new Error(e2.message);
		flettet++;
	}
	return flettet;
}

/**
 * Henter aktiviteter for de siste `dager`, legger nye i logg, huker av planlagt økt som passer,
 * og fletter dubletter. Returnerer [nye, hoppet over, flettet, avhuket].
 * `userId` trengs bare når `sb` er en service-role-klient (cron); ellers gir RLS riktig bruker.
 */
export async function synk(sb: Klient, dager: number, userId?: string): Promise<[number, number, number, number]> {
	const tok = await accessToken(sb, userId);
	if (!tok) throw new Error('Strava er ikke koblet til.');
	const after = Math.floor((Date.now() - dager * 86_400_000) / 1000);
	const kjente = await kjenteStravaIder(sb, userId);
	let nye = 0;
	let hopp = 0;
	let avhuket = 0;
	for (let page = 1; ; page++) {
		const q = new URLSearchParams({ after: String(after), per_page: '100', page: String(page) });
		const r = await fetch(`${API}/athlete/activities?${q}`, { headers: { Authorization: `Bearer ${tok}` } });
		if (!r.ok) throw new Error(`Strava-feil ${r.status}: ${await r.text()}`);
		const acts = (await r.json()) as Aktivitet[];
		if (!acts.length) break;
		for (const a of acts) {
			const sid = String(a.id);
			if (kjente.has(sid)) {
				hopp++;
				continue;
			}
			const typ = TYPEMAP[a.sport_type ?? a.type ?? ''] ?? 'Annet';
			const dato = a.start_date_local.slice(0, 10);
			await leggTilLogg(sb, {
				dato,
				type: typ,
				km: Math.round(((a.distance ?? 0) / 1000) * 10) / 10,
				minutter: Math.round((a.moving_time ?? 0) / 60),
				navn: a.name ?? '',
				kilde: 'Strava',
				strava_id: sid,
				...(userId ? { user_id: userId } : {})
			});
			kjente.add(sid);
			nye++;
			// Automatisk avhuking: passer økta til morgen- eller kveldsøkta i planen den dagen?
			const slot = slotForOkt(dagensOkter(dato), typ, Number(a.start_date_local.slice(11, 13)));
			if (slot && (await hukAv(sb, dato, slot, userId))) avhuket++;
		}
	}
	const flettet = await flettDubletter(sb, userId);
	return [Math.max(0, nye - flettet), hopp, flettet, avhuket];
}
