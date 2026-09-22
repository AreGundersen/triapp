import { hentStyrkeHistorikk, hentStyrkeVekter } from '$lib/supabase/queries';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { supabase } = await parent();
	const [vekter, historikk] = await Promise.all([
		hentStyrkeVekter(supabase),
		hentStyrkeHistorikk(supabase).catch(() => []) // tom til migrasjon 0002 er kjørt
	]);
	return { vekter, historikk };
};
