import { hentAvhuking, hentLogg, hentTester } from '$lib/supabase/queries';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { supabase } = await parent();
	const [logg, avhuking, tester] = await Promise.all([
		hentLogg(supabase),
		hentAvhuking(supabase),
		hentTester(supabase)
	]);
	return { logg, avhuking, tester };
};
