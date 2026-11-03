import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../services/event.service';
import { EventItem, CheckInLog } from '../../models/models';
import { IconComponent } from '../icon.component';
import { NotificationService } from '../../services/notification.service';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="history-page-container">

      <!-- Header Card -->
      <div class="history-header-card">
        <div class="header-left">
          <div class="title-with-icon">
            <div class="icon-wrap-badge">
              <app-icon name="history" [size]="22"></app-icon>
            </div>
            <div>
              <h2>Historial &amp; Archivo de Eventos</h2>
              <p>Auditoría completa de recepciones concluidas, aforos registrados y bitácoras de asistencia.</p>
            </div>
          </div>
        </div>

        <div class="header-right-stats">
          <div class="stat-bubble">
            <span class="stat-number">{{ completedEvents().length }}</span>
            <span class="stat-text">Eventos Concluidos</span>
          </div>
          <div class="stat-bubble highlight">
            <span class="stat-number">{{ totalPastAttendees() }}</span>
            <span class="stat-text">Asistentes Totales</span>
          </div>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="history-toolbar">
        <div class="search-box">
          <app-icon name="search" [size]="16" class="search-ic"></app-icon>
          <input 
            type="text" 
            [ngModel]="searchQuery()" 
            (ngModelChange)="searchQuery.set($event)"
            placeholder="Buscar por anfitrión, nombre del evento o recinto..."
          >
        </div>

        <div class="filter-tabs">
          <button 
            class="tab-btn" 
            [class.active]="filterMode() === 'ALL'" 
            (click)="filterMode.set('ALL')"
          >
            Todos ({{ eventService.events().length }})
          </button>
          <button 
            class="tab-btn" 
            [class.active]="filterMode() === 'FINALIZADO'" 
            (click)="filterMode.set('FINALIZADO')"
          >
            Solo Concluidos ({{ completedEvents().length }})
          </button>
        </div>
      </div>

      <!-- History Events List -->
      <div class="history-list-grid">
        <div 
          *ngFor="let ev of filteredEvents()" 
          class="history-event-card"
          [class.concluded]="ev.status === 'FINALIZADO'"
        >
          <!-- Top Row: Category + Status -->
          <div class="card-top-row">
            <div class="event-meta-type">
              <span class="type-tag">{{ ev.eventType }}</span>
              <span class="event-date-str">
                <app-icon name="clock" [size]="14"></app-icon>
                {{ ev.eventDate | date:'longDate':'':'es-MX' }}
              </span>
            </div>

            <span class="status-pill" [ngClass]="{
              'status-completed': ev.status === 'FINALIZADO',
              'status-in-progress': ev.status === 'EN_PROGRESO',
              'status-pending': ev.status === 'PENDIENTE'
            }">
              <app-icon [name]="ev.status === 'FINALIZADO' ? 'check' : 'clock'" [size]="12"></app-icon>
              {{ ev.status === 'FINALIZADO' ? 'Concluido' : (ev.status === 'EN_PROGRESO' ? 'En Progreso' : 'Pendiente') }}
            </span>
          </div>

          <!-- Main Info -->
          <div class="card-main-content">
            <h3 class="event-title">{{ ev.name }}</h3>
            
            <div class="host-info-line">
              <span class="host-label">Anfitrión:</span>
              <strong class="host-name">{{ ev.hostName }}</strong>
            </div>

            <p class="venue-info">
              <app-icon name="croquis" [size]="14"></app-icon>
              {{ ev.venueName }} · {{ ev.locationAddress }}
            </p>
          </div>

          <!-- Attendance Performance Metric -->
          <div class="attendance-metric-block">
            <div class="attendance-labels">
              <span class="metric-title">Asistencia del Evento</span>
              <span class="metric-pct">
                {{ ev.attendedGuests }} de {{ ev.confirmedGuests }} ({{ calculateAttendanceRate(ev) }}%)
              </span>
            </div>

            <div class="progress-bar-bg">
              <div 
                class="progress-bar-fill" 
                [style.width.%]="calculateAttendanceRate(ev)"
              ></div>
            </div>

            <div class="metric-breakdown">
              <span><b>{{ ev.attendedGuests }}</b> Asistieron</span>
              <span><b>{{ (ev.confirmedGuests - ev.attendedGuests > 0) ? (ev.confirmedGuests - ev.attendedGuests) : 0 }}</b> Faltaron</span>
              <span>Aforo máx: <b>{{ ev.maxCapacity }}</b></span>
            </div>
          </div>

          <!-- Actions Footer -->
          <div class="card-footer-actions">
            <button class="btn-action-sm primary" (click)="openAuditModal(ev)">
              <app-icon name="ticket" [size]="14"></app-icon>
              <span>Ver Bitácora de Puerta</span>
            </button>

            <button class="btn-action-sm secondary" (click)="exportReport(ev)">
              <app-icon name="download" [size]="14"></app-icon>
              <span>Descargar Reporte</span>
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="filteredEvents().length === 0" class="empty-state-box">
          <app-icon name="history" [size]="48" class="text-muted"></app-icon>
          <h3>No se encontraron registros</h3>
          <p>Ajusta el filtro de búsqueda o el estado seleccionado para visualizar los eventos archivados.</p>
        </div>
      </div>

      <!-- Audit Log Modal -->
      <div *ngIf="selectedAuditLogEvent()" class="modal-backdrop">
        <div class="modal-box audit-modal">
          <div class="modal-header">
            <div class="modal-header-meta">
              <span class="modal-tag">AUDITORÍA DE ACCESOS</span>
              <h3>{{ selectedAuditLogEvent()?.name }}</h3>
              <small>Anfitrión: {{ selectedAuditLogEvent()?.hostName }} · {{ selectedAuditLogEvent()?.venueName }}</small>
            </div>
            <button class="close-btn" (click)="selectedAuditLogEvent.set(null)">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <div class="modal-body-scroll">
            <div class="audit-summary-kpis">
              <div class="kpi-cell">
                <span class="kpi-title">TOTAL ESCANEOS</span>
                <span class="kpi-num">{{ auditLogs().length }}</span>
              </div>
              <div class="kpi-cell">
                <span class="kpi-title">AUTORIZADOS</span>
                <span class="kpi-num text-success">{{ getAuthorizedCount() }}</span>
              </div>
              <div class="kpi-cell">
                <span class="kpi-title">DUPLICADOS BLOQUEADOS</span>
                <span class="kpi-num text-warning">{{ getBlockedCount() }}</span>
              </div>
            </div>

            <table class="audit-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Invitado</th>
                  <th>Folio QR</th>
                  <th>Mesa Asignada</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let log of auditLogs()">
                  <td>{{ log.scanTimestamp }}</td>
                  <td><strong>{{ log.guestName }}</strong></td>
                  <td><code>{{ log.qrToken }}</code></td>
                  <td>{{ log.assignedTableName || 'Mesa general' }}</td>
                  <td>
                    <span class="log-status-badge" [ngClass]="{
                      'badge-auth': log.status === 'AUTHORIZED',
                      'badge-blocked': log.status === 'ALREADY_USED',
                      'badge-inv': log.status === 'INVALID'
                    }">
                      {{ log.status === 'AUTHORIZED' ? 'Validado' : (log.status === 'ALREADY_USED' ? 'Duplicado' : 'Inválido') }}
                    </span>
                  </td>
                </tr>
                <tr *ngIf="auditLogs().length === 0">
                  <td colspan="5" class="text-center py-4 text-muted">
                    No se registraron lecturas QR registradas en este evento todavía.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="modal-footer">
            <button class="btn-action-sm secondary" (click)="selectedAuditLogEvent.set(null)">
              Cerrar
            </button>
            <button class="btn-action-sm primary" (click)="exportReport(selectedAuditLogEvent()!)">
              <app-icon name="download" [size]="14"></app-icon>
              <span>Descargar PDF</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .history-page-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .history-header-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 24px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      box-shadow: var(--shadow-sm);
    }

    .title-with-icon {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .icon-wrap-badge {
      width: 46px;
      height: 46px;
      border-radius: var(--radius-md);
      background: rgba(14, 165, 233, 0.12);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .history-header-card h2 {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0;
    }

    .history-header-card p {
      font-size: 0.88rem;
      color: var(--text-muted);
      margin: 4px 0 0;
    }

    .header-right-stats {
      display: flex;
      gap: 12px;
    }

    .stat-bubble {
      background: var(--bg-body);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      padding: 10px 18px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 110px;
    }

    .stat-bubble.highlight {
      border-color: rgba(14, 165, 233, 0.35);
      background: rgba(14, 165, 233, 0.05);
    }

    .stat-number {
      font-size: 1.4rem;
      font-weight: 800;
      color: var(--text-main);
      line-height: 1.1;
    }

    .stat-bubble.highlight .stat-number {
      color: var(--color-primary);
    }

    .stat-text {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-top: 2px;
    }

    /* Toolbar */
    .history-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .search-box {
      position: relative;
      width: min(380px, 100%);
    }

    .search-ic {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
    }

    .search-box input {
      width: 100%;
      padding: 10px 14px 10px 38px;
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      color: var(--text-main);
      font-size: 0.88rem;
      outline: none;
      transition: border-color var(--trans-fast);
    }

    .search-box input:focus {
      border-color: var(--color-primary);
    }

    .filter-tabs {
      display: flex;
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      padding: 3px;
      gap: 4px;
    }

    .tab-btn {
      background: transparent;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      color: var(--text-muted);
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--trans-fast);
    }

    .tab-btn.active {
      background: var(--color-primary);
      color: #fff;
    }

    /* History Grid */
    .history-list-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px;
    }

    .history-event-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: var(--shadow-sm);
      transition: transform var(--trans-fast), box-shadow var(--trans-fast);
    }

    .history-event-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    .card-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .event-meta-type {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .type-tag {
      background: var(--bg-body);
      border: 1px solid var(--border-ui);
      color: var(--text-main);
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .event-date-str {
      font-size: 0.78rem;
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 12px;
    }

    .status-completed {
      background: rgba(34, 197, 94, 0.12);
      color: #16a34a;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .status-in-progress {
      background: rgba(14, 165, 233, 0.12);
      color: var(--color-primary);
      border: 1px solid rgba(14, 165, 233, 0.3);
    }

    .status-pending {
      background: rgba(245, 158, 11, 0.12);
      color: #d97706;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .card-main-content {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .event-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
    }

    .host-info-line {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .host-name {
      color: var(--text-main);
      font-weight: 600;
      margin-left: 4px;
    }

    .venue-info {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin: 4px 0 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Attendance progress */
    .attendance-metric-block {
      background: var(--bg-body);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .attendance-labels {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .metric-title {
      font-size: 0.76rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .metric-pct {
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--color-primary);
    }

    .progress-bar-bg {
      height: 6px;
      background: var(--border-ui);
      border-radius: 99px;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--color-primary), #06b6d4);
      border-radius: 99px;
      transition: width var(--trans-normal);
    }

    .metric-breakdown {
      display: flex;
      justify-content: space-between;
      font-size: 0.76rem;
      color: var(--text-muted);
    }

    .metric-breakdown b {
      color: var(--text-main);
    }

    /* Actions */
    .card-footer-actions {
      display: flex;
      gap: 8px;
      margin-top: auto;
    }

    .btn-action-sm {
      flex: 1;
      padding: 8px 12px;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: var(--radius-md);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 1px solid transparent;
      transition: all var(--trans-fast);
    }

    .btn-action-sm.primary {
      background: var(--color-primary);
      color: #fff;
    }

    .btn-action-sm.primary:hover {
      background: #0284c7;
    }

    .btn-action-sm.secondary {
      background: transparent;
      border-color: var(--border-ui);
      color: var(--text-main);
    }

    .btn-action-sm.secondary:hover {
      background: var(--bg-body);
    }

    .empty-state-box {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 20px;
      background: var(--bg-card);
      border: 1px dashed var(--border-ui);
      border-radius: var(--radius-lg);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-box.audit-modal {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      width: min(720px, 100%);
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-lg);
      overflow: hidden;
    }

    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-ui);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .modal-tag {
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--color-primary);
      letter-spacing: 0.05em;
    }

    .modal-header h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 4px 0 2px;
    }

    .modal-header small {
      color: var(--text-muted);
      font-size: 0.8rem;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
    }

    .modal-body-scroll {
      padding: 20px 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .audit-summary-kpis {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .kpi-cell {
      background: var(--bg-body);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      padding: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .kpi-title {
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.04em;
    }

    .kpi-num {
      font-size: 1.3rem;
      font-weight: 800;
      color: var(--text-main);
      margin-top: 2px;
    }

    .text-success { color: #16a34a !important; }
    .text-warning { color: #d97706 !important; }

    .audit-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.84rem;
    }

    .audit-table th {
      text-align: left;
      padding: 10px 12px;
      background: var(--bg-body);
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.76rem;
      text-transform: uppercase;
      border-bottom: 1px solid var(--border-ui);
    }

    .audit-table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-ui);
      color: var(--text-main);
    }

    .audit-table code {
      background: var(--bg-body);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.8rem;
    }

    .log-status-badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 10px;
    }

    .badge-auth {
      background: rgba(34, 197, 94, 0.12);
      color: #16a34a;
    }

    .badge-blocked {
      background: rgba(239, 68, 68, 0.12);
      color: #ef4444;
    }

    .badge-inv {
      background: rgba(100, 116, 139, 0.12);
      color: #64748b;
    }

    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--border-ui);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
  `]
})
export class HistoryComponent {
  searchQuery = signal('');
  filterMode = signal<'ALL' | 'FINALIZADO'>('ALL');
  selectedAuditLogEvent = signal<EventItem | null>(null);

  completedEvents = computed(() => {
    return this.eventService.events().filter(e => e.status === 'FINALIZADO');
  });

  filteredEvents = computed(() => {
    let list = this.eventService.events();
    if (this.filterMode() === 'FINALIZADO') {
      list = list.filter(e => e.status === 'FINALIZADO');
    }
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.hostName.toLowerCase().includes(q) ||
        e.venueName.toLowerCase().includes(q) ||
        e.eventType.toLowerCase().includes(q)
      );
    }
    return list;
  });

  totalPastAttendees = computed(() => {
    return this.completedEvents().reduce((sum, e) => sum + e.attendedGuests, 0);
  });

  auditLogs = computed(() => {
    const sel = this.selectedAuditLogEvent();
    if (!sel) return [];
    return this.eventService.allLogs().filter(l => l.eventId === sel.id);
  });

  constructor(
    public eventService: EventService,
    private notificationService: NotificationService
  ) {}

  calculateAttendanceRate(ev: EventItem): number {
    if (!ev.confirmedGuests || ev.confirmedGuests === 0) return 0;
    const rate = Math.round((ev.attendedGuests / ev.confirmedGuests) * 100);
    return Math.min(100, Math.max(0, rate));
  }

  openAuditModal(ev: EventItem): void {
    this.selectedAuditLogEvent.set(ev);
  }

  getAuthorizedCount(): number {
    return this.auditLogs().filter(l => l.status === 'AUTHORIZED').length;
  }

  getBlockedCount(): number {
    return this.auditLogs().filter(l => l.status === 'ALREADY_USED').length;
  }

  exportReport(ev: EventItem): void {
    this.downloadDossierPdf(ev);
  }

  downloadDossierPdf(ev: EventItem): void {
    const rate = this.calculateAttendanceRate(ev);
    const logs = this.eventService.allLogs().filter(l => l.eventId === ev.id);
    const dateFormatted = new Date(ev.eventDate).toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 1. Executive Top Header Bar
    doc.setFillColor(2, 132, 199); // #0284c7
    doc.rect(0, 0, 210, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('EVENPASS ENTERPRISE OS', 14, 11);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('DOSSIER EJECUTIVO DE EVENTO & BITÁCORA DE CONTROL EN PUERTA', 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`EMISIÓN: ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX')}`, 196, 15, { align: 'right' });

    // 2. Event Title & Primary Details Box
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text(ev.name, 14, 35);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('Anfitrión: ', 14, 42);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(ev.hostName, 32, 42);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Tipo: ', 105, 42);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(ev.eventType, 115, 42);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Fecha: ', 14, 48);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(dateFormatted, 27, 48);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Recinto: ', 14, 54);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${ev.venueName} · ${ev.locationAddress}`, 30, 54);

    // 3. KPI Metric Summary Cards
    const kpis = [
      { label: 'AFORO MÁXIMO', val: `${ev.maxCapacity} personas` },
      { label: 'INVITADOS CONFIRMADOS', val: `${ev.confirmedGuests} pases` },
      { label: 'ASISTENTES EN PUERTA', val: `${ev.attendedGuests} (${rate}%)` },
      { label: 'VALIDACIONES QR', val: `${logs.length} lecturas` }
    ];

    let startX = 14;
    const cardW = 43.5;
    const cardH = 17;
    kpis.forEach(kpi => {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(startX, 60, cardW, cardH, 2, 2, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label, startX + 4, 66);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(kpi.val, startX + 4, 73);

      startX += cardW + 2.5;
    });

    // 4. Gate Check-in Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('BITÁCORA OFICIAL DE VALIDACIÓN EN PUERTA', 14, 86);

    // Table Header
    let tableY = 90;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, tableY, 182, 7.5, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('HORA', 16, tableY + 5);
    doc.text('INVITADO', 38, tableY + 5);
    doc.text('TOKEN QR', 94, tableY + 5);
    doc.text('MESA', 126, tableY + 5);
    doc.text('OPERADOR', 154, tableY + 5);
    doc.text('ESTADO', 178, tableY + 5);

    tableY += 7.5;

    if (logs.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('No hay registros de ingresos registrados para este evento.', 14, tableY + 8);
      tableY += 14;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      logs.slice(0, 36).forEach((l, index) => {
        if (tableY > 270) {
          doc.addPage();
          tableY = 18;
          doc.setFillColor(241, 245, 249);
          doc.rect(14, tableY, 182, 7.5, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(51, 65, 85);
          doc.text('HORA', 16, tableY + 5);
          doc.text('INVITADO', 38, tableY + 5);
          doc.text('TOKEN QR', 94, tableY + 5);
          doc.text('MESA', 126, tableY + 5);
          doc.text('OPERADOR', 154, tableY + 5);
          doc.text('ESTADO', 178, tableY + 5);
          tableY += 7.5;
        }

        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, tableY, 182, 6, 'F');
        }

        doc.setTextColor(71, 85, 105);
        doc.text(l.scanTimestamp || '--:--', 16, tableY + 4.2);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(l.guestName.slice(0, 26), 38, tableY + 4.2);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(l.qrToken ? l.qrToken.slice(0, 14) : '--', 94, tableY + 4.2);
        doc.setTextColor(15, 23, 42);
        doc.text((l.assignedTableName || 'Mesa General').slice(0, 13), 126, tableY + 4.2);
        doc.setTextColor(100, 116, 139);
        doc.text((l.operatorUsername || 'Staff').slice(0, 10), 154, tableY + 4.2);

        if (l.status === 'AUTHORIZED') {
          doc.setTextColor(22, 101, 52); // green-800
          doc.text('AUTORIZADO', 178, tableY + 4.2);
        } else {
          doc.setTextColor(153, 27, 27); // red-800
          doc.text('DUPLICADO', 178, tableY + 4.2);
        }

        tableY += 6;
      });
    }

    // Footer
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 282, 196, 282);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('EvenPass Event Management OS · Documento oficial emitido con firma criptográfica · Prohibida su alteración', 14, 287);
    doc.text('Página 1 de 1', 196, 287, { align: 'right' });

    // Download PDF directly without print dialog
    const safeName = ev.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    doc.save(`reporte_ejecutivo_${safeName}.pdf`);
    this.notificationService.show('success', 'PDF Descargado', `Reporte PDF de "${ev.name}" guardado directamente en tu equipo.`);
  }

  downloadAuditCsv(ev: EventItem): void {
    const logs = this.eventService.allLogs().filter(l => l.eventId === ev.id);
    let csv = 'ID,Hora,Invitado,TokenQR,Mesa,Operador,Estado,Notas\n';
    logs.forEach(l => {
      csv += `"${l.id}","${l.scanTimestamp}","${l.guestName}","${l.qrToken || ''}","${l.assignedTableName || ''}","${l.operatorUsername || ''}","${l.status}","${l.notes || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bitacora_accesos_${ev.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.notificationService.show('success', 'Bitácora CSV Descargada', `Archivo CSV exportado exitosamente.`);
  }
}
