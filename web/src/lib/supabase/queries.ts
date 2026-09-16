/**
 * Spørringer mot Supabase. Speiler legacy lib/db.py.
 * Row Level Security sørger for at bare innlogget brukers rader er synlige; user_id settes av databasen.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, LoggInsert, LoggRow, TesterInsert, TesterRow } from './types';

export type Klient = SupabaseClient<Database>;

function sjekk<T>(res: { data: T | null; error: { message: string } | null }): T {
	if (res.error) throw new Error(res.error.message);
	return res.data as T;
}

// ---------------------------------------------------------------- logg
export async function hentLogg(sb: Klient): Promise<LoggRow[]> {
	return sjekk(
		await sb.from('logg').select('*').order('dato', { ascending: false }).order('id', { ascending: false })
	);
}

export async function leggTilLogg(sb: Klient, rad: LoggInsert): Promise<void> {
	const r = { ...rad, km: Number(rad.km ?? 0), minutter: Number(rad.minutter ?? 0), navn: rad.navn ?? '' };
	if (r.strava_id) {
		sjekk(await sb.from('logg').upsert(r, { onConflict: 'user_id,strava_id', ignoreDuplicates: true }));
	} else {
		sjekk(await sb.from('logg').insert(r));
	}
}

export async function slettLogg(sb: Klient, id: number): Promise<void> {
	sjekk(await sb.from('logg').delete().eq('id', id));
}

export async function kjenteStravaIder(sb: Klient): Promise<Set<string>> {
	const rader = sjekk(await sb.from('logg').select('strava_id').not('strava_id', 'is', null));
	return new Set(rader.map((r) => r.strava_id as string));
}

/** Importerer seed-rader én gang; hopper over rader som finnes på dato+type+minutter. */
export async function importerSeed(
	sb: Klient,
	seed: { dato: string; type: string; km: number | null; minutter: number | null; navn: string | null; kilde: string | null }[]
): Promise<number> {
	const eksisterende = await hentLogg(sb);
	const nokkel = (d: string, t: string, m: number) => `${d}|${t}|${Math.round(m)}`;
	const finnes = new Set(eksisterende.map((r) => nokkel(r.dato, r.type, r.minutter)));
	const nye = seed
		.filter((r) => !finnes.has(nokkel(r.dato, r.type, r.minutter ?? 0)))
		.map((r) => ({
			dato: r.dato,
			type: r.type,
			km: r.km ?? 0,
			minutter: r.minutter ?? 0,
			navn: r.navn ?? '',
			kilde: r.kilde ?? 'Strava'
		}));
	if (nye.length) sjekk(await sb.from('logg').insert(nye));
	return nye.length;
}

// ---------------------------------------------------------------- avhuking
export type Avhuking = { morgen: boolean; kveld: boolean };

export async function hentAvhuking(sb: Klient): Promise<Record<string, Avhuking>> {
	const rader = sjekk(await sb.from('avhuking').select('dato, morgen, kveld'));
	const ut: Record<string, Avhuking> = {};
	for (const r of rader) ut[r.dato] = { morgen: r.morgen, kveld: r.kveld };
	return ut;
}

export async function settAvhuking(sb: Klient, dato: string, verdi: Avhuking): Promise<void> {
	sjekk(await sb.from('avhuking').upsert({ dato, ...verdi }, { onConflict: 'user_id,dato' }));
}

// ---------------------------------------------------------------- tester
export async function hentTester(sb: Klient): Promise<TesterRow[]> {
	return sjekk(await sb.from('tester').select('*').order('uke'));
}

export async function lagreTest(sb: Klient, rad: TesterInsert): Promise<void> {
	sjekk(await sb.from('tester').upsert(rad, { onConflict: 'user_id,uke' }));
}
