import { createClient } from "@supabase/supabase-js";

let browserClient;

function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
  }

  if (!supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.");
  }

  browserClient = createClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}

export const supabase = new Proxy(
  {},
  {
    get(_target, property) {
      return getSupabaseBrowserClient()[property];
    },
  }
);

export default supabase;
