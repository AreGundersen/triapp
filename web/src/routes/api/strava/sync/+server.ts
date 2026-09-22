import { json } from '@sveltejs/kit';
import { kobleFra, synk } from '$lib/server/strava';
import type { RequestHandler } from './$types';

/** POST /api/strava/sync?dager=30 → { nye, hopp } */
export const POST: RequestHandler = async ({ url, locals }) => {
	const dager = Math.min(3650, Math.max(1, Number(url.searchParams.get('dager') ?? 30)));
	try {
		const [nye, hopp, flettet, avhuket] = await synk(locals.supabase, dager);
		return json({ nye, hopp, flettet, avhuket });
	} catch (e) {
		return json({ feil: (e as Error).message }, { status: 502 });
	}
};

/** DELETE /api/strava/sync → kobler fra Strava (sletter tokens) */
export const DELETE: RequestHandler = async ({ locals }) => {
	await kobleFra(locals.supabase);
	return json({ ok: true });
};
