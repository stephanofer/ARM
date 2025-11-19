interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    email: string;
    user: import("@supabase/supabase-js").User | null;
    isLoggedIn: boolean;
  }
}

// /// <reference types="astro/client" />

// type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

// interface Env {
//   readonly SUPABASE_URL: string;
//   readonly SUPABASE_ANON_KEY: string;
// }

// declare namespace App {
//   interface Locals extends Runtime {
//     supabase: ReturnType<typeof import('@supabase/supabase-js').createClient>;
//   }
// }
