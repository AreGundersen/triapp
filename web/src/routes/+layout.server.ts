import { konfigurert, tilkoblet } from '$lib/server/strava';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { session, user, supabase }, cookies }) => {
	const stravaKonfigurert = konfigurert();
	const stravaTilkoblet = session && stravaKonfigurert ? await tilkoblet(supabase) : false;
	return { session, user, cookies: cookies.getAll(), stravaKonfigurert, stravaTilkoblet };
};
