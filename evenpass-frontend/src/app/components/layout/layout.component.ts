import { Component, signal, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { NotificationService } from '../../services/notification.service';
import { EventService } from '../../services/event.service';
import { EventItem, EventStatus } from '../../models/models';
import { IconComponent } from '../icon.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, IconComponent],
  template: `
    <div class="app-layout-wrapper">
      
      <!-- Sleek Scrollable Sidebar -->
      <aside class="sidebar-container">
        
        <!-- Brand Header -->
        <div class="sidebar-brand-box">
          <div class="brand-logo-wrap">
            <span class="brand-monogram">EP</span>
            <div class="brand-text-block">
              <span class="brand-name">Even<span class="brand-accent">Pass</span></span>
              <span class="brand-sub">ENTERPRISE SAAS</span>
            </div>
          </div>
        </div>

        <!-- Event Context Switcher Widget -->
        <div class="active-event-selector-card" (click)="openPalette()" title="Click para buscar o cambiar evento">
          <div class="selector-meta-header">
            <span class="selector-label">EVENTO ACTIVO</span>
            <span class="badge" [ngClass]="{
              'badge-in-progress': eventService.selectedEvent()?.status === 'EN_PROGRESO',
              'badge-pending': eventService.selectedEvent()?.status === 'PENDIENTE',
              'badge-completed': eventService.selectedEvent()?.status === 'FINALIZADO'
            }">
              {{ eventService.selectedEvent()?.status === 'EN_PROGRESO' ? 'En Progreso' : (eventService.selectedEvent()?.status === 'PENDIENTE' ? 'Pendiente' : 'Finalizado') }}
            </span>
          </div>

          <div class="active-event-title-row">
            <strong class="event-active-name" [title]="eventService.selectedEvent()?.name">
              {{ eventService.selectedEvent()?.name }}
            </strong>
          </div>
          <div class="event-host-row">
            <small class="event-host-name">Anfitrión: {{ eventService.selectedEvent()?.hostName }}</small>
            <span class="search-mini-chip">
              <app-icon name="search" [size]="12"></app-icon>
              <span>Buscar</span>
            </span>
          </div>
        </div>

        <!-- Scrollable Navigation Tree -->
        <nav class="sidebar-scrollable-nav">
          
          <!-- Section 1: Eventos Globales (Oculto para Staff) -->
          <ng-container *ngIf="!authService.isStaff()">
            <div class="nav-group-title">CATÁLOGO &amp; EVENTOS</div>

            <a routerLink="/events" routerLinkActive="active" class="nav-item">
              <app-icon name="calendar" [size]="17"></app-icon>
              <span class="nav-label">Mis Eventos</span>
              <span class="counter-pill">{{ eventService.events().length }}</span>
            </a>

            <a *ngIf="authService.isAdmin()" routerLink="/history" routerLinkActive="active" class="nav-item">
              <app-icon name="history" [size]="17"></app-icon>
              <span class="nav-label">Historial de Eventos</span>
            </a>
          </ng-container>

          <!-- Section 2: Gestión Específica del Evento Activo -->
          <div class="nav-group-title active-section-hl">
            <span>{{ authService.isStaff() ? 'OPERACIÓN EN PUERTA' : 'GESTIÓN DEL EVENTO' }}</span>
          </div>

          <a *ngIf="!authService.isStaff()" routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <app-icon name="dashboard" [size]="17"></app-icon>
            <span class="nav-label">Panel del Evento</span>
          </a>

          <a *ngIf="!authService.isStaff()" routerLink="/croquis" routerLinkActive="active" class="nav-item highlight-croquis">
            <app-icon name="croquis" [size]="17"></app-icon>
            <span class="nav-label">Croquis CAD &amp; Mesas</span>
            <span class="badge-mini-auto" *ngIf="eventService.selectedEvent()?.tierPlan === 'PREMIUM'">PLANO PDF</span>
            <span class="badge-mini-restricted" *ngIf="eventService.selectedEvent()?.tierPlan !== 'PREMIUM'">PLAN PREMIUM</span>
          </a>

          <a routerLink="/scanner" routerLinkActive="active" class="nav-item" [class.highlight-croquis]="authService.isStaff()">
            <app-icon name="camera" [size]="17"></app-icon>
            <span class="nav-label">Escáner QR Puerta</span>
            <span class="live-indicator-dot" *ngIf="eventService.selectedEvent()?.tierPlan !== 'BASIC'"></span>
            <span class="badge-mini-restricted" *ngIf="eventService.selectedEvent()?.tierPlan === 'BASIC'">PLAN ESTÁNDAR</span>
          </a>

          <a routerLink="/guests" routerLinkActive="active" class="nav-item">
            <app-icon name="users" [size]="17"></app-icon>
            <span class="nav-label">Invitados &amp; RSVP</span>
            <span class="counter-pill">{{ eventService.eventGuests().length }}</span>
          </a>

          <a routerLink="/itinerary" routerLinkActive="active" class="nav-item">
            <app-icon name="clock" [size]="17"></app-icon>
            <span class="nav-label">Itinerario &amp; Horarios</span>
            <span class="counter-pill">{{ eventService.eventItinerary().length }}</span>
          </a>

          <a *ngIf="!authService.isStaff()" routerLink="/templates" routerLinkActive="active" class="nav-item">
            <app-icon name="template" [size]="17"></app-icon>
            <span class="nav-label">Plantillas de Invitación</span>
          </a>

          <!-- Section 3: Administración & Plataforma -->
          <div class="nav-group-title">SISTEMA &amp; SOPORTE</div>

          <a *ngIf="authService.isAdmin()" routerLink="/users" routerLinkActive="active" class="nav-item">
            <app-icon name="user" [size]="17"></app-icon>
            <span class="nav-label">Usuarios &amp; Permisos</span>
          </a>

          <a *ngIf="authService.isAdmin()" routerLink="/settings" routerLinkActive="active" class="nav-item">
            <app-icon name="settings" [size]="17"></app-icon>
            <span class="nav-label">Configuración del Sistema</span>
          </a>

          <a routerLink="/guia" routerLinkActive="active" class="nav-item">
            <app-icon name="help" [size]="17"></app-icon>
            <span class="nav-label">Guía de Uso &amp; Manual</span>
          </a>

          <a *ngIf="!authService.isStaff()" routerLink="/support" routerLinkActive="active" class="nav-item">
            <app-icon name="support" [size]="17"></app-icon>
            <span class="nav-label">Centro de Soporte</span>
            <span class="counter-pill" *ngIf="eventService.supportTickets().length > 0">{{ eventService.supportTickets().length }}</span>
          </a>
        </nav>

        <!-- Sidebar Sticky Footer -->
        <div class="sidebar-sticky-footer">
          <button class="theme-toggle-row-btn" (click)="themeService.toggleTheme()">
            <app-icon [name]="themeService.isDarkMode() ? 'sun' : 'moon'" [size]="16"></app-icon>
            <span>{{ themeService.isDarkMode() ? 'Modo Claro' : 'Modo Oscuro' }}</span>
          </button>
        </div>
      </aside>

      <!-- Main Shell Content -->
      <div class="main-workspace-shell">
        
        <!-- Clean Minimalist Header with Smart Event Finder -->
        <header class="app-topbar-header">
          <!-- Left: Back Arrow Navigation & Event Context -->
          <div class="topbar-left-meta">
            <button class="btn-back-to-catalog" routerLink="/events" title="Volver al Catálogo de Eventos">
              <app-icon name="arrow-left" [size]="15"></app-icon>
              <span class="back-text">Volver a Eventos</span>
            </button>
            <span class="divider">/</span>
            <div class="active-context-wrapper" [title]="eventService.selectedEvent()?.name">
              <span class="active-context-name">{{ eventService.selectedEvent()?.name }}</span>
            </div>
          </div>

          <!-- Center/Right: Smart Event Palette Trigger + PWA + Profile -->
          <div class="topbar-right-actions">

            <!-- Smart Event Selector Trigger (Scalable for thousands of events) -->
            <button class="smart-event-palette-trigger" (click)="openPalette()" title="Buscar y cambiar de evento">
              <div class="status-indicator-dot" [ngClass]="{
                'dot-active': eventService.selectedEvent()?.status === 'EN_PROGRESO',
                'dot-pending': eventService.selectedEvent()?.status === 'PENDIENTE',
                'dot-finished': eventService.selectedEvent()?.status === 'FINALIZADO'
              }"></div>
              
              <div class="trigger-text-block">
                <span class="trigger-event-name">{{ eventService.selectedEvent()?.name }}</span>
                <span class="trigger-event-sub">{{ eventService.selectedEvent()?.hostName }} · {{ eventService.selectedEvent()?.venueName }}</span>
              </div>

              <div class="search-trigger-pill">
                <app-icon name="search" [size]="13"></app-icon>
              </div>
            </button>

            <!-- PWA Install Button (Desk & Mobile) -->
            <button class="topbar-pwa-btn" (click)="installPwa()" title="Instalar EvenPass en escritorio o pantalla de inicio">
              <app-icon name="download" [size]="14"></app-icon>
              <span>Instalar App</span>
            </button>

            <!-- Notifications Bell with Dropdown Menu -->
            <div class="notifications-bell-wrapper">
              <button class="topbar-icon-btn" (click)="$event.stopPropagation(); toggleNotificationsPanel()" title="Notificaciones del Sistema">
                <app-icon name="bell" [size]="18"></app-icon>
                <span class="badge-dot-notif" *ngIf="notificationService.unreadCount() > 0">
                  {{ notificationService.unreadCount() }}
                </span>
              </button>

              <!-- Dropdown Panel -->
              <div *ngIf="showNotificationsPanel()" class="notifications-dropdown-menu">
                <div class="notif-dropdown-header">
                  <div>
                    <strong>Centro de Notificaciones</strong>
                    <small style="display:block; font-size:0.75rem; color:var(--text-muted);">Actividad reciente y eventos</small>
                  </div>
                  <button type="button" class="btn-mark-read" (click)="notificationService.markAllRead()">
                    Limpiar
                  </button>
                </div>

                <div class="notif-items-scroll">
                  <div *ngIf="notificationService.history().length === 0" class="notif-empty-state">
                    <p>No tienes notificaciones pendientes</p>
                  </div>
                  <div *ngFor="let item of notificationService.history()" class="notif-item-row" [class.unread]="!item.read">
                    <div class="notif-badge-dot" [ngClass]="item.type"></div>
                    <div class="notif-text-col">
                      <div class="notif-title-line">
                        <span class="item-title">{{ item.title }}</span>
                        <span class="item-time">{{ item.timestamp }}</span>
                      </div>
                      <p class="item-msg">{{ item.message }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Support Link -->
            <a *ngIf="!authService.isStaff()" routerLink="/support" class="topbar-icon-btn" title="Soporte Técnico">
              <app-icon name="support" [size]="18"></app-icon>
            </a>

            <!-- User Profile Chip -->
            <div class="user-chip-badge">
              <div class="user-avatar-initial">
                {{ authService.currentUser()?.fullName?.charAt(0) || 'E' }}
              </div>
              <div class="user-text-meta">
                <span class="uname">{{ authService.currentUser()?.fullName || 'ERNESTO' }}</span>
                <span class="urole">{{ authService.isAdmin() ? 'Administrador' : (authService.isOrganizer() ? 'Organizador' : 'Staff Puerta') }}</span>
              </div>
            </div>

            <!-- Logout -->
            <button class="topbar-icon-btn logout-accent" (click)="authService.logout()" title="Cerrar Sesión Segura">
              <app-icon name="log-out" [size]="18"></app-icon>
            </button>
          </div>
        </header>

        <!-- Routed Viewport -->
        <main class="page-content-outlet">
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- ================================================================ -->
      <!-- SMART EVENT COMMAND PALETTE MODAL                                -->
      <!-- ================================================================ -->
      <div *ngIf="showPalette()" class="palette-backdrop" (click)="closePalette()">
        <div class="palette-box" (click)="$event.stopPropagation()">
          
          <!-- Palette Header & Search Bar -->
          <div class="palette-search-bar">
            <app-icon name="search" [size]="20" class="palette-search-icon"></app-icon>
            <input 
              type="text" 
              class="palette-input" 
              [(ngModel)]="searchQuery" 
              placeholder="Buscar evento por nombre, anfitrión, recinto o fecha..." 
              autofocus
            >
            <button type="button" class="palette-close-btn" (click)="closePalette()" title="Cerrar búsqueda">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <!-- Status Filter Tabs -->
          <div class="palette-tabs-row">
            <button 
              class="palette-tab-btn" 
              [class.active]="statusFilter() === 'ALL'"
              (click)="statusFilter.set('ALL')"
            >
              Todos ({{ eventService.events().length }})
            </button>
            <button 
              class="palette-tab-btn" 
              [class.active]="statusFilter() === 'EN_PROGRESO'"
              (click)="statusFilter.set('EN_PROGRESO')"
            >
              En Progreso ({{ countEventsByStatus('EN_PROGRESO') }})
            </button>
            <button 
              class="palette-tab-btn" 
              [class.active]="statusFilter() === 'PENDIENTE'"
              (click)="statusFilter.set('PENDIENTE')"
            >
              Pendientes ({{ countEventsByStatus('PENDIENTE') }})
            </button>
            <button 
              class="palette-tab-btn" 
              [class.active]="statusFilter() === 'FINALIZADO'"
              (click)="statusFilter.set('FINALIZADO')"
            >
              Finalizados ({{ countEventsByStatus('FINALIZADO') }})
            </button>
          </div>

          <!-- Scalable Event Results List -->
          <div class="palette-results-scroll">
            <div *ngIf="filteredEvents().length === 0" class="palette-empty-state">
              <app-icon name="calendar" [size]="32"></app-icon>
              <p>No se encontraron eventos coincidentes con "{{ searchQuery }}"</p>
              <small>Prueba buscando con otro término o crea un nuevo evento.</small>
            </div>

            <div 
              *ngFor="let ev of filteredEvents()" 
              class="palette-event-item"
              [class.current]="ev.id === eventService.activeEventId()"
              (click)="selectEventAndClose(ev.id)"
            >
              <div class="ev-item-main">
                <div class="ev-item-title-row">
                  <strong class="ev-item-name">{{ ev.name }}</strong>
                  <span class="badge" [ngClass]="{
                    'badge-in-progress': ev.status === 'EN_PROGRESO',
                    'badge-pending': ev.status === 'PENDIENTE',
                    'badge-completed': ev.status === 'FINALIZADO'
                  }">
                    {{ ev.status === 'EN_PROGRESO' ? 'En Progreso' : (ev.status === 'PENDIENTE' ? 'Pendiente' : 'Finalizado') }}
                  </span>
                </div>

                <div class="ev-item-meta-row">
                  <span>Anfitrión: <b>{{ ev.hostName }}</b></span>
                  <span class="sep">•</span>
                  <span>{{ ev.venueName }}</span>
                  <span class="sep">•</span>
                  <span>{{ ev.eventDate | date:'mediumDate' }}</span>
                </div>

                <div class="ev-item-progress-bar">
                  <div class="progress-info">
                    <small>Confirmados: {{ ev.confirmedGuests }} / {{ ev.maxCapacity }} aforo</small>
                    <small>{{ ((ev.confirmedGuests / ev.maxCapacity) * 100) | number:'1.0-0' }}%</small>
                  </div>
                  <div class="progress-track-mini">
                    <div class="progress-fill-mini" [style.width]="((ev.confirmedGuests / ev.maxCapacity) * 100) + '%'"></div>
                  </div>
                </div>
              </div>

              <div class="ev-item-action">
                <span *ngIf="ev.id === eventService.activeEventId()" class="current-tag">ACTIVO</span>
                <span *ngIf="ev.id !== eventService.activeEventId()" class="select-hint">Cambiar →</span>
              </div>
            </div>
          </div>

          <!-- Palette Footer -->
          <div class="palette-footer">
            <button class="btn-create-shortcut" (click)="goToCreateEvent()">
              <app-icon name="plus" [size]="14"></app-icon>
              <span>+ Crear Nuevo Evento</span>
            </button>
            <div class="footer-hint">
              <span>Usa las flechas o click para seleccionar</span>
            </div>
          </div>

        </div>
      </div>

      <!-- Floating Toast Notifications -->
      <div class="toasts-container">
        <div *ngFor="let toast of notificationService.toasts()" class="toast-item {{ toast.type }}">
          <div class="toast-icon-wrap">
            <app-icon [name]="toast.type === 'success' ? 'check' : (toast.type === 'error' ? 'x' : (toast.type === 'warning' ? 'alert-triangle' : 'sparkles'))" [size]="16"></app-icon>
          </div>
          <div class="toast-content">
            <div class="toast-title">{{ toast.title }}</div>
            <div class="toast-msg">{{ toast.message }}</div>
          </div>
          <button type="button" class="toast-dismiss-btn" (click)="notificationService.remove(toast.id)" title="Cerrar">
            <app-icon name="x" [size]="12"></app-icon>
          </button>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .app-layout-wrapper {
      display: flex;
      min-height: 100vh;
      background-color: var(--bg-app);
    }

    /* Scrollable Sidebar */
    .sidebar-container {
      width: 260px;
      flex-shrink: 0;
      background-color: var(--bg-sidebar);
      border-right: 1px solid var(--border-ui);
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 0;
      height: 100vh;
      z-index: 50;
      transition: background-color 0.25s;
    }

    .sidebar-brand-box {
      padding: 18px 20px 14px;
      border-bottom: 1px solid var(--border-ui);
    }

    .brand-logo-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-monogram {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      display: grid;
      place-items: center;
      font-weight: 900;
      font-size: 0.95rem;
      letter-spacing: -0.5px;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.35);
    }

    .brand-text-block {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }

    .brand-name {
      font-weight: 800;
      font-size: 1.05rem;
      color: var(--text-main);
      letter-spacing: -0.3px;
    }

    .brand-accent {
      color: var(--brand-blue);
    }

    .brand-sub {
      font-size: 0.62rem;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 1px;
    }

    /* Active Event Selector Card in Sidebar */
    .active-event-selector-card {
      margin: 12px 14px 6px;
      padding: 12px 14px;
      background-color: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .active-event-selector-card:hover {
      border-color: var(--brand-blue);
      transform: translateY(-1px);
    }

    .selector-meta-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .selector-label {
      font-size: 0.64rem;
      font-weight: 800;
      letter-spacing: 0.8px;
      color: var(--text-muted);
    }

    .event-active-name {
      font-size: 0.86rem;
      font-weight: 700;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
    }

    .event-host-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .event-host-name {
      font-size: 0.74rem;
      color: var(--text-muted);
    }

    .ctrl-k-badge {
      font-size: 0.65rem;
      font-weight: 700;
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      padding: 1px 5px;
      border-radius: 4px;
      color: var(--brand-blue);
    }

    .badge-in-progress { background: #ecfdf5; color: #047857; }
    .badge-pending { background: #fef3c7; color: #b45309; }
    .badge-completed { background: #f1f5f9; color: #475569; }

    /* Scrollable Nav */
    .sidebar-scrollable-nav {
      flex: 1;
      overflow-y: auto;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .nav-group-title {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 1px;
      color: var(--text-muted);
      padding: 14px 10px 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9px 12px;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 0.86rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s ease;
      position: relative;
    }

    .nav-item:hover {
      background-color: var(--bg-input);
      color: var(--text-main);
    }

    .nav-item.active {
      background-color: var(--brand-blue-light);
      color: var(--brand-blue);
      font-weight: 700;
    }

    .nav-label {
      flex: 1;
    }

    .counter-pill {
      font-size: 0.7rem;
      font-weight: 700;
      background-color: var(--bg-card);
      border: 1px solid var(--border-ui);
      padding: 1px 7px;
      border-radius: var(--radius-full);
      color: var(--text-muted);
    }

    .badge-mini-auto {
      font-size: 0.62rem;
      font-weight: 800;
      background: #0284c7;
      color: #ffffff;
      padding: 1px 6px;
      border-radius: 4px;
      letter-spacing: 0.4px;
    }

    .badge-mini-restricted {
      font-size: 0.58rem;
      font-weight: 800;
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      color: var(--text-muted);
      padding: 1px 5px;
      border-radius: 4px;
      letter-spacing: 0.3px;
    }

    .live-indicator-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
    }

    /* Sidebar Footer */
    .sidebar-sticky-footer {
      padding: 14px;
      border-top: 1px solid var(--border-ui);
    }

    .theme-toggle-row-btn {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      background-color: var(--bg-input);
      border: 1px solid var(--border-ui);
      color: var(--text-secondary);
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .theme-toggle-row-btn:hover {
      border-color: var(--brand-blue);
      color: var(--brand-blue);
    }

    /* Main Workspace Shell */
    .main-workspace-shell {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .app-topbar-header {
      height: 64px;
      background-color: var(--bg-sidebar);
      border-bottom: 1px solid var(--border-ui);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      position: sticky;
      top: 0;
      z-index: 40;
    }

    .topbar-left-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.88rem;
      min-width: 0;
      flex-shrink: 1;
    }

    .btn-back-to-catalog {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: var(--radius-full);
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      color: var(--text-main);
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .btn-back-to-catalog:hover {
      background: var(--brand-blue-light);
      border-color: var(--brand-blue);
      color: var(--brand-blue);
    }

    .active-context-wrapper {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .active-context-name {
      font-weight: 800;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
      max-width: 260px;
    }

    .search-mini-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.68rem;
      font-weight: 700;
      color: var(--brand-blue);
      background: var(--brand-blue-light);
      padding: 2px 7px;
      border-radius: 4px;
    }

    .topbar-right-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    /* Smart Event Palette Trigger Button */
    .smart-event-palette-trigger {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-full);
      padding: 6px 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      max-width: 320px;
      text-align: left;
    }

    .smart-event-palette-trigger:hover {
      border-color: var(--brand-blue);
      box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
    }

    .status-indicator-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .dot-active { background: #10b981; box-shadow: 0 0 6px #10b981; }
    .dot-pending { background: #f59e0b; }
    .dot-finished { background: #64748b; }

    .trigger-text-block {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      line-height: 1.15;
    }

    .trigger-event-name {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .trigger-event-sub {
      font-size: 0.68rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .search-trigger-pill {
      display: grid;
      place-items: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      color: var(--brand-blue);
      flex-shrink: 0;
    }

    .palette-close-btn {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: 6px;
      width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s;
    }

    .palette-close-btn:hover {
      color: #ef4444;
      background: #fee2e2;
      border-color: #ef4444;
    }

    /* PWA Install Button */
    .topbar-pwa-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--brand-blue-light);
      border: 1px solid rgba(2, 132, 199, 0.3);
      color: var(--brand-blue);
      font-size: 0.8rem;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: var(--radius-full);
      cursor: pointer;
      transition: all 0.2s;
    }

    .topbar-pwa-btn:hover {
      background: var(--brand-blue);
      color: #ffffff;
    }

    .topbar-icon-btn {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: var(--text-secondary);
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      position: relative;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .topbar-icon-btn:hover {
      background: var(--bg-card);
      color: var(--text-main);
      border-color: var(--brand-blue);
    }

    .logout-accent:hover {
      color: #ef4444;
      background: #fee2e2;
    }

    .badge-dot-notif {
      position: absolute;
      top: -3px;
      right: -3px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      background: #ef4444;
      color: #ffffff;
      font-size: 0.65rem;
      font-weight: 800;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--bg-card);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
      line-height: 1;
    }

    .user-chip-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px 4px 4px;
      border-radius: var(--radius-full);
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
    }

    .user-avatar-initial {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #0284c7;
      color: #ffffff;
      display: grid;
      place-items: center;
      font-size: 0.78rem;
      font-weight: 800;
    }

    .user-text-meta {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }

    .uname {
      font-size: 0.78rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .urole {
      font-size: 0.65rem;
      color: var(--text-muted);
    }

    .page-content-outlet {
      padding: 24px;
      flex-grow: 1;
    }

    /* ================================================================
       COMMAND PALETTE MODAL (Ctrl + K)
       ================================================================ */
    .palette-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(6px);
      z-index: 2000;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding-top: 100px;
    }

    .palette-box {
      width: 100%;
      max-width: 680px;
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: palettePop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes palettePop {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .palette-search-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-ui);
      background: var(--bg-card);
    }

    .palette-search-icon {
      color: var(--brand-blue);
      flex-shrink: 0;
    }

    .palette-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--text-main);
      padding: 0;
      box-shadow: none !important;
    }


    .palette-tabs-row {
      display: flex;
      gap: 8px;
      padding: 10px 20px;
      background: var(--bg-input);
      border-bottom: 1px solid var(--border-ui);
      overflow-x: auto;
    }

    .palette-tab-btn {
      padding: 5px 12px;
      border-radius: var(--radius-full);
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-secondary);
      background: transparent;
      border: 1px solid transparent;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }

    .palette-tab-btn:hover {
      color: var(--text-main);
      background: var(--border-light);
    }

    .palette-tab-btn.active {
      background: var(--brand-blue);
      color: #ffffff;
      font-weight: 700;
    }

    .palette-results-scroll {
      max-height: 380px;
      overflow-y: auto;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .palette-empty-state {
      padding: 40px 20px;
      text-align: center;
      color: var(--text-muted);
    }

    .palette-empty-state p {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 10px 0 4px;
    }

    .palette-event-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 16px;
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .palette-event-item:hover {
      background: var(--bg-input);
      border-color: var(--brand-blue);
      transform: translateX(3px);
    }

    .palette-event-item.current {
      border-color: var(--brand-blue);
      background: var(--brand-blue-light);
    }

    .ev-item-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .ev-item-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .ev-item-name {
      font-size: 0.94rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .ev-item-meta-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .sep {
      color: var(--border-ui);
    }

    .ev-item-progress-bar {
      margin-top: 4px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      max-width: 280px;
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .progress-track-mini {
      height: 4px;
      background: var(--border-ui);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-fill-mini {
      height: 100%;
      background: var(--brand-blue);
      border-radius: var(--radius-full);
    }

    .ev-item-action {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .current-tag {
      font-size: 0.7rem;
      font-weight: 800;
      color: var(--brand-blue);
      background: var(--bg-card);
      border: 1px solid var(--brand-blue);
      padding: 3px 8px;
      border-radius: var(--radius-full);
    }

    .select-hint {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .palette-event-item:hover .select-hint {
      color: var(--brand-blue);
    }

    .palette-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      border-top: 1px solid var(--border-ui);
      background: var(--bg-input);
    }

    .btn-create-shortcut {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--brand-blue);
      font-size: 0.82rem;
      font-weight: 700;
      background: none;
      border: none;
      cursor: pointer;
    }

    .btn-create-shortcut:hover {
      text-decoration: underline;
    }

    .footer-hint {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    /* Floating Toasts Notification System */
    .toasts-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 380px;
      width: calc(100% - 48px);
      pointer-events: none;
    }

    .toast-item {
      pointer-events: auto;
      padding: 14px 16px;
      border-radius: var(--radius-md);
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: flex-start;
      gap: 12px;
      animation: toastSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      border-left: 4px solid var(--brand-blue);
    }

    .toast-item.success { border-left-color: #10b981; }
    .toast-item.error { border-left-color: #ef4444; }
    .toast-item.warning { border-left-color: #f59e0b; }
    .toast-item.info { border-left-color: #0284c7; }

    @keyframes toastSlideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .toast-icon-wrap {
      flex-shrink: 0;
      margin-top: 2px;
      color: var(--brand-blue);
    }
    .toast-item.success .toast-icon-wrap { color: #10b981; }
    .toast-item.error .toast-icon-wrap { color: #ef4444; }
    .toast-item.warning .toast-icon-wrap { color: #f59e0b; }

    .toast-content {
      flex: 1;
      min-width: 0;
    }

    .toast-title {
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 2px;
    }

    .toast-msg {
      font-size: 0.8rem;
      color: var(--text-secondary);
      line-height: 1.35;
      word-break: break-word;
    }

    .toast-dismiss-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 2px;
      display: grid;
      place-items: center;
      border-radius: 4px;
    }
    .toast-dismiss-btn:hover {
      color: var(--text-main);
      background: var(--bg-input);
    }

    /* Topbar Notifications Dropdown */
    .notifications-bell-wrapper {
      position: relative;
    }

    .notifications-dropdown-menu {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 340px;
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      box-shadow: 0 14px 40px rgba(0, 0, 0, 0.22);
      z-index: 1000;
      overflow: hidden;
      animation: notifDrop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes notifDrop {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .notif-dropdown-header {
      padding: 14px 18px;
      border-bottom: 1px solid var(--border-ui);
      background: var(--bg-input);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .notif-dropdown-header strong {
      font-size: 0.9rem;
      color: var(--text-main);
    }

    .btn-mark-read {
      background: none;
      border: none;
      font-size: 0.74rem;
      font-weight: 700;
      color: var(--brand-blue);
      cursor: pointer;
    }
    .btn-mark-read:hover {
      text-decoration: underline;
    }

    .notif-items-scroll {
      max-height: 320px;
      overflow-y: auto;
    }

    .notif-empty-state {
      padding: 30px 20px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .notif-item-row {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-light);
      display: flex;
      gap: 12px;
      align-items: flex-start;
      transition: background 0.15s;
    }
    .notif-item-row:hover {
      background: var(--bg-input);
    }
    .notif-item-row.unread {
      background: rgba(2, 132, 199, 0.05);
    }

    .notif-badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-top: 5px;
      flex-shrink: 0;
      background: var(--brand-blue);
    }
    .notif-badge-dot.success { background: #10b981; }
    .notif-badge-dot.warning { background: #f59e0b; }
    .notif-badge-dot.error { background: #ef4444; }

    .notif-text-col {
      flex: 1;
      min-width: 0;
    }

    .notif-title-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .item-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .item-time {
      font-size: 0.7rem;
      color: var(--text-muted);
    }
    .item-msg {
      font-size: 0.78rem;
      color: var(--text-secondary);
      margin-top: 3px;
      line-height: 1.3;
    }

    @media (max-width: 900px) {
      .sidebar-container { display: none; }
      .page-content-outlet { padding: 16px; }
      .smart-event-palette-trigger { max-width: 200px; }
      .trigger-event-sub { display: none; }
    }
  `]
})
export class LayoutComponent {
  showPalette = signal(false);
  showNotificationsPanel = signal(false);
  searchQuery: string = '';
  statusFilter = signal<string>('ALL');

  deferredPrompt: any = null;
  showInstallPrompt = signal(false);

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    public eventService: EventService,
    public notificationService: NotificationService,
    private router: Router
  ) {}

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.openPalette();
    } else if (event.key === 'Escape' && this.showPalette()) {
      this.closePalette();
    }
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(e: any): void {
    e.preventDefault();
    this.deferredPrompt = e;
    this.showInstallPrompt.set(true);
  }

  installPwa(): void {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          this.notificationService.show('success', 'EvenPass Instalado', 'Acceso directo añadido exitosamente.');
        }
        this.deferredPrompt = null;
        this.showInstallPrompt.set(false);
      });
    } else {
      this.notificationService.show('info', 'Acceso Directo PWA', 'Para instalar en tu dispositivo, abre el menú del navegador y selecciona "Instalar aplicación" o "Agregar a pantalla de inicio".');
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showNotificationsPanel()) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.notifications-bell-wrapper')) {
      this.showNotificationsPanel.set(false);
    }
  }

  toggleNotificationsPanel(): void {
    this.showNotificationsPanel.update(v => !v);
  }

  openPalette(): void {
    this.searchQuery = '';
    this.statusFilter.set('ALL');
    this.showPalette.set(true);
  }

  closePalette(): void {
    this.showPalette.set(false);
  }

  countEventsByStatus(status: EventStatus): number {
    return this.eventService.events().filter(e => e.status === status).length;
  }

  filteredEvents(): EventItem[] {
    const query = this.searchQuery.toLowerCase().trim();
    const filter = this.statusFilter();

    return this.eventService.events().filter(ev => {
      const matchesStatus = filter === 'ALL' || ev.status === filter;
      const matchesQuery = !query || 
        ev.name.toLowerCase().includes(query) ||
        ev.hostName.toLowerCase().includes(query) ||
        ev.venueName.toLowerCase().includes(query) ||
        ev.eventType.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }

  selectEventAndClose(eventId: number): void {
    this.eventService.selectEvent(eventId);
    this.closePalette();
  }

  goToCreateEvent(): void {
    this.closePalette();
    this.router.navigate(['/events']);
  }
}
