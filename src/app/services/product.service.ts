import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Producto } from '../models/producto.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private readonly dataUrl = 'assets/data/productos.json';

  constructor(private http: HttpClient) {}

  /** Obtiene todos los productos */
  getAll(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.dataUrl);
  }

  /** Obtiene solo los productos destacados (máx 6 para Home) */
  getDestacados(limit = 6): Observable<Producto[]> {
    return this.getAll().pipe(
      map(productos => productos.filter(p => p.destacado).slice(0, limit))
    );
  }

  /** Obtiene las marcas únicas del catálogo */
  getMarcas(): Observable<string[]> {
    return this.getAll().pipe(
      map(productos => [...new Set(productos.map(p => p.marca))].sort())
    );
  }

  /** Obtiene las categorías únicas del catálogo */
  getCategorias(): Observable<string[]> {
    return this.getAll().pipe(
      map(productos => [...new Set(productos.map(p => p.categoria))].sort())
    );
  }
}
