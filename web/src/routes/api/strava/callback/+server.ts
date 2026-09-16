import { redirect } from '@sveltejs/kit';
import { byttKode } from '$lib/server/strava';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	if (!code) redirect(303, '/logg?strava=avbrutt');
	try {
		await byttKode(locals.supabase, code);
	} catch (e) {
		console.error('Strava callback feilet', e);
		redirect(303, '/logg?strava=feil');
	}
	redirect(303, '/logg?strava=ok');
};
