/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_WHATSAPP_NUMBER?: string;
  readonly VITE_BKASH_NUMBER?: string;
  readonly VITE_NAGAD_NUMBER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
