/**
 * Planen og modellene: uke/fase, dagens økter, prognose, XP/merker, ernæring.
 * Port av legacy lib/plan.py. Formler og konstanter er uendret.
 */
import ukeplanJson from './data/ukeplan.json';
import ukestrukturJson from './data/ukestruktur.json';
import faserJson from './data/faser.json';
import styrkeJson from './data/styrke.json';

export type UkeplanRad = {
	uke: number;
	mandag: string;
	fase: string;
	svom_okter: number;
	svom_km: number;
	sykkel_okter: number;
	sykkel_t: number;
	lop_okter: number;
	lop_km: number;
	styrke_okter: number;
	timer: number;
	fokus: string | null;
};
export type UkestrukturRad = {
	dag: string;
	ukedag: number;
	slot: 'morgen' | 'kveld';
	tid: string;
	base: string;
	bygg1: string;
	bygg2: string;
};
export type FaseRad = {
	fase: string;
	uker: string;
	svom: string;
	sykkel: string;
	lop: string;
	tester: string;
};
export type StyrkeRad = {
	okt: string;
	ovelse: string;
	sett_rep: string;
	vekt: string | null;
	reps: string | null;
};

export const UKEPLAN = ukeplanJson as UkeplanRad[];
export const UKESTRUKTUR = ukestrukturJson as UkestrukturRad[];
export const FASER = faserJson as FaseRad[];
export const STYRKE = styrkeJson as StyrkeRad[];

export type Okttype = 'Svøm' | 'Sykkel' | 'Løp' | 'Styrke' | 'Annet';
export const TYPER: Okttype[] = ['Svøm', 'Sykkel', 'Løp', 'Styrke', 'Annet'];

export type LoggRad = { dato: string; type: string; km: number; minutter: number };
export type TestRad = {
	uke: number;
	css_sek?: number | null;
	ftp?: number | null;
	kg?: number | null;
	k5_sek?: number | null;
	hm_sek?: number | null;
};

// ---------------------------------------------------------------- datoer (alle som 'YYYY-MM-DD')
export const START = '2026-09-14';
export const LOP = '2027-08-07';
export const LOPSNAVN = 'Efjord Extreme 70.3';
export const ANDRE_LOP: [string, string][] = [
	['E18-løpet 15 km', '2026-11-01'],
	['Dyreparken 10 km', '2027-04-24']
];
export const DELOAD = new Set([4, 8, 12, 16, 20, 24, 28, 32, 36, 40]);
export const DAGER = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
export const DAGER_KORT = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

const MS_DAG = 86_400_000;

/** ISO-dato -> UTC-Date (unngår tidssoneskift). */
export function tilDato(iso: string): Date {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d));
}
export function tilIso(d: Date): string {
	return d.toISOString().slice(0, 10);
}
/** Dagens dato i lokal tid som ISO. */
export function idag(): string {
	const n = new Date();
	const mm = String(n.getMonth() + 1).padStart(2, '0');
	const dd = String(n.getDate()).padStart(2, '0');
	return `${n.getFullYear()}-${mm}-${dd}`;
}
export function leggTilDager(iso: string, n: number): string {
	return tilIso(new Date(tilDato(iso).getTime() + n * MS_DAG));
}
export function dagerMellom(fra: string, til: string): number {
	return Math.round((tilDato(til).getTime() - tilDato(fra).getTime()) / MS_DAG);
}
/** 0 = mandag … 6 = søndag (som Python weekday()). */
export function ukedag(iso: string): number {
	return (tilDato(iso).getUTCDay() + 6) % 7;
}
export function ukeFor(iso: string): number {
	return Math.floor(dagerMellom(START, iso) / 7) + 1;
}
export function mandag(iso: string): string {
	return leggTilDager(iso, -ukedag(iso));
}
export function formatDato(iso: string): string {
	const [y, m, d] = iso.split('-');
	return `${d}.${m}.${y}`;
}
export function formatDatoKort(iso: string): string {
	const [y, m, d] = iso.split('-');
	return `${d}.${m}.${y.slice(2)}`;
}

// ---------------------------------------------------------------- plan
export function ukeplanRad(uke: number): UkeplanRad | null {
	return UKEPLAN.find((r) => r.uke === uke) ?? null;
}
export function faseFor(uke: number): string {
	return ukeplanRad(uke)?.fase ?? 'Utenfor planen';
}
export type StrukturKolonne = 'base' | 'bygg1' | 'bygg2';
export function strukturKolonne(fase: string): StrukturKolonne {
	if (fase === 'Overgang' || fase === 'Grunnlag') return 'base';
	if (fase === 'Bygg 1') return 'bygg1';
	return 'bygg2';
}
export type Okt = { tid: string; tekst: string };
export type DagensOkter = { morgen: Okt; kveld: Okt };
export function dagensOkter(iso: string): DagensOkter {
	const kol = strukturKolonne(faseFor(ukeFor(iso)));
	const wd = ukedag(iso) + 1;
	const finn = (slot: 'morgen' | 'kveld'): Okt => {
		const r = UKESTRUKTUR.find((x) => x.ukedag === wd && x.slot === slot);
		if (!r) throw new Error(`Mangler ukestruktur for ukedag ${wd} ${slot}`);
		return { tid: r.tid, tekst: r[kol] };
	};
	return { morgen: finn('morgen'), kveld: finn('kveld') };
}

export const STYRKE_NOKLER: [string, string][] = [
	['Push', 'Push'],
	['Pull', 'Pull'],
	['Upper', 'Upper body'],
	['Bein A', 'Bein A – tung'],
	['Bein B', 'Bein B – forebygg.']
];
export function styrkeoktI(tekst: string): StyrkeRad[] | null {
	for (const [nokkel, okt] of STYRKE_NOKLER) {
		if (tekst.includes(nokkel)) return STYRKE.filter((s) => s.okt === okt);
	}
	return null;
}
/** Passer en utført økt av gitt type (Løp/Sykkel/Svøm/Styrke) til teksten i planen? */
export function passerOkt(tekst: string, type: string): boolean {
	const t = tekst.toLowerCase();
	if (type === 'Løp') return t.includes('løp');
	if (type === 'Sykkel') return t.includes('sykkel') || t.includes('brick');
	if (type === 'Svøm') return t.includes('svøm');
	if (type === 'Styrke') return styrkeoktI(tekst) !== null;
	return false;
}

/**
 * Hvilket slot (morgen/kveld) en utført økt hører til, for automatisk avhuking.
 * `time` er starttidspunkt lokalt (0–23). Passer begge slots: før kl. 13 = morgen.
 */
export function slotForOkt(okter: DagensOkter, type: string, time: number): 'morgen' | 'kveld' | null {
	const m = passerOkt(okter.morgen.tekst, type);
	const k = passerOkt(okter.kveld.tekst, type);
	if (m && k) return time < 13 ? 'morgen' : 'kveld';
	if (m) return 'morgen';
	if (k) return 'kveld';
	return null;
}

/** Styrkeøvelser med vekt fra databasen der den finnes, ellers standard fra styrke.csv. */
export function medVekter(rader: StyrkeRad[], vekter: Record<string, string | null>): StyrkeRad[] {
	return rader.map((r) => (r.ovelse in vekter ? { ...r, vekt: vekter[r.ovelse] } : r));
}

/** Kommende løp (delmål og hovedløp) fra og med datoen, med dager igjen. */
export function kommendeLop(iso: string): { navn: string; dato: string; dager: number }[] {
	return [...ANDRE_LOP, [LOPSNAVN, LOP] as [string, string]]
		.filter(([, d]) => d >= iso)
		.map(([navn, d]) => ({ navn, dato: d, dager: dagerMellom(iso, d) }));
}

export function erHard(tekst: string): boolean {
	const t = tekst.toLowerCase();
	return ['langtur', 'intervall', 'tempo', 'terskel', 'simulering', '70.3'].some((k) =>
		t.includes(k)
	);
}

// ---------------------------------------------------------------- prognose
function siste(tester: TestRad[], kol: keyof TestRad, uke: number, standard: number): number {
	const t = tester.filter((r) => r.uke <= uke && r[kol] != null).sort((a, b) => a.uke - b.uke);
	return t.length ? Number(t[t.length - 1][kol]) : standard;
}
export type Prognose = {
	svom: number;
	t1: number;
	sykkel: number;
	t2: number;
	lop: number;
	total: number;
	css: number;
	ftp: number;
	kg: number;
	k5: number;
	hm: number;
};
/** Sekunder per del. Samme modell som regnearket. */
export function prognose(tester: TestRad[], uke: number): Prognose {
	const css = siste(tester, 'css_sek', uke, 150); // sek per 100 m
	const ftp = siste(tester, 'ftp', uke, 178);
	const kg = siste(tester, 'kg', uke, 80);
	const k5 = siste(tester, 'k5_sek', uke, 22 * 60 + 37);
	const hm = siste(tester, 'hm_sek', uke, 1 * 3600 + 48 * 60 + 57);
	const svom = 19 * css * 1.08;
	const t1 = 6 * 60;
	const fart = 24.5 * Math.pow(ftp / kg / 2.225, 0.6);
	const sykkel = (90 / fart) * 3600;
	const t2 = 3 * 60;
	const riegel = k5 * Math.pow(21.1 / 5, 1.06);
	const lop = ((hm + riegel) / 2) * 1.22;
	return { svom, t1, sykkel, t2, lop, total: svom + t1 + sykkel + t2 + lop, css, ftp, kg, k5, hm };
}

/** Pythons round(): halve rundes til nærmeste partall. Brukes der Python-koden runder. */
export function pyRound(x: number): number {
	const f = Math.floor(x);
	const diff = x - f;
	if (diff > 0.5) return f + 1;
	if (diff < 0.5) return f;
	return f % 2 === 0 ? f : f + 1;
}
export function fmtHms(sek: number): string {
	const s = pyRound(sek);
	const min = Math.floor(s / 60);
	const h = Math.floor(min / 60);
	const m = min % 60;
	return h ? `${h}:${String(m).padStart(2, '0')}` : `${m} min`;
}
export function fmtMs(sek: number): string {
	const s = pyRound(sek);
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
/** 'm:ss' eller 'h:mm:ss' -> sekunder. Tom streng -> null. */
export function parseTid(s: string): number | null {
	const t = s.trim();
	if (!t) return null;
	const deler = t.split(':').map((x) => parseInt(x, 10));
	if (deler.some((x) => Number.isNaN(x))) return null;
	return deler.reverse().reduce((sum, v, i) => sum + v * 60 ** i, 0);
}

export const TEST_UKER: [number, string][] = [
	[1, 'Utgangspunkt'],
	[4, '5 km + 400 m svøm'],
	[12, '20-min FTP + 5 km'],
	[20, '400 m CSS + FTP'],
	[28, '5 km + 1000 m svøm'],
	[32, 'Dyreparken 10 km'],
	[36, 'FTP + 1000 m svøm'],
	[40, 'Test-løp olympisk'],
	[42, 'Løpssimulering'],
	[47, 'Løpsdag']
];

// ---------------------------------------------------------------- xp og merker
export const NIVAER = [
	'Nybegynner',
	'Svømmefot',
	'Rullekonge',
	'Asfaltsliter',
	'Brick-mester',
	'Jernhode',
	'Maskin',
	'Halvveis-helt',
	'Sub-7-kandidat',
	'70.3-finisher'
];
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function xp(logg: LoggRad[]) {
	const l = logg.filter((r) => r.dato >= START);
	const p = pyRound(
		l.length * 10 +
			sum(l.filter((r) => r.type === 'Løp').map((r) => r.km)) +
			sum(l.filter((r) => r.type === 'Svøm').map((r) => r.km)) * 4 +
			sum(l.filter((r) => r.type === 'Sykkel').map((r) => r.minutter)) / 30
	);
	const niva = Math.min(10, Math.floor(p / 500) + 1);
	return {
		xp: p,
		niva,
		navn: NIVAER[niva - 1],
		til_neste: 500 - (p % 500),
		andel: (p % 500) / 500
	};
}

export type Merke = { navn: string; krav: string; ok: boolean };
export function merker(logg: LoggRad[], uke: number): Merke[] {
	const l = logg.filter((r) => r.dato >= START);
	const perUke = new Map<string, number>();
	for (const r of l) perUke.set(mandag(r.dato), (perUke.get(mandag(r.dato)) ?? 0) + 1);
	const sumType = (t: string, k: 'km' | 'minutter') =>
		sum(l.filter((r) => r.type === t).map((r) => r[k]));
	return [
		{ navn: 'Våt bak ørene', krav: 'Første svømmeøkt', ok: logg.some((r) => r.type === 'Svøm') },
		{
			navn: 'Fem på rad',
			krav: 'En uke med 5+ økter',
			ok: [...perUke.values()].some((n) => n >= 5)
		},
		{ navn: 'Hundrekilometer', krav: '100 km løp siden start', ok: sumType('Løp', 'km') >= 100 },
		{
			navn: 'Sadelsår',
			krav: 'Sykkeltur over 2,5 t',
			ok: logg.some((r) => r.type === 'Sykkel' && r.minutter >= 150)
		},
		{
			navn: 'Fisk',
			krav: '1,9 km svøm i ett strekk',
			ok: logg.some((r) => r.type === 'Svøm' && r.km >= 1.9)
		},
		{
			navn: 'Tusenkunstner',
			krav: '1 000 km sykkel siden start',
			ok: sumType('Sykkel', 'km') >= 1000
		},
		{ navn: 'Halvveis', krav: 'Uke 24 passert', ok: uke >= 24 },
		{
			navn: 'Jernvilje',
			krav: '25 styrkeøkter siden start',
			ok: l.filter((r) => r.type === 'Styrke').length >= 25
		},
		{ navn: 'Løpsklar', krav: 'Løpsuka er her', ok: uke >= 47 }
	];
}

// ---------------------------------------------------------------- ernæring
export function ernaering(okter: DagensOkter, kg: number) {
	const tekst = `${okter.morgen.tekst} ${okter.kveld.tekst}`;
	const hard = erHard(tekst);
	const fri = [okter.morgen, okter.kveld].every((o) => o.tekst.trim().startsWith('Fri'));
	const dagstype = hard ? 'Hard / lang dag' : fri ? 'Hviledag' : 'Vanlig treningsdag';
	const karbo: Record<string, [number, number]> = {
		'Hard / lang dag': [6, 8],
		'Vanlig treningsdag': [4, 6],
		Hviledag: [3, 4]
	};
	const mT = okter.morgen.tekst;
	let for_: string;
	if (mT.startsWith('Fri')) for_ = '–';
	else if (erHard(mT)) for_ = 'Frokost 2–3 t før: 1–2 g/kg karbo (havregrøt, brød, banan).';
	else for_ = 'Lett: banan eller brødskive, eller fastende hvis under 60 min rolig.';
	let under: string;
	if (tekst.includes('Langtur'))
		under = '60–90 g karbo/t fra første time. Tren magen – dette er løpsdagsrutinen.';
	else if (hard) under = 'Vann. Sportsdrikk hvis økten er over 75 min.';
	else under = 'Vann er nok.';
	const kT = okter.kveld.tekst;
	let kveld: string;
	if (kT.includes('Bein'))
		kveld = 'Middag med protein og karbo etter styrken, + 30–40 g protein før du legger deg.';
	else if (hard)
		kveld = 'Fyll opp: stor middag med karbo. Morgendagen starter med det du spiser i kveld.';
	else kveld = 'Normal middag. Protein i hvert måltid.';
	const [k0, k1] = karbo[dagstype];
	return {
		dagstype,
		karbo: `${pyRound(kg * k0)}–${pyRound(kg * k1)} g`,
		protein: `${pyRound(kg * 1.6)}–${pyRound(kg * 2.0)} g`,
		vaeske: (hard ? '3–4 l' : fri ? '2–2,5 l' : '2,5–3,5 l') + ' + 500–800 ml/t under trening',
		for_,
		under,
		etter: `Innen 60 min: ${pyRound(kg)} g karbo + ${pyRound(kg * 0.4)} g protein. To økter samme dag: ikke valgfritt.`,
		kveld
	};
}
