/**
 * Verifiserer TypeScript-porten mot fasitverdier generert av legacy lib/plan.py
 * (se fasit.json; regenereres med scripts/lag_fasit.py hvis Python-modellen endres).
 */
import { describe, expect, it } from 'vitest';
import fasit from './fasit.json';
import {
	kommendeLop,
	medVekter,
	slotForOkt,
	dagensOkter,
	ernaering,
	faseFor,
	fmtHms,
	fmtMs,
	merker,
	parseTid,
	prognose,
	styrkeoktI,
	ukeFor,
	xp,
	type LoggRad,
	type TestRad
} from './model';

const naer = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe('datoer', () => {
	it('ukeFor matcher Python', () => {
		for (const [d, u] of Object.entries(fasit.uke_for)) expect(ukeFor(d)).toBe(u);
	});
	it('faseFor matcher Python', () => {
		for (const [u, f] of Object.entries(fasit.fase_for)) expect(faseFor(Number(u))).toBe(f);
	});
});

describe('dagens økter', () => {
	it('gir samme tid og tekst som Python i hver fase', () => {
		for (const [d, forventet] of Object.entries(fasit.dagens_okter)) {
			const o = dagensOkter(d);
			expect([o.morgen.tid, o.morgen.tekst]).toEqual(forventet.morgen);
			expect([o.kveld.tid, o.kveld.tekst]).toEqual(forventet.kveld);
		}
	});
	it('finner styrkeøkt i økttekst', () => {
		for (const [tekst, ovelser] of Object.entries(fasit.styrkeokt_i)) {
			const s = styrkeoktI(tekst);
			expect(s === null ? null : s.map((r) => r.ovelse)).toEqual(ovelser);
		}
	});
});

describe('prognose', () => {
	const sjekk = (p: ReturnType<typeof prognose>, f: typeof fasit.prognose_default) => {
		for (const k of ['svom', 't1', 'sykkel', 't2', 'lop', 'total', 'css', 'ftp', 'kg', 'k5', 'hm'] as const)
			naer(p[k], f[k]);
	};
	it('default-verdier', () => sjekk(prognose([], 1), fasit.prognose_default));
	const tester: TestRad[] = [
		{ uke: 4, css_sek: 140, ftp: null, kg: 79, k5_sek: 21 * 60 + 30, hm_sek: null },
		{ uke: 12, css_sek: null, ftp: 190, kg: null, k5_sek: null, hm_sek: null }
	];
	it('bruker siste test til og med uke', () => {
		sjekk(prognose(tester, 12), fasit.prognose_uke12);
		sjekk(prognose(tester, 5), fasit.prognose_uke5);
	});
	it('formatering', () => {
		expect(fmtHms(6 * 3600 + 29 * 60 + 40)).toBe(fasit.fmt.fmt_hms_6h29);
		expect(fmtHms(45 * 60 + 10)).toBe(fasit.fmt.fmt_hms_45min);
		expect(fmtMs(150)).toBe(fasit.fmt.fmt_ms_150);
		expect(fmtMs(129.6)).toBe(fasit.fmt.fmt_ms_129_6);
	});
	it('parseTid', () => {
		expect(parseTid('2:15')).toBe(135);
		expect(parseTid('1:45:00')).toBe(6300);
		expect(parseTid('')).toBeNull();
		expect(parseTid('abc')).toBeNull();
	});
});

const logg: LoggRad[] = [
	{ dato: '2026-09-14', type: 'Løp', km: 10, minutter: 55 },
	{ dato: '2026-09-15', type: 'Svøm', km: 1.5, minutter: 40 },
	{ dato: '2026-09-16', type: 'Sykkel', km: 45, minutter: 160 },
	{ dato: '2026-09-17', type: 'Styrke', km: 0, minutter: 50 },
	{ dato: '2026-09-18', type: 'Løp', km: 8, minutter: 45 },
	{ dato: '2026-09-01', type: 'Løp', km: 21.1, minutter: 109 }
];

describe('xp og merker', () => {
	it('xp matcher Python', () => {
		const x = xp(logg);
		expect(x.xp).toBe(fasit.xp.xp);
		expect(x.niva).toBe(fasit.xp.niva);
		expect(x.navn).toBe(fasit.xp.navn);
		expect(x.til_neste).toBe(fasit.xp.til_neste);
		naer(x.andel, fasit.xp.andel);
	});
	it('merker matcher Python', () => {
		const tilListe = (m: ReturnType<typeof merker>) => m.map((x) => [x.navn, x.krav, x.ok]);
		expect(tilListe(merker(logg, 3))).toEqual(fasit.merker_uke3);
		expect(tilListe(merker(logg, 24))).toEqual(fasit.merker_uke24);
	});
});

describe('ernæring', () => {
	it('matcher Python for ulike dagstyper', () => {
		for (const [d, forventet] of Object.entries(fasit.ernaering))
			expect(ernaering(dagensOkter(d), 80)).toEqual(forventet);
	});
});

describe('automatisk avhuking', () => {
	it('velger riktig slot ut fra type og klokkeslett', () => {
		const tir = dagensOkter('2026-09-22'); // base: morgen løp intervall, kveld Pull
		expect(slotForOkt(tir, 'Løp', 7)).toBe('morgen');
		expect(slotForOkt(tir, 'Styrke', 17)).toBe('kveld');
		expect(slotForOkt(tir, 'Svøm', 17)).toBeNull();
		const fre = dagensOkter('2027-02-05'); // bygg1: morgen rolig løp, kveld sykkel terskel + Upper body
		expect(slotForOkt(fre, 'Sykkel', 18)).toBe('kveld');
		expect(slotForOkt(fre, 'Styrke', 18)).toBe('kveld');
		expect(slotForOkt(fre, 'Løp', 7)).toBe('morgen');
	});
	it('bruker klokkeslett når begge slots passer', () => {
		const okter = { morgen: { tid: '07:00', tekst: 'Rolig løp' }, kveld: { tid: '18:00', tekst: 'Løp intervall' } };
		expect(slotForOkt(okter, 'Løp', 8)).toBe('morgen');
		expect(slotForOkt(okter, 'Løp', 18)).toBe('kveld');
	});
});

describe('vekter og delmål', () => {
	it('overstyrer vekt fra databasen', () => {
		const rader = medVekter(
			[{ okt: 'Push', ovelse: 'Pec Dec', sett_rep: '2x8-10', vekt: '40', reps: null }],
			{ 'Pec Dec': '45' }
		);
		expect(rader[0].vekt).toBe('45');
	});
	it('lister kommende løp med dager igjen', () => {
		const k = kommendeLop('2026-09-22');
		expect(k.map((x) => x.navn)).toEqual(['E18-løpet 15 km', 'Dyreparken 10 km', 'Efjord Extreme 70.3']);
		expect(k[0].dager).toBe(40);
		expect(kommendeLop('2027-08-08')).toEqual([]);
	});
});
