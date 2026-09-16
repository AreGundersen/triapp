import { hentLogg } from '$lib/supabase/queries';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { supabase } = await parent();
	return { logg: await hentLogg(supabase) };
};
