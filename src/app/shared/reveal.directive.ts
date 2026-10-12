import { Directive, ElementRef, OnDestroy, OnInit, PLATFORM_ID, inject, input } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Aparición suave al hacer scroll (fade + subida corta).
 *
 * - El contenido siempre se renderiza visible (SSR / sin JS).
 * - Solo se oculta, en el navegador, lo que está fuera de la pantalla al iniciar.
 * - Respeta prefers-reduced-motion: no hace nada.
 */
@Directive({ selector: '[appReveal]', standalone: true })
export class RevealDirective implements OnInit, OnDestroy {
  /** Retardo en ms (útil para escalonar elementos hermanos) */
  readonly appReveal = input<number | ''>('');

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    if (!this.navegador || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Ya visible al cargar: no se oculta (evita parpadeos en el primer pantallazo)
    if (this.el.getBoundingClientRect().top < window.innerHeight) return;

    const retardo = this.appReveal();
    if (retardo !== '') this.el.style.transitionDelay = `${retardo}ms`;
    this.el.classList.add('reveal-pending');

    this.observer = new IntersectionObserver(
      entradas => {
        if (entradas.some(e => e.isIntersecting)) {
          this.el.classList.add('reveal-in');
          this.observer?.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );
    this.observer.observe(this.el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
