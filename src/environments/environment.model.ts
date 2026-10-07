export interface SupabasePublicConfig {
  /** SUPABASE_URL */
  url: string;
  /** SUPABASE_ANON_KEY — clave pública; la seguridad real la dan las políticas RLS */
  anonKey: string;
}

export interface AppEnvironment {
  production: boolean;
  supabase: SupabasePublicConfig;
}
