/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEYS = {
  SUPABASE_URL: 'defence_optics_supabase_url',
  SUPABASE_KEY: 'defence_optics_supabase_anon_key',
};

/**
 * Ensures the Supabase URL is strictly the root project URL (e.g., https://your-project.supabase.co)
 * and strips any accidentally appended /rest/v1 or /auth/v1 paths.
 */
export function cleanSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  // Remove any trailing slashes
  url = url.replace(/\/+$/, '');
  // Strip any accidental /rest/v1, /rest, /auth/v1, or /auth path segments
  url = url.replace(/\/(rest|auth)(\/v\d+)?(\/.*)?$/i, '');
  url = url.replace(/\/+$/, '');
  return url;
}

// Immediate self-healing: sanitize any legacy /rest/v1 stored in the user's browser localStorage
if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SUPABASE_URL);
    if (stored) {
      const cleaned = cleanSupabaseUrl(stored);
      if (cleaned !== stored) {
        localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, cleaned);
      }
    }
  } catch {
    // ignore
  }
}

export function getSupabaseCredentials(): { url: string; anonKey: string; isConnected: boolean } {
  let envUrlRaw = '';
  let envKeyRaw = '';
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      envUrlRaw = (import.meta.env.VITE_SUPABASE_URL as string) || '';
      envKeyRaw = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
    }
  } catch {
    // ignore
  }

  const envUrl = cleanSupabaseUrl(envUrlRaw);
  const envKey = envKeyRaw.trim();

  let localUrl = '';
  let localKey = '';
  if (typeof window !== 'undefined') {
    try {
      localUrl = cleanSupabaseUrl(localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) || '');
      localKey = (localStorage.getItem(STORAGE_KEYS.SUPABASE_KEY) || '').trim();
    } catch {
      // ignore
    }
  }

  // Prefer environment variables, fall back to local override
  const url = envUrl || localUrl;
  const anonKey = envKey || localKey;
  const isConnected = Boolean(url && anonKey && url.startsWith('http'));

  return { url, anonKey, isConnected };
}

let clientInstance: SupabaseClient | null = null;

export function initSupabase(): SupabaseClient | null {
  const { url, anonKey, isConnected } = getSupabaseCredentials();

  if (!isConnected) {
    return null;
  }

  // Re-create only if credentials changed or not yet initialized
  if (
    !clientInstance ||
    (clientInstance as any).supabaseUrl !== url ||
    (clientInstance as any).supabaseKey !== anonKey
  ) {
    try {
      clientInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      clientInstance = null;
    }
  }

  return clientInstance;
}

export function saveSupabaseConfig(rawUrl: string, anonKey: string): void {
  const cleanUrl = cleanSupabaseUrl(rawUrl);
  const cleanKey = anonKey.trim();

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, cleanUrl);
      localStorage.setItem(STORAGE_KEYS.SUPABASE_KEY, cleanKey);
    } catch (e) {
      console.error('Failed to save Supabase config to localStorage:', e);
    }
  }

  if (cleanUrl && cleanKey) {
    try {
      clientInstance = createClient(cleanUrl, cleanKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.error('Error re-initializing Supabase with new credentials:', err);
    }
  } else {
    clientInstance = null;
  }
}

// Initialized Supabase client instance
export const supabase = initSupabase();
