import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { STORE_CONFIG, whatsappLink } from './core/config/store.config';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './app.html'
})
export class App {
  whatsappUrl = whatsappLink(
    STORE_CONFIG.whatsappPrincipal,
    'Hola ' + STORE_CONFIG.nombre + ', quiero información de sus productos'
  );
}
