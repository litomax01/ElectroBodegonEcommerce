import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { Producto } from '../../models/producto.model';
import { HeroComponent } from '../../components/hero/hero.component';
import { ProductCardComponent } from '../../components/product-card/product-card.component';

export interface Brand {
  name: string;
  logo: string;
  bg: string;
  textColor: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, HeroComponent, ProductCardComponent],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  destacados = signal<Producto[]>([]);
  loading = signal(true);
  skeletons = [1, 2, 3, 4, 5, 6];

  brands: Brand[] = [
    {
      name: 'Samsung',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Samsung_Logo.svg/320px-Samsung_Logo.svg.png',
      bg: '#fff', textColor: '#1428A0'
    },
    {
      name: 'LG',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/LG_logo_%282015%29.svg/200px-LG_logo_%282015%29.svg.png',
      bg: '#fff', textColor: '#A50034'
    },
    {
      name: 'Mabe',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Mabe_logo.svg/200px-Mabe_logo.svg.png',
      bg: '#fff', textColor: '#00529B'
    },
    {
      name: 'Indurama',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Indurama_logo.png',
      bg: '#fff', textColor: '#003087'
    },
    {
      name: 'Electrolux',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Electrolux_logo.svg/320px-Electrolux_logo.svg.png',
      bg: '#fff', textColor: '#0070CD'
    },
    {
      name: 'Oster',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Oster_logo.svg/200px-Oster_logo.svg.png',
      bg: '#fff', textColor: '#E60000'
    },
    {
      name: 'TCL',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/TCL_Logo.svg/200px-TCL_Logo.svg.png',
      bg: '#fff', textColor: '#C41424'
    },
    {
      name: 'Whirlpool',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Whirlpool_logo.svg/200px-Whirlpool_logo.svg.png',
      bg: '#fff', textColor: '#003087'
    },
    {
      name: 'Haceb',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Haceb_logo.svg/200px-Haceb_logo.svg.png',
      bg: '#fff', textColor: '#E60000'
    },
    {
      name: 'Bosch',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Bosch-logo.svg/200px-Bosch-logo.svg.png',
      bg: '#fff', textColor: '#C41424'
    },
  ];

  get brandsLoop(): Brand[] {
    return [...this.brands, ...this.brands];
  }

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.productService.getDestacados(6).subscribe({
      next: (products) => {
        this.destacados.set(products);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getMarcaQueryParams(marcaName: string): object {
    return { marca: marcaName };
  }

  trackById(_: number, p: Producto): number {
    return p.id;
  }

  trackByName(_: number, b: Brand): string {
    return b.name;
  }

  onLogoError(event: Event, name: string): void {
    const img = event.target as HTMLImageElement;
    const parent = img.parentElement;
    if (parent) {
      parent.innerHTML = '<span class="font-montserrat font-black text-sm text-gray-700">' + name + '</span>';
    }
  }
}
