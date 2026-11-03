import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../services/event.service';
import { SupportTicket } from '../../models/models';
import { IconComponent } from '../icon.component';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="support-page-container">

      <!-- Header Card -->
      <div class="support-header-card">
        <div class="title-with-icon">
          <div class="icon-wrap-badge">
            <app-icon name="support" [size]="22"></app-icon>
          </div>
          <div>
            <h2>Centro de Asistencia &amp; Soporte Concierge</h2>
            <p>Atención prioritaria 24/7 para incidencias de puerta, ajustes de croquis y sincronización de pases.</p>
          </div>
        </div>

        <button class="btn-action" (click)="showNewTicketModal.set(true)">
          <app-icon name="plus" [size]="16"></app-icon>
          <span>Abrir Ticket de Soporte</span>
        </button>
      </div>

      <!-- Quick Contact Channels Bar -->
      <div class="quick-channels-grid">
        <div class="channel-card">
          <div class="channel-icon-circle green">
            <app-icon name="message" [size]="20"></app-icon>
          </div>
          <div class="channel-text">
            <strong>Concierge WhatsApp en Vivo</strong>
            <p>Atención técnica en tiempo real durante recepciones activas.</p>
            <a href="https://wa.me/526671234567?text=Hola,%20requiero%20soporte%20urgente%20con%20EvenPass" target="_blank" class="channel-link">
              <span>Enviar WhatsApp Directo</span>
              <app-icon name="external-link" [size]="12"></app-icon>
            </a>
          </div>
        </div>

        <div class="channel-card">
          <div class="channel-icon-circle blue">
            <app-icon name="mail" [size]="20"></app-icon>
          </div>
          <div class="channel-text">
            <strong>Mesa de Ayuda Enterprise</strong>
            <p>Respuesta garantizada en menos de 15 minutos para cuentas SaaS.</p>
            <span class="channel-email">soporte&#64;evenpass.io</span>
          </div>
        </div>

        <div class="channel-card">
          <div class="channel-icon-circle amber">
            <app-icon name="shield" [size]="20"></app-icon>
          </div>
          <div class="channel-text">
            <strong>Estado de Infraestructura</strong>
            <p>Microservicios de validación QR operativos al 99.98% uptime.</p>
            <span class="system-status-ok">● Todos los sistemas operando</span>
          </div>
        </div>
      </div>

      <!-- Tickets Management Section -->
      <div class="tickets-section-card">
        <div class="section-top-bar">
          <div>
            <h3>Tickets de Soporte Registrados</h3>
            <p>Historial de solicitudes de asistencia técnica para tus recepciones.</p>
          </div>

          <div class="ticket-status-pills">
            <span class="counter-badge">
              <b>{{ eventService.supportTickets().length }}</b> Tickets Totales
            </span>
          </div>
        </div>

        <div class="tickets-table-wrapper">
          <table class="tickets-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Evento Relacionado</th>
                <th>Asunto / Incidencia</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th style="text-align: right;">Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let t of eventService.supportTickets()">
                <td>
                  <code class="ticket-id-tag">{{ t.id }}</code>
                </td>
                <td>
                  <strong>{{ t.eventName }}</strong>
                </td>
                <td>
                  <div class="ticket-subject-cell">
                    <span class="subject-title">{{ t.subject }}</span>
                    <small class="subject-desc">{{ t.description }}</small>
                  </div>
                </td>
                <td>
                  <span class="priority-badge" [ngClass]="{
                    'prio-alta': t.priority === 'ALTA',
                    'prio-media': t.priority === 'MEDIA',
                    'prio-baja': t.priority === 'BAJA'
                  }">
                    {{ t.priority }}
                  </span>
                </td>
                <td>
                  <span class="status-pill" [ngClass]="{
                    'status-open': t.status === 'ABIERTO',
                    'status-resolved': t.status === 'RESUELTO',
                    'status-review': t.status === 'EN_REVISION'
                  }">
                    {{ t.status === 'ABIERTO' ? 'Abierto' : (t.status === 'RESUELTO' ? 'Resuelto' : 'En Revisión') }}
                  </span>
                </td>
                <td>
                  <span class="ticket-date">{{ t.createdAt }}</span>
                </td>
                <td style="text-align: right;">
                  <button 
                    *ngIf="t.status !== 'RESUELTO'"
                    class="btn-resolve-sm" 
                    (click)="eventService.resolveSupportTicket(t.id)"
                    title="Marcar como Resuelto"
                  >
                    <app-icon name="check" [size]="14"></app-icon>
                    <span>Resolver</span>
                  </button>
                  <span *ngIf="t.status === 'RESUELTO'" class="resolved-check">
                    <app-icon name="check-circle" [size]="16" class="text-success"></app-icon>
                  </span>
                </td>
              </tr>

              <tr *ngIf="eventService.supportTickets().length === 0">
                <td colspan="7" class="text-center py-4 text-muted">
                  No hay incidencias abiertas actualmente. Todo marcha a la perfección.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- New Ticket Modal -->
      <div *ngIf="showNewTicketModal()" class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-header">
            <h3>Abrir Ticket de Asistencia Técnica</h3>
            <button class="close-btn" (click)="showNewTicketModal.set(false)">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="handleCreateTicket()">
            <div class="form-field">
              <label>Evento Involucrado</label>
              <select [(ngModel)]="newTicket.eventId" name="eventId" required>
                <option *ngFor="let ev of eventService.events()" [value]="ev.id">
                  {{ ev.name }} ({{ ev.hostName }})
                </option>
              </select>
            </div>

            <div class="form-field">
              <label>Prioridad de la Solicitud</label>
              <select [(ngModel)]="newTicket.priority" name="priority">
                <option value="ALTA">Alta (Evento en curso hoy / En puerta)</option>
                <option value="MEDIA">Media (Ajuste de croquis / Asignación)</option>
                <option value="BAJA">Baja (Consulta general o recomendación)</option>
              </select>
            </div>

            <!-- Smart Keyword Alert Banner -->
            <div *ngIf="detectedKeyword()" class="keyword-detected-banner">
              <app-icon name="alert-triangle" [size]="16"></app-icon>
              <div>
                <strong>Incidencia Crítica Detectada: "{{ detectedKeyword() }}"</strong>
                <small>Se asignó automáticamente prioridad ALTA y se habilitó la notificación inmediata por WhatsApp.</small>
              </div>
            </div>

            <div class="form-field">
              <label>Asunto Breve</label>
              <input 
                type="text" 
                [(ngModel)]="newTicket.subject" 
                (ngModelChange)="checkUrgentKeywords()"
                name="subject" 
                placeholder="Ej. Problema con mesa 4 o pase no validado" 
                required
              >
            </div>

            <div class="form-field">
              <label>Descripción Detallada del Requerimiento</label>
              <textarea 
                rows="4" 
                [(ngModel)]="newTicket.description" 
                (ngModelChange)="checkUrgentKeywords()"
                name="description" 
                placeholder="Detalla qué problema, inconveniente o error se presentó..." 
                required
              ></textarea>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-outline" (click)="showNewTicketModal.set(false)">Cancelar</button>
              <button type="button" class="btn-outline btn-whatsapp-direct" (click)="handleCreateTicketAndWhatsApp()">
                <app-icon name="message" [size]="15"></app-icon>
                <span>Crear &amp; Enviar a WhatsApp</span>
              </button>
              <button type="submit" class="btn-action">Guardar Ticket</button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .support-page-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .support-header-card {
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

    .support-header-card h2 {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0;
    }

    .support-header-card p {
      font-size: 0.88rem;
      color: var(--text-muted);
      margin: 4px 0 0;
    }

    .btn-action {
      background-color: #0284c7 !important;
      color: #ffffff !important;
      font-weight: 800 !important;
      border: 1px solid #0369a1 !important;
      padding: 10px 22px !important;
      border-radius: var(--radius-full);
      font-size: 0.88rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35) !important;
      transition: all 0.2s ease;
    }

    .btn-action:hover {
      background-color: #0369a1 !important;
      transform: translateY(-1px);
    }

    [data-theme="dark"] .btn-action {
      background-color: #0284c7 !important;
      color: #ffffff !important;
      border-color: #38bdf8 !important;
    }

    /* Channels Grid */
    .quick-channels-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    @media (max-width: 900px) {
      .quick-channels-grid {
        grid-template-columns: 1fr;
      }
    }

    .channel-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 20px;
      display: flex;
      gap: 16px;
      align-items: flex-start;
      box-shadow: var(--shadow-sm);
    }

    .channel-icon-circle {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .channel-icon-circle.green {
      background: rgba(34, 197, 94, 0.12);
      color: #16a34a;
    }

    .channel-icon-circle.blue {
      background: rgba(14, 165, 233, 0.12);
      color: var(--color-primary);
    }

    .channel-icon-circle.amber {
      background: rgba(245, 158, 11, 0.12);
      color: #d97706;
    }

    .channel-text strong {
      font-size: 0.92rem;
      color: var(--text-main);
      display: block;
    }

    .channel-text p {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin: 4px 0 8px;
      line-height: 1.35;
    }

    .channel-link {
      font-size: 0.8rem;
      font-weight: 700;
      color: #16a34a;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .channel-link:hover {
      text-decoration: underline;
    }

    .channel-email {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--color-primary);
      font-family: monospace;
    }

    .system-status-ok {
      font-size: 0.76rem;
      font-weight: 700;
      color: #16a34a;
    }

    /* Tickets Section */
    .tickets-section-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: var(--shadow-sm);
    }

    .section-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .section-top-bar h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
    }

    .section-top-bar p {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin: 2px 0 0;
    }

    .counter-badge {
      background: var(--bg-body);
      border: 1px solid var(--border-ui);
      padding: 6px 12px;
      border-radius: var(--radius-md);
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .counter-badge b {
      color: var(--color-primary);
    }

    .tickets-table-wrapper {
      overflow-x: auto;
    }

    .tickets-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }

    .tickets-table th {
      text-align: left;
      padding: 12px 14px;
      background: var(--bg-body);
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.76rem;
      text-transform: uppercase;
      border-bottom: 1px solid var(--border-ui);
    }

    .tickets-table td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-ui);
      color: var(--text-main);
      vertical-align: middle;
    }

    .ticket-id-tag {
      background: var(--bg-body);
      padding: 3px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--color-primary);
    }

    .ticket-subject-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-width: 320px;
    }

    .subject-title {
      font-weight: 600;
      color: var(--text-main);
    }

    .subject-desc {
      font-size: 0.76rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .priority-badge {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 10px;
    }

    .prio-alta {
      background: rgba(239, 68, 68, 0.12);
      color: #ef4444;
    }

    .prio-media {
      background: rgba(245, 158, 11, 0.12);
      color: #d97706;
    }

    .prio-baja {
      background: rgba(14, 165, 233, 0.12);
      color: var(--color-primary);
    }

    .status-pill {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 12px;
      display: inline-block;
    }

    .status-open {
      background: rgba(14, 165, 233, 0.12);
      color: var(--color-primary);
    }

    .status-resolved {
      background: rgba(34, 197, 94, 0.12);
      color: #16a34a;
    }

    .status-review {
      background: rgba(245, 158, 11, 0.12);
      color: #d97706;
    }

    .ticket-date {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .btn-resolve-sm {
      background: transparent;
      border: 1px solid var(--border-ui);
      color: var(--text-main);
      padding: 6px 10px;
      border-radius: var(--radius-md);
      font-size: 0.78rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all var(--trans-fast);
    }

    .btn-resolve-sm:hover {
      background: rgba(34, 197, 94, 0.12);
      border-color: #16a34a;
      color: #16a34a;
    }

    .text-success { color: #16a34a; }

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

    .modal-box {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      width: min(520px, 100%);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-ui);
      padding-bottom: 14px;
    }

    .modal-header h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }

    .form-field label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-main);
    }

    .form-field input,
    .form-field select,
    .form-field textarea {
      padding: 9px 12px;
      background: var(--bg-body);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      color: var(--text-main);
      font-size: 0.86rem;
      outline: none;
      font-family: inherit;
      transition: border-color var(--trans-fast);
    }

    .form-field input:focus,
    .form-field select:focus,
    .form-field textarea:focus {
      border-color: var(--color-primary);
    }

    .keyword-detected-banner {
      background: color-mix(in srgb, #ef4444 12%, var(--bg-card));
      border: 1px solid #ef4444;
      border-radius: var(--radius-md);
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #ef4444;
      margin-bottom: 12px;
      animation: pulse 1.6s infinite ease-in-out;
    }

    .keyword-detected-banner strong {
      display: block;
      font-size: 0.84rem;
      font-weight: 800;
    }

    .keyword-detected-banner small {
      display: block;
      font-size: 0.74rem;
      color: var(--text-main);
    }

    .btn-whatsapp-direct {
      border-color: #10b981 !important;
      color: #10b981 !important;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-whatsapp-direct:hover {
      background: #10b981 !important;
      color: #ffffff !important;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 8px;
      flex-wrap: wrap;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid var(--border-ui);
      color: var(--text-main);
      padding: 8px 16px;
      border-radius: var(--radius-md);
      font-size: 0.84rem;
      cursor: pointer;
    }
  `]
})
export class SupportComponent {
  showNewTicketModal = signal(false);
  detectedKeyword = signal<string | null>(null);

  newTicket: {
    subject: string;
    eventId: number;
    priority: 'ALTA' | 'MEDIA' | 'BAJA';
    description: string;
  } = {
    subject: '',
    eventId: 1,
    priority: 'MEDIA',
    description: ''
  };

  constructor(
    public eventService: EventService,
    private notificationService: NotificationService
  ) {
    if (this.eventService.selectedEvent()) {
      this.newTicket.eventId = this.eventService.selectedEvent()!.id;
    }
  }

  checkUrgentKeywords(): void {
    const combined = `${this.newTicket.subject} ${this.newTicket.description}`.toLowerCase();
    const triggers = ['problema', 'inconveniente', 'error', 'fallo', 'urgente', 'bloqueo', 'emergencia', 'caído', 'caido', 'no entra'];
    const matched = triggers.find(t => combined.includes(t));
    if (matched) {
      this.detectedKeyword.set(matched);
      this.newTicket.priority = 'ALTA';
    } else {
      this.detectedKeyword.set(null);
    }
  }

  handleCreateTicket(): void {
    if (!this.newTicket.subject || !this.newTicket.description) {
      this.notificationService.show('warning', 'Campos Incompletos', 'Completa el asunto y la descripción.');
      return;
    }

    this.eventService.createSupportTicket({
      subject: this.newTicket.subject,
      eventId: Number(this.newTicket.eventId),
      priority: this.newTicket.priority,
      description: this.newTicket.description
    });

    this.showNewTicketModal.set(false);
    this.newTicket = {
      subject: '',
      eventId: this.eventService.selectedEvent()?.id || 1,
      priority: 'MEDIA',
      description: ''
    };
    this.detectedKeyword.set(null);
  }

  handleCreateTicketAndWhatsApp(): void {
    if (!this.newTicket.subject || !this.newTicket.description) {
      this.notificationService.show('warning', 'Campos Incompletos', 'Completa el asunto y la descripción.');
      return;
    }

    const ev = this.eventService.events().find(e => e.id === Number(this.newTicket.eventId));
    this.eventService.createSupportTicket({
      subject: this.newTicket.subject,
      eventId: Number(this.newTicket.eventId),
      priority: 'ALTA',
      description: this.newTicket.description
    });

    const text = encodeURIComponent(
      `🚨 *REPORTE DE INCIDENCIA EVENPASS*\n` +
      `• Evento: ${ev?.name || 'Evento Activo'}\n` +
      `• Anfitrión: ${ev?.hostName || 'Cliente'}\n` +
      `• Prioridad: *ALTA / URGENTE*\n` +
      `• Asunto: ${this.newTicket.subject}\n` +
      `• Detalle: ${this.newTicket.description}\n` +
      `• Hora de reporte: ${new Date().toLocaleTimeString('es-MX')}`
    );
    window.open(`https://wa.me/526671234567?text=${text}`, '_blank');

    this.showNewTicketModal.set(false);
    this.newTicket = {
      subject: '',
      eventId: this.eventService.selectedEvent()?.id || 1,
      priority: 'MEDIA',
      description: ''
    };
    this.detectedKeyword.set(null);
  }
}
