export interface SupabasePublicConfig {
  /** SUPABASE_URL */
  url: string;
  /** SUPABASE_PUBLISHABLE_KEY (o SUPABASE_ANON_KEY heredada) — clave pública; la seguridad real la dan las políticas RLS */
  anonKey: string;
}

/** Datos públicos del sitio. Cadena vacía = no configurado (la función correspondiente queda desactivada). */
export interface SitePublicConfig {
  /** SITE_URL: origen público definitivo (https://dominio.com). Vacío = se usa el origen de la petición. */
  siteUrl: string;
  /** GA4_MEASUREMENT_ID (G-XXXXXXXXXX) */
  ga4Id: string;
  /** META_PIXEL_ID */
  metaPixelId: string;
}

export interface AppEnvironment {
  production: boolean;
  supabase: SupabasePublicConfig;
  site: SitePublicConfig;
}
