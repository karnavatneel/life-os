import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Supabase client. When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set,
 * the app runs in demo mode with local persistence. To go live:
 * 1. Create a project at supabase.com
 * 2. Run the SQL schema (see README) in the SQL Editor
 * 3. Add the two env vars in Netlify → Site configuration → Environment variables
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : null;

export const mode: 'supabase' | 'demo' = isSupabaseConfigured ? 'supabase' : 'demo';
