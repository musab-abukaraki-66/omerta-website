/// <reference types="astro/client" />
interface ImportMetaEnv {
  readonly PUBLIC_CONTACT_ENDPOINT?: string;
}
/** Build-time flag (astro.config.mjs): false on Vercel preview deployments. */
declare const __OMERTA_INDEXABLE__: boolean;
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
