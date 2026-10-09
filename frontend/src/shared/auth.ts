import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY harus diset di environment variables. " +
      "Salin .env.example ke .env dan isi nilai yang sesuai.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
