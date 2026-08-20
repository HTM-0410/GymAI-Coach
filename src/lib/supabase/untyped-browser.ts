// Tiny type aliases for typed Supabase queries.
// Avoid `never` inference issue when Database type is partial.
import { createBrowserClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createUntypedBrowser() {
  return createBrowserClient(URL, ANON);
}