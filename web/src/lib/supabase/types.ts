/** Håndskrevne typer for tabellene i supabase/migrations/0001_init.sql. */

export type LoggRow = {
	id: number;
	user_id: string;
	dato: string;
	type: string;
	km: number;
	minutter: number;
	navn: string;
	kilde: string;
	strava_id: string | null;
	opprettet: string;
};
export type LoggInsert = {
	dato: string;
	type: string;
	km?: number;
	minutter?: number;
	navn?: string;
	kilde?: string;
	strava_id?: string | null;
	user_id?: string;
};

export type AvhukingRow = { user_id: string; dato: string; morgen: boolean; kveld: boolean };
export type AvhukingInsert = { dato: string; morgen: boolean; kveld: boolean; user_id?: string };

export type TesterRow = {
	user_id: string;
	uke: number;
	dato: string | null;
	css_sek: number | null;
	ftp: number | null;
	kg: number | null;
	k5_sek: number | null;
	hm_sek: number | null;
	kommentar: string | null;
};
export type TesterInsert = Omit<TesterRow, 'user_id'> & { user_id?: string };

export type StravaTokensRow = {
	user_id: string;
	athlete_id: string | null;
	access: string;
	refresh: string;
	expires: number;
};
export type StravaTokensInsert = Omit<StravaTokensRow, 'user_id'> & { user_id?: string };

export type StyrkeVektRow = { user_id: string; ovelse: string; vekt: string | null; oppdatert: string };
export type StyrkeVektInsert = { ovelse: string; vekt: string | null; user_id?: string };

type Tabell<Row, Insert> = {
	Row: Row;
	Insert: Insert;
	Update: Partial<Insert>;
	Relationships: [];
};

export type Database = {
	public: {
		Tables: {
			logg: Tabell<LoggRow, LoggInsert>;
			avhuking: Tabell<AvhukingRow, AvhukingInsert>;
			tester: Tabell<TesterRow, TesterInsert>;
			strava_tokens: Tabell<StravaTokensRow, StravaTokensInsert>;
			styrke_vekt: Tabell<StyrkeVektRow, StyrkeVektInsert>;
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
};
