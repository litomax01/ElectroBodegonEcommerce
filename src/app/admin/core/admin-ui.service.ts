import { Injectable, signal } from '@angular/core';

export type TipoToast = 'ok' | 'error' | 'info';

export interface Toast {
  id: number;
  tipo: TipoToast;
  texto: string;
}

export interface OpcionesConfirmacion {
  titulo: string;
  mensaje: string;
  confirmar: string;
  /** Si se indica, el usuario debe escribir exactamente este texto para habilitar el botón. */
  escribir?: string;
  peligro?: boolean;
}

interface ConfirmacionAbierta extends OpcionesConfirmacion {
  resolver: (ok: boolean) => void;
}

/** Notificaciones y confirmaciones del panel (se pintan en AdminLayoutComponent). */
@Injectable({ providedIn: 'root' })
export class AdminUiService {
  readonly toasts = signal<Toast[]>([]);
  readonly confirmacion = signal<ConfirmacionAbierta | null>(null);
  private siguiente = 1;

  notificar(tipo: TipoToast, texto: string, ms = tipo === 'error' ? 8000 : 4000): void {
    const id = this.siguiente++;
    this.toasts.update(t => [...t, { id, tipo, texto }]);
    setTimeout(() => this.cerrarToast(id), ms);
  }

  ok(texto: string): void {
    this.notificar('ok', texto);
  }

  error(texto: string): void {
    this.notificar('error', texto);
  }

  cerrarToast(id: number): void {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }

  confirmar(opciones: OpcionesConfirmacion): Promise<boolean> {
    return new Promise<boolean>(resolver => {
      // Si ya hay una abierta se cancela (nunca quedan dos a la vez)
      this.confirmacion()?.resolver(false);
      this.confirmacion.set({ ...opciones, resolver });
    });
  }

  responder(ok: boolean): void {
    const c = this.confirmacion();
    this.confirmacion.set(null);
    c?.resolver(ok);
  }
}
