import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EventService } from '../../services/event.service';
import { IconComponent } from '../icon.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  template: `
    <div class="event-dashboard-container">

      <!-- Event Header Banner -->
      <div class="event-summary-banner-card">
        <div class="banner-left-info">
          <div class="banner-tags">
            <span class="badge-type">{{ eventService.selectedEvent()?.eventType }}</span>
            <span class="badge" [ngClass]="{
              'badge-in-progress': eventService.selectedEvent()?.status === 'EN_PROGRESO',
              'badge-pending': eventService.selectedEvent()?.status === 'PENDIENTE',
              'badge-completed': eventService.selectedEvent()?.status === 'FINALIZADO'
            }">
              {{ eventService.selectedEvent()?.status === 'EN_PROGRESO' ? 'En Progreso' : (eventService.selectedEvent()?.status === 'PENDIENTE' ? 'Pendiente' : 'Finalizado') }}
            </span>
          </div>

          <h2 class="banner-title">{{ eventService.selectedEvent()?.name }}</h2>
          
          <div class="banner-meta-row">
            <span class="meta-item">
              <app-icon name="user" [size]="14"></app-icon>
              <span>Anfitrión: <b>{{ eventService.selectedEvent()?.hostName }}</b></span>
            </span>
            <span class="meta-item">
              <app-icon name="calendar" [size]="14"></app-icon>
              <span>{{ eventService.selectedEvent()?.eventDate | date:'mediumDate' }}</span>
            </span>
            <span class="meta-item">
              <app-icon name="map-pin" [size]="14"></app-icon>
              <span>{{ eventService.selectedEvent()?.venueName }}</span>
            </span>
          </div>
        </div>

        <div class="banner-right-actions">
          <a routerLink="/croquis" class="btn-action btn-sm">
            <app-icon name="croquis" [size]="15"></app-icon>
            <span>Ver Croquis CAD</span>
          </a>
          <a routerLink="/scanner" class="btn-outline btn-sm">
            <app-icon name="camera" [size]="15"></app-icon>
            <span>Abrir Escáner</span>
          </a>
        </div>
      </div>

      <!-- Interactive Event Lifecycle Stepper -->
      <div class="lifecycle-stepper-card">
        <div class="stepper-header-row">
          <div class="stepper-title-block">
            <app-icon name="sparkles" [size]="16"></app-icon>
            <span class="stepper-title">Fases del Evento &amp; Control de Estado</span>
          </div>
          <span class="stepper-subtitle">Controla el ciclo de vida del evento activo en 1 clic</span>
        </div>

        <div class="stepper-stages-grid">
          <!-- Step 1: Planeación & Invitaciones -->
          <div class="stage-step-box" [class.is-active]="eventService.selectedEvent()?.status === 'PENDIENTE'">
            <div class="stage-step-top">
              <span class="stage-number-pill">1</span>
              <span class="stage-tag" *ngIf="eventService.selectedEvent()?.status === 'PENDIENTE'">Fase Activa</span>
            </div>
            <strong class="stage-name">Invitaciones &amp; RSVP</strong>
            <p class="stage-desc">Despacho de enlaces de WhatsApp, confirmaciones de invitados y asignación de mesas.</p>
            <button 
              *ngIf="eventService.selectedEvent()?.status !== 'PENDIENTE'" 
              class="btn-stage-switch" 
              (click)="eventService.setEventStatus(eventService.selectedEvent()!.id, 'PENDIENTE')"
            >
              <app-icon name="refresh" [size]="12"></app-icon>
              <span>Activar Modo Invitaciones</span>
            </button>
            <div *ngIf="eventService.selectedEvent()?.status === 'PENDIENTE'" class="stage-status-current">
              <span class="pulse-dot"></span>
              <span>Recepción de confirmaciones abierta</span>
            </div>
          </div>

          <!-- Step 2: Día del Evento (En Puerta) -->
          <div class="stage-step-box" [class.is-active]="eventService.selectedEvent()?.status === 'EN_PROGRESO'">
            <div class="stage-step-top">
              <span class="stage-number-pill">2</span>
              <span class="stage-tag tag-live" *ngIf="eventService.selectedEvent()?.status === 'EN_PROGRESO'">En Puerta</span>
            </div>
            <strong class="stage-name">Día del Evento · En Puerta</strong>
            <p class="stage-desc">Escaneo de pases QR por hostess, validación anti-duplicados y agenda en tiempo real.</p>
            <button 
              *ngIf="eventService.selectedEvent()?.status !== 'EN_PROGRESO'" 
              class="btn-stage-switch btn-stage-live" 
              (click)="eventService.setEventStatus(eventService.selectedEvent()!.id, 'EN_PROGRESO')"
            >
              <app-icon name="camera" [size]="12"></app-icon>
              <span>Iniciar Día del Evento</span>
            </button>
            <div *ngIf="eventService.selectedEvent()?.status === 'EN_PROGRESO'" class="stage-status-current text-live">
              <span class="pulse-dot-green"></span>
              <span>Recepción y escáner activos</span>
            </div>
          </div>

          <!-- Step 3: Concluido -->
          <div class="stage-step-box" [class.is-active]="eventService.selectedEvent()?.status === 'FINALIZADO'">
            <div class="stage-step-top">
              <span class="stage-number-pill">3</span>
              <span class="stage-tag tag-done" *ngIf="eventService.selectedEvent()?.status === 'FINALIZADO'">Concluido</span>
            </div>
            <strong class="stage-name">Evento Concluido</strong>
            <p class="stage-desc">Modo histórico de solo lectura, reporte final de asistencia y auditoría de pases.</p>
            <button 
              *ngIf="eventService.selectedEvent()?.status !== 'FINALIZADO'" 
              class="btn-stage-switch" 
              (click)="eventService.setEventStatus(eventService.selectedEvent()!.id, 'FINALIZADO')"
            >
              <app-icon name="lock" [size]="12"></app-icon>
              <span>Concluir Evento</span>
            </button>
            <div *ngIf="eventService.selectedEvent()?.status === 'FINALIZADO'" class="stage-status-current text-muted">
              <app-icon name="lock" [size]="12"></app-icon>
              <span>Evento archivado (Solo lectura)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- KPI METRIC CARDS OF THIS EVENT -->
      <div class="kpi-cards-grid">
        
        <!-- Total Guests -->
        <div class="kpi-card-minimal accent-blue">
          <div class="kpi-head">
            <span class="kpi-title">Invitados Totales</span>
            <app-icon name="users" [size]="18"></app-icon>
          </div>
          <div class="kpi-number">{{ eventService.eventGuests().length }}</div>
          <small class="kpi-sub">Registrados en la lista</small>
        </div>

        <!-- Confirmed RSVP -->
        <div class="kpi-card-minimal accent-green">
          <div class="kpi-head">
            <span class="kpi-title">Confirmados (RSVP)</span>
            <app-icon name="check-circle" [size]="18"></app-icon>
          </div>
          <div class="kpi-number text-green">{{ confirmedCount() }}</div>
          <small class="kpi-sub">{{ confirmedPassesCount() }} pases con asiento</small>
        </div>

        <!-- Attended in Gate -->
        <div class="kpi-card-minimal accent-teal">
          <div class="kpi-head">
            <span class="kpi-title">Ingresados al Salón</span>
            <app-icon name="camera" [size]="18"></app-icon>
          </div>
          <div class="kpi-number text-blue">{{ eventService.eventLogs().length }}</div>
          <small class="kpi-sub">Validados por escáner</small>
        </div>

        <!-- Tables Occupancy -->
        <div class="kpi-card-minimal accent-amber">
          <div class="kpi-head">
            <span class="kpi-title">Mesas en Salón</span>
            <app-icon name="croquis" [size]="18"></app-icon>
          </div>
          <div class="kpi-number">{{ eventService.currentSalon()?.tables?.length || 16 }}</div>
          <small class="kpi-sub">Capacidad: {{ eventService.currentSalon()?.totalCapacity }} p</small>
        </div>

      </div>

      <!-- MIDDLE ROW: ESCANER EN VIVO Y GRAFICO DE ASISTENCIA -->
      <div class="middle-split-row">
        
        <!-- Left: Escáner QR de este evento -->
        <div class="widget-card scanner-widget-box">
          <div class="widget-icon-pill">
            <app-icon name="qr-code" [size]="28"></app-icon>
          </div>
          <h3 class="widget-title">Control de Acceso en Puerta</h3>
          <p class="widget-desc">
            Escanea los pases de <b>{{ eventService.selectedEvent()?.name }}</b>. Validación instantánea y prevención de re-ingresos duplicados.
          </p>
          <a routerLink="/scanner" class="btn-action">
            <app-icon name="camera" [size]="16"></app-icon>
            <span>Iniciar Escáner en Puerta</span>
          </a>
        </div>

        <!-- Right: Asistencia & Ocupación Donut -->
        <div class="widget-card attendance-donut-box">
          <div class="widget-header-row">
            <h3 class="widget-title">Estado de Asistencia del Evento</h3>
            <span class="badge badge-info">Tiempo Real</span>
          </div>

          <div class="donut-display-area">
            <div class="cad-radial-gauge">
              <span class="gauge-value">{{ attendancePercent() }}%</span>
              <small class="gauge-label">ASISTENCIA</small>
            </div>
            
            <div class="donut-breakdown-list">
              <div class="breakdown-row">
                <span class="status-marker bg-emerald"></span>
                <span>Ingresados en Salón</span>
                <b>{{ eventService.eventLogs().length }} pases</b>
              </div>
              <div class="breakdown-row">
                <span class="status-marker bg-sky"></span>
                <span>Confirmados por Llegar</span>
                <b>{{ confirmedCount() - eventService.eventLogs().length }} pases</b>
              </div>
              <div class="breakdown-row">
                <span class="status-marker bg-amber"></span>
                <span>Pendientes RSVP</span>
                <b>{{ pendingCount() }} pases</b>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- BOTTOM ROW: 3 COLUMNS DE ESTE EVENTO -->
      <div class="bottom-three-cards-grid">

        <!-- Column 1: Últimos Pases Validados en ESTE Evento -->
        <div class="column-panel-card">
          <div class="panel-head">
            <div class="panel-title-wrap">
              <app-icon name="check-circle" [size]="16"></app-icon>
              <h4>Pases Validados en Puerta</h4>
            </div>
            <a routerLink="/scanner" class="panel-action-link">Ver Escáner</a>
          </div>

          <div class="panel-items-feed">
            <div *ngFor="let log of eventService.eventLogs()" class="feed-item">
              <div class="feed-main-content">
                <strong>{{ log.guestName }}</strong>
                <small>{{ log.assignedTableName || 'Mesa asignada' }} · {{ log.scanTimestamp }}</small>
              </div>
              <span class="badge badge-completed">
                {{ log.status === 'AUTHORIZED' ? 'Ingresado' : 'Rechazado' }}
              </span>
            </div>

            <div *ngIf="eventService.eventLogs().length === 0" class="empty-feed-placeholder">
              <p>No se han validado pases aún para este evento.</p>
              <small>Abre el escáner QR en puerta para registrar accesos.</small>
            </div>
          </div>
        </div>

        <!-- Column 2: Próximos Hitos del Itinerario -->
        <div class="column-panel-card">
          <div class="panel-head">
            <div class="panel-title-wrap">
              <app-icon name="clock" [size]="16"></app-icon>
              <h4>Itinerario del Evento</h4>
            </div>
            <a routerLink="/itinerary" class="panel-action-link">Ver Cronograma</a>
          </div>

          <div class="panel-items-feed">
            <div *ngFor="let item of eventService.eventItinerary() | slice:0:3" class="feed-item">
              <div class="itinerary-time-block">
                {{ item.time }}
              </div>
              <div class="feed-main-content">
                <strong>{{ item.title }}</strong>
                <small>{{ item.description }}</small>
              </div>
              <span class="badge" [ngClass]="{
                'badge-completed': item.status === 'COMPLETED',
                'badge-info': item.status === 'IN_PROGRESS',
                'badge-pending': item.status === 'UPCOMING'
              }">
                {{ item.status === 'COMPLETED' ? 'Hecho' : (item.status === 'IN_PROGRESS' ? 'En Curso' : 'Próximo') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Column 3: Distribución del Salón & Mesas -->
        <div class="column-panel-card">
          <div class="panel-head">
            <div class="panel-title-wrap">
              <app-icon name="croquis" [size]="16"></app-icon>
              <h4>Croquis &amp; Mesas</h4>
            </div>
            <a routerLink="/croquis" class="panel-action-link">Abrir Plano CAD</a>
          </div>

          <div class="panel-items-feed">
            <div class="feed-item">
              <div class="feed-main-content">
                <strong>Distribución Arquitectónica</strong>
                <small>16 mesas · Pasillo central y escenario DJ</small>
              </div>
              <span class="badge badge-completed">LISTO</span>
            </div>

            <div class="feed-item">
              <div class="feed-main-content">
                <strong>Asignación Automática</strong>
                <small>Agrupación familiar sin separar acompañantes</small>
              </div>
              <span class="badge badge-info">ACTIVA</span>
            </div>

            <div class="feed-item">
              <div class="feed-main-content">
                <strong>Exportación PDF</strong>
                <small>Plano oficial imprimible para montaje</small>
              </div>
              <span class="badge badge-completed">DISPONIBLE</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .event-dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Event Summary Banner */
    .event-summary-banner-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 24px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      box-shadow: var(--shadow-sm);
    }

    .banner-tags {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .badge-type {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .badge-in-progress { background: #e0f2fe; color: #0284c7; }
    .badge-pending { background: #fef3c7; color: #b45309; }
    .badge-completed { background: #ecfdf5; color: #059669; }

    .banner-title {
      font-size: 1.45rem;
      font-weight: 800;
      color: var(--text-main);
      margin-bottom: 8px;
    }

    .banner-meta-row {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      font-size: 0.82rem;
      color: var(--text-muted);
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .banner-right-actions {
      display: flex;
      gap: 10px;
    }

    /* Lifecycle Stepper Card */
    .lifecycle-stepper-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 20px 24px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .stepper-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .stepper-title-block {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #1d4ed8;
      font-weight: 700;
      font-size: 0.95rem;
    }

    .stepper-subtitle {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .stepper-stages-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    @media (max-width: 900px) {
      .stepper-stages-grid {
        grid-template-columns: 1fr;
      }
    }

    .stage-step-box {
      background: var(--bg-app);
      border: 1.5px solid var(--border-ui);
      border-radius: var(--radius-md);
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      position: relative;
      transition: all 0.2s ease;
    }

    .stage-step-box.is-active {
      border-color: #1d4ed8;
      background: rgba(29, 78, 216, 0.04);
      box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.12);
    }

    .stage-step-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .stage-number-pill {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--border-ui);
      color: var(--text-secondary);
      font-weight: 800;
      font-size: 0.8rem;
      display: grid;
      place-items: center;
    }

    .stage-step-box.is-active .stage-number-pill {
      background: #1d4ed8;
      color: #ffffff;
    }

    .stage-tag {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 12px;
      background: #dbeafe;
      color: #1e40af;
    }

    .stage-tag.tag-live {
      background: #dcfce7;
      color: #15803d;
    }

    .stage-tag.tag-done {
      background: #f1f5f9;
      color: #475569;
    }

    .stage-name {
      font-size: 0.95rem;
      color: var(--text-main);
      font-weight: 700;
    }

    .stage-desc {
      font-size: 0.8rem;
      color: var(--text-secondary);
      line-height: 1.4;
      margin: 0;
      flex-grow: 1;
    }

    .btn-stage-switch {
      margin-top: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 12px;
      background: #ffffff;
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-main);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-stage-switch:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }

    .btn-stage-live {
      color: #15803d;
      border-color: #86efac;
    }
    .btn-stage-live:hover {
      background: #f0fdf4;
    }

    .stage-status-current {
      margin-top: 8px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.78rem;
      font-weight: 600;
      color: #1d4ed8;
    }

    .stage-status-current.text-live {
      color: #15803d;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #1d4ed8;
      box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.25);
    }

    .pulse-dot-green {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #15803d;
      box-shadow: 0 0 0 3px rgba(21, 128, 61, 0.25);
    }

    /* KPI Cards Grid */
    .kpi-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 16px;
    }

    .kpi-card-minimal {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      position: relative;
      box-shadow: var(--shadow-sm);
    }

    .kpi-card-minimal::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
    }

    .accent-blue::before { background: #0284c7; }
    .accent-green::before { background: #10b981; }
    .accent-teal::before { background: #06b6d4; }
    .accent-amber::before { background: #f59e0b; }

    .kpi-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--text-muted);
    }

    .kpi-title {
      font-size: 0.78rem;
      font-weight: 700;
    }

    .kpi-number {
      font-size: 2rem;
      font-weight: 900;
      color: var(--text-main);
      line-height: 1.1;
      margin: 8px 0 2px;
    }

    .text-green { color: #10b981; }
    .text-blue { color: #0284c7; }

    .kpi-sub {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    /* Middle Row */
    .middle-split-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .widget-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 24px;
      box-shadow: var(--shadow-sm);
    }

    .scanner-widget-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      justify-content: center;
    }

    .widget-icon-pill {
      width: 60px;
      height: 60px;
      border-radius: 16px;
      background: var(--brand-blue-light);
      color: var(--brand-blue);
      display: grid;
      place-items: center;
      margin-bottom: 14px;
    }

    .widget-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text-main);
      margin-bottom: 6px;
    }

    .widget-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
      max-width: 360px;
      margin-bottom: 18px;
    }

    .attendance-donut-box {
      display: flex;
      flex-direction: column;
    }

    .widget-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .donut-display-area {
      display: flex;
      align-items: center;
      gap: 28px;
      flex-grow: 1;
    }

    .cad-radial-gauge {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      border: 6px solid #10b981;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .gauge-value {
      font-size: 1.8rem;
      font-weight: 900;
      color: var(--text-main);
      line-height: 1;
    }

    .gauge-label {
      font-size: 0.62rem;
      font-weight: 800;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .donut-breakdown-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex-grow: 1;
      font-size: 0.82rem;
    }

    .breakdown-row {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-secondary);
    }

    .breakdown-row b {
      margin-left: auto;
      color: var(--text-main);
    }

    .status-marker {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .bg-emerald { background: #10b981; }
    .bg-sky { background: #0284c7; }
    .bg-amber { background: #f59e0b; }

    /* Bottom 3 Columns */
    .bottom-three-cards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .column-panel-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 20px;
      box-shadow: var(--shadow-sm);
    }

    .panel-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-ui);
      padding-bottom: 12px;
      margin-bottom: 14px;
    }

    .panel-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-main);
    }

    .panel-title-wrap h4 {
      font-size: 0.92rem;
      font-weight: 800;
    }

    .panel-action-link {
      font-size: 0.75rem;
      font-weight: 700;
      color: #0284c7;
      text-decoration: none;
    }

    .panel-items-feed {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .feed-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: var(--radius-sm);
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
    }

    .feed-main-content {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      line-height: 1.25;
    }

    .feed-main-content strong {
      font-size: 0.82rem;
      color: var(--text-main);
    }

    .feed-main-content small {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .itinerary-time-block {
      background: var(--brand-blue-light);
      color: var(--brand-blue);
      font-weight: 800;
      font-size: 0.75rem;
      padding: 4px 6px;
      border-radius: 4px;
    }

    .empty-feed-placeholder {
      padding: 20px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.82rem;
    }

    @media (max-width: 992px) {
      .middle-split-row, .bottom-three-cards-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent {
  constructor(public eventService: EventService) {}

  confirmedCount(): number {
    return this.eventService.eventGuests().filter(g => g.status === 'CONFIRMED' || g.status === 'ATTENDED').length;
  }

  confirmedPassesCount(): number {
    return this.eventService.eventGuests()
      .filter(g => g.status === 'CONFIRMED' || g.status === 'ATTENDED')
      .reduce((acc, curr) => acc + curr.totalPasses, 0);
  }

  pendingCount(): number {
    return this.eventService.eventGuests().filter(g => g.status === 'PENDING').length;
  }

  attendancePercent(): number {
    const confirmed = this.confirmedCount();
    if (confirmed === 0) return 0;
    const attended = this.eventService.eventLogs().length;
    return Math.round((attended / confirmed) * 100);
  }
}
