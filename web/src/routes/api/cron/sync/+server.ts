import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { synk } from '$lib/server/strava';
import type { Database } from '$lib/supabase/types';
import type { RequestHandler } from './$types';

/**
 * Daglig Strava-synk for alle brukere med tilkobling. Kalles av Vercel Cron (se web/vercel.json)
 * med `Authorization: Bearer <CRON_SECRET>`. Bruker service role key fordi ingen bruker er innlogget;
 * nøkkelen finnes bare i server-miljøet på Vercel, aldri i nettleseren.
 */
export const GET: RequestHandler = async ({ request }) => {
	if (!env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) {
		return json({ feil: 'Ikke autorisert' }, { status: 401 });
	}
	if (!env.SUPABASE_SERVICE_ROLE_KEY) {
		return json({ feil: 'SUPABASE_SERVICE_ROLE_KEY mangler' }, { status: 503 });
	}
	const admin = createClient<Database>(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { data: brukere, error } = await admin.from('strava_tokens').select('user_id');
	if (error) return json({ feil: error.message }, { status: 500 });

	const resultat: Record<string, unknown> = {};
	for (const { user_id } of brukere) {
		try {
			const [nye, hopp, flettet, avhuket] = await synk(admin, 7, user_id);
			resultat[user_id] = { nye, hopp, flettet, avhuket };
		} catch (e) {
			resultat[user_id] = { feil: (e as Error).message };
		}
	}
	return json({ ok: true, brukere: brukere.length, resultat });
};
