import { ApplicationRef, Injectable, PLATFORM_ID, TransferState, inject, makeStateKey } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResultadoConfig, validarConfigSupabase } from './supabase-config';

/**
 * Lecturas PÚBLICAS de la tienda contra la API REST de Supabase (PostgREST), solo con la
 * clave publicable.
 *
 * Por qué existe en lugar de supabase-js:
 *  - La tienda solo necesita leer; supabase-js (~170 kB) queda únicamente en el panel /admin.
 *  - Al usar HttpClient, Angular espera estas peticiones durante el SSR.
 *  - Las respuestas obtenidas en el servidor se envían dentro del HTML (TransferState) y el
 *    navegador las reutiliza en el primer render: sin segunda descarga y con el mismo DOM que el SSR
 *    (sin desajustes de hidratación). Después de que la app se estabiliza, siempre se consulta en vivo.
 *
 * Nunca escribe: la seguridad real la imponen las políticas RLS.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseRestService {
  private readonly http = inject(HttpClient);
  private readonly transferState = inject(TransferState);
  private readonly servidor = isPlatformServer(inject(PLATFORM_ID));
  private readonly config: ResultadoConfig = validarConfigSupabase(environment.supabase);

  /** En el navegador, los datos del servidor solo se reutilizan durante la carga inicial. */
  private reutilizarDatosDelServidor = false;

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      this.reutilizarDatosDelServidor = true;
      void inject(ApplicationRef)
        .whenStable()
        .then(() => (this.reutilizarDatosDelServidor = false));
    }
  }

  get isConfigured(): boolean {
    return this.config.ok;
  }

  get motivoNoDisponible(): string | null {
    return this.config.ok ? null : this.config.motivo;
  }

  /** GET /rest/v1/{tabla}?{params} → arreglo de filas. */
  select<T>(tabla: string, params: Record<string, string>): Observable<T[]> {
    if (!this.config.ok) {
      throw new Error(`[supabase] No disponible: ${this.config.motivo}`);
    }
    let httpParams = new HttpParams();
    const consulta: string[] = [];
    for (const clave of Object.keys(params).sort()) {
      // La lista de columnas se compacta (sin saltos de línea ni espacios): URL corta y clave estable
      const valor = clave === 'select' ? params[clave].replace(/\s+/g, '') : params[clave];
      httpParams = httpParams.set(clave, valor);
      consulta.push(`${clave}=${valor}`);
    }
    const clave = makeStateKey<T[]>('sb:' + tabla + ':' + hash(consulta.join('&')));

    if (this.reutilizarDatosDelServidor && this.transferState.hasKey(clave)) {
      return of(this.transferState.get(clave, [] as T[]));
    }

    const headers = new HttpHeaders({ apikey: this.config.anonKey, Accept: 'application/json' });
    const peticion$ = this.http.get<T[]>(`${this.config.url}/rest/v1/${tabla}`, { params: httpParams, headers });
    return this.servidor ? peticion$.pipe(tap(filas => this.transferState.set(clave, filas))) : peticion$;
  }

  /** URL pública de un archivo de un bucket público (la base de datos guarda la ruta, no la URL). */
  urlPublica(bucket: string, ruta: string): string {
    if (!this.config.ok) return '';
    const segmentos = ruta.split('/').map(encodeURIComponent).join('/');
    return `${this.config.url}/storage/v1/object/public/${bucket}/${segmentos}`;
  }
}

/** Hash FNV-1a (32 bits) en base 36: clave corta para el estado transferido. */
function hash(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
