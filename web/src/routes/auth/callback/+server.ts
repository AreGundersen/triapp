import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Landingsside for lenker fra Supabase (passordreset, magic link). Bytter kode mot sesjon. */
export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	const neste = url.searchParams.get('next') ?? '/';
	if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (!error) redirect(303, neste);
	}
	redirect(303, '/login');
};
