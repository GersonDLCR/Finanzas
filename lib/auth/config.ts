export const authConfig = {
  provider: "Supabase Auth",
  supports: ["Google OAuth", "magic link", "email/password"],
  requiredEnv: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
};

export function hasSupabaseConfig(){
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
