export interface SupabasePublicConfig {
  /** SUPABASE_URL */
  url: string;
  /** SUPABASE_PUBLISHABLE_KEY (o SUPABASE_ANON_KEY heredada) — clave pública; la seguridad real la dan las políticas RLS */
  anonKey: string;
}

export interface AppEnvironment {
  production: boolean;
  supabase: SupabasePublicConfig;
}
