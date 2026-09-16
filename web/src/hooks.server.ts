import { createServerClient } from '@supabase/ssr';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { Database } from '$lib/supabase/types';

/** Sider som kan åpnes uten innlogging. */
const APNE = ['/login', '/auth/'];

const supabase: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (liste) => {
				for (const { name, value, options } of liste) {
					event.cookies.set(name, value, { ...options, path: '/' });
				}
			}
		}
	});

	/** Validerer JWT mot Supabase før sesjonen stoles på. */
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) return { session: null, user: null };
		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) return { session: null, user: null };
		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
};

const vakt: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;
	const sti = event.url.pathname;
	const apen = APNE.some((p) => sti.startsWith(p));
	if (!session && !apen) redirect(303, '/login');
	if (session && sti === '/login') redirect(303, '/');
	return resolve(event);
};

export const handle: Handle = sequence(supabase, vakt);
