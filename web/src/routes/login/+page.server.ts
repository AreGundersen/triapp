import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const fd = await request.formData();
		const epost = String(fd.get('epost') ?? '').trim();
		const passord = String(fd.get('passord') ?? '');
		if (!epost || !passord) return fail(400, { epost, feil: 'Fyll inn e-post og passord.' });
		const { error } = await locals.supabase.auth.signInWithPassword({ email: epost, password: passord });
		if (error) return fail(400, { epost, feil: 'Feil e-post eller passord.' });
		redirect(303, '/');
	}
};
