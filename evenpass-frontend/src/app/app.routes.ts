import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { CroquisComponent } from './components/croquis/croquis.component';
import { EventsComponent } from './components/events/events.component';
import { GuestsComponent } from './components/guests/guests.component';
import { TemplatesComponent } from './components/templates/templates.component';
import { ScannerComponent } from './components/scanner/scanner.component';
import { GuiaComponent } from './components/guia/guia.component';
import { UsersComponent } from './components/users/users.component';
import { ItineraryComponent } from './components/itinerary/itinerary.component';
import { HistoryComponent } from './components/history/history.component';
import { SettingsComponent } from './components/settings/settings.component';
import { SupportComponent } from './components/support/support.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'croquis', component: CroquisComponent },
      { path: 'events', component: EventsComponent },
      { path: 'guests', component: GuestsComponent },
      { path: 'itinerary', component: ItineraryComponent },
      { path: 'history', component: HistoryComponent },
      { path: 'scanner', component: ScannerComponent },
      { path: 'templates', component: TemplatesComponent },
      { path: 'users', component: UsersComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'guia', component: GuiaComponent },
      { path: 'support', component: SupportComponent }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
