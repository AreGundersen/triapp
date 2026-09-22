import { hentAvhuking, hentLogg, hentStyrkeVekter, hentTester } from '$lib/supabase/queries';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { supabase } = await parent();
	const [logg, avhuking, tester, vekter] = await Promise.all([
		hentLogg(supabase),
		hentAvhuking(supabase),
		hentTester(supabase),
		hentStyrkeVekter(supabase)
	]);
	return { logg, avhuking, tester, vekter };
};
