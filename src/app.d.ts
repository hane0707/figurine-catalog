// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				DB: D1Database;
				R2: R2Bucket;
				CLOUDFLARE_ACCOUNT_ID: string;
				R2_ACCESS_KEY_ID: string;
				R2_SECRET_ACCESS_KEY: string;
				R2_BUCKET_NAME: string;
				R2_KEY_PREFIX?: string; // 例: "dev"（ローカル開発時）/ ""（本番）
			};
			context: ExecutionContext;
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
