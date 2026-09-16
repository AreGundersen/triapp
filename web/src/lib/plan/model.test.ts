/**
 * Verifiserer TypeScript-porten mot fasitverdier generert av legacy lib/plan.py
 * (se fasit.json; regenereres med scripts/lag_fasit.py hvis Python-modellen endres).
 */
import { describe, expect, it } from 'vitest';
import fasit from './fasit.json';
import {
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
