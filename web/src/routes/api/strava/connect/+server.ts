import { error, redirect } from '@sveltejs/kit';
import { autoriserUrl, konfigurert } from '$lib/server/strava';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	if (!konfigurert()) error(503, 'Strava er ikke konfigurert (STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET).');
	redirect(303, autoriserUrl(`${url.origin}/api/strava/callback`));
};
