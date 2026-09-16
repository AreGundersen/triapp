/**
 * Strava: OAuth per bruker og synk av aktiviteter til logg. Kjører kun server-side (client secret).
 * Port av legacy lib/strava.py.
 */
import { env } from '$env/dynamic/private';
import type { Klient } from '$lib/supabase/queries';
import { kjenteStravaIder, leggTilLogg } from '$lib/supabase/queries';

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

async function accessToken(sb: Klient): Promise<string | null> {
	const { data: tok } = await sb.from('strava_tokens').select('*').maybeSingle();
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

/** Henter aktiviteter for de siste `dager` og legger nye i logg. Returnerer [nye, hoppet over]. */
export async function synk(sb: Klient, dager: number): Promise<[number, number]> {
	const tok = await accessToken(sb);
	if (!tok) throw new Error('Strava er ikke koblet til.');
	const after = Math.floor((Date.now() - dager * 86_400_000) / 1000);
	const kjente = await kjenteStravaIder(sb);
	let nye = 0;
	let hopp = 0;
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
			await leggTilLogg(sb, {
				dato: a.start_date_local.slice(0, 10),
				type: typ,
				km: Math.round(((a.distance ?? 0) / 1000) * 10) / 10,
				minutter: Math.round((a.moving_time ?? 0) / 60),
				navn: a.name ?? '',
				kilde: 'Strava',
				strava_id: sid
			});
			kjente.add(sid);
			nye++;
		}
	}
	return [nye, hopp];
}
