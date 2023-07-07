import { redirect, type Handle } from '@sveltejs/kit';
import { locale } from 'svelte-i18n';
import { SvelteKitAuth } from "@auth/sveltekit";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import { sequence } from '@sveltejs/kit/hooks';
import { GITHUB_ID, GITHUB_SECRET, FIREBASE_PROJECT_ID, DB_PASSWD, FIREBASE_PRIVATE_KEY, APP_ENV, APP_DEBUG, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_SECRET } from "$env/static/private";
import { defaultEntities, MikroOrmAdapter } from "./mikro-orm-adapter";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { EntityCaseNamingStrategy, MikroORM, MongoNamingStrategy } from '@mikro-orm/core';
import { Graph } from './entities/Graph';
import { User } from './entities/User';
import { GraphQlAdapter } from './backend-interaction/graphql-adapter';
import type { AuthConfig } from '@auth/core';

// import serviceAccount from "../makutu-ui-firebase-adminsdk-xj056-228c3ee633.json"

const svelteKitAuth: Handle = SvelteKitAuth(async (event) => {
	const authOptions: AuthConfig = {
		trustHost: true,
		// adapter: MikroOrmAdapter({
		// 	dbName: "makutu-ui-" + APP_ENV,
		// 	driver: PostgreSqlDriver,
		// 	password: DB_PASSWD,
		// 	debug: APP_DEBUG === "true" || APP_DEBUG?.includes("db"),
		// 	namingStrategy: MongoNamingStrategy,
		// 	entities: [
		// 		defaultEntities.User,
		// 		defaultEntities.Account,
		// 		defaultEntities.Session,
		// 		defaultEntities.VerificationToken
		// 	]

		// }),
		secret: AUTH_SECRET,
		adapter: GraphQlAdapter(event),
		
		callbacks: {
			session: async ({ session, user }) => {
				session.user.id = user.id;

				return session;
			},

		},

		providers: [
			Google({
				clientId: GOOGLE_CLIENT_ID,
				clientSecret: GOOGLE_CLIENT_SECRET,
			}),
			GitHub({
				clientId: GITHUB_ID,
				clientSecret: GITHUB_SECRET,
			}),
		],
	}
	return authOptions;
}
) satisfies Handle;

const public_routes = [
	"/auth/**",
	// "/"
];

async function authorization({ event, resolve }) {
	// Check if the requested URL matches any public routes
	const isPublicRoute = public_routes.some((pattern) => {
		const regexPattern = new RegExp(`^${pattern.replace(/\/\*\*/g, '.*').replace(/\/\*/g, '[^/]*')}$`);
		return regexPattern.test(event.url.pathname);
	});

	// If the requested URL is not a public route
	if (!isPublicRoute) {
		const session = await event.locals.getSession();
		if (!session) {
			throw redirect(303, "/auth?redirect=" + event.url.pathname);
		}
	}

	// If the request is still here, just proceed as normal
	return resolve(event);
}

const localization: Handle = ({ event, resolve }) => {
	const lang = event.request.headers.get('accept-language')?.split(',')[0];
	if (lang) {
		locale.set(lang);
	}
	return resolve(event);
}

export const handle: Handle = sequence(localization, svelteKitAuth, authorization);