"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let _client: SupabaseClient | null = null;

/**
 * Browser Supabase client for Auth (Google sign-in) only — uses the PUBLIC
 * anon key. Returns null when not configured (login page hides the Google
 * button in that case).
 */
export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!_client) {
    _client = createClient(url, anonKey);
  }
  return _client;
}
