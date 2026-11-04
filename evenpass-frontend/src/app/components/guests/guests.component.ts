import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../services/event.service';
import { Guest, SalonTable, ExternalAuditEntry } from '../../models/models';
import { NotificationService } from '../../services/notification.service';
import { IconComponent } from '../icon.component';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-guests',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="guests-page-container">

      <!-- Locked Banner when Event Finished -->
      <div *ngIf="eventService.isEventLocked()" class="event-locked-banner">
        <div class="locked-icon-bubble">
          <app-icon name="lock" [size]="20"></app-icon>
        </div>
        <div class="locked-text-wrap">
          <strong>Evento Concluido · Padrón de Invitados Cerrado (Solo Lectura)</strong>
          <p>Este evento ya finalizó. No es posible registrar, modificar ni dar de baja invitados. La consulta y la exportación de reportes continúan habilitadas.</p>
        </div>
      </div>

      <!-- Header & Actions -->
      <div class="guests-header-card">
        <div>
          <h2>Lista de Invitados &amp; RSVP</h2>
          <p>
            Gestiona pases QR, confirmaciones y enlaces de WhatsApp para: 
            <b>{{ eventService.selectedEvent()?.name }}</b> (Anfitrión: {{ eventService.selectedEvent()?.hostName }})
          </p>
        </div>

        <div class="header-actions-row">
          <!-- 1-Click Sync Button -->
          <button class="btn-outline" [disabled]="eventService.isEventLocked()" (click)="syncSupabaseNow()" title="Sincronizar confirmaciones de las invitaciones en tiempo real">
            <app-icon name="refresh" [size]="15"></app-icon>
            <span>Sincronizar Confirmaciones</span>
          </button>
          <button 
            *ngIf="eventService.selectedEvent()?.templateSlug" 
            class="btn-outline" 
            style="border-color: #059669; color: #059669; background: rgba(5, 150, 105, 0.08);" 
            (click)="syncDigitalPanelDirectly()"
            title="Sincronizar en tiempo real con el Panel del Anfitrión (digital)"
          >
            <app-icon name="sparkles" [size]="15"></app-icon>
            <span>Sincronizar Panel de Anfitriones</span>
          </button>

          <!-- Hidden native file input browsing local PC or mobile files -->
          <input 
            type="file" 
            #csvFileInput 
            accept=".csv,text/csv,text/plain" 
            style="display: none;" 
            (change)="onCsvFileSelected($event)"
          >
          <button class="btn-outline" [disabled]="eventService.isEventLocked()" (click)="csvFileInput.click()" title="Buscar archivo CSV o TXT en este equipo o celular">
            <app-icon name="upload" [size]="15"></app-icon>
            <span>Buscar en mi equipo (CSV)</span>
          </button>
          <button class="btn-outline" (click)="exportGuestsCsv()" title="Exportar la lista completa de invitados en formato CSV para Excel">
            <app-icon name="download" [size]="15"></app-icon>
            <span>Exportar Lista</span>
          </button>
          <button class="btn-action" [disabled]="eventService.isEventLocked()" (click)="showAddModal.set(true)">
            <app-icon name="plus" [size]="15"></app-icon>
            <span>Nuevo Invitado</span>
          </button>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="filters-toolbar">
        <div class="search-input-box">
          <app-icon name="search" [size]="16" class="search-icon"></app-icon>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Buscar por nombre, correo o folio QR..."
          >
        </div>

        <div class="filter-pills">
          <button class="filter-pill" [class.active]="selectedStatus() === 'ALL'" (click)="selectedStatus.set('ALL')">
            Todos ({{ eventService.eventGuests().length }})
          </button>
          <button class="filter-pill" [class.active]="selectedStatus() === 'CONFIRMED'" (click)="selectedStatus.set('CONFIRMED')">
            Confirmados
          </button>
          <button class="filter-pill" [class.active]="selectedStatus() === 'ATTENDED'" (click)="selectedStatus.set('ATTENDED')">
            Ingresados (Puerta)
          </button>
          <button class="filter-pill" [class.active]="selectedStatus() === 'PENDING'" (click)="selectedStatus.set('PENDING')">
            Pendientes
          </button>
          <button class="filter-pill" [class.active]="selectedStatus() === 'DECLINED'" (click)="selectedStatus.set('DECLINED')">
            Rechazados
          </button>
        </div>
      </div>

      <!-- Guests Table Card -->
      <div class="table-card-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Invitado</th>
              <th>Pases</th>
              <th>Estado RSVP</th>
              <th>Mesa Asignada</th>
              <th>Folio QR</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let guest of filteredGuests()">
              <td>
                <div class="guest-cell-info">
                  <div class="guest-name-row">
                    <strong>{{ guest.fullName }}</strong>
                  </div>
                  <small>{{ guest.phone || guest.email || 'Sin contacto' }}</small>
                </div>
              </td>
              <td>
                <span class="passes-pill">
                  <app-icon name="ticket" [size]="13"></app-icon>
                  <b>{{ guest.totalPasses }}</b> lugar{{ guest.totalPasses > 1 ? 'es' : '' }}
                </span>
              </td>
              <td>
                <span class="badge" [ngClass]="{
                  'badge-completed': guest.status === 'CONFIRMED' || guest.status === 'ATTENDED',
                  'badge-warning': guest.status === 'PENDING',
                  'badge-urgent': guest.status === 'DECLINED'
                }">
                  {{ guest.status === 'ATTENDED' ? 'En el Salón' : (guest.status === 'CONFIRMED' ? 'Confirmado' : (guest.status === 'PENDING' ? 'Pendiente' : 'Rechazado')) }}
                </span>
              </td>
              <td>
                <span class="table-tag" [class.unassigned]="!guest.assignedTableName">
                  <app-icon *ngIf="!guest.assignedTableName" name="alert-triangle" [size]="12"></app-icon>
                  {{ guest.assignedTableName || 'Sin mesa' }}
                </span>
              </td>
              <td>
                <code class="qr-code-token">{{ guest.qrCodeToken }}</code>
              </td>
              <td style="text-align: right;">
                <div class="table-actions">
                  <!-- View QR Pass -->
                  <button class="action-btn-circle" (click)="viewQrPass(guest)" title="Ver Pase Digital">
                    <app-icon name="ticket" [size]="15"></app-icon>
                  </button>

                  <!-- View Table on Croquis -->
                  <button class="action-btn-circle" (click)="openGuestCroquisModal(guest)" title="Ver Mi Mesa en el Croquis CAD">
                    <app-icon name="croquis" [size]="15"></app-icon>
                  </button>

                  <!-- WhatsApp Share Link -->
                  <button class="action-btn-circle" (click)="shareWhatsApp(guest)" title="Enviar Invitación por WhatsApp">
                    <app-icon name="message" [size]="15"></app-icon>
                  </button>

                  <!-- Delete -->
                  <button class="action-btn-circle text-danger" [disabled]="eventService.isEventLocked()" (click)="eventService.deleteGuest(guest.id)" title="Eliminar">
                    <app-icon name="trash" [size]="15"></app-icon>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- QR Pass Preview Modal -->
      <div *ngIf="activeQrGuest()" class="modal-backdrop">
        <div class="modal-box pass-modal">
          <div class="modal-header">
            <h3>Pase Digital EvenPass</h3>
            <button class="close-btn" (click)="activeQrGuest.set(null)">✕</button>
          </div>

          <div class="ticket-view-card">
            <div class="ticket-header">
              <span class="brand-ep">EvenPass VIP Pass</span>
              <span class="badge badge-info">{{ activeQrGuest()?.status }}</span>
            </div>

            <div class="ticket-body">
              <h2 class="ticket-guest-name">{{ activeQrGuest()?.fullName }}</h2>
              <div class="ticket-details-grid">
                <div>
                  <small>PASES AUTORIZADOS</small>
                  <b>{{ activeQrGuest()?.totalPasses }} Lugares</b>
                </div>
                <div>
                  <small>MESA ASIGNADA</small>
                  <b class="text-blue">{{ activeQrGuest()?.assignedTableName || 'Mesa por asignar' }}</b>
                </div>
              </div>

              <!-- Visual QR Code Box -->
              <div class="qr-render-box">
                <div class="qr-matrix-simulated">
                  <div class="qr-corner top-left"></div>
                  <div class="qr-corner top-right"></div>
                  <div class="qr-corner bottom-left"></div>
                  <div class="qr-center-token">{{ activeQrGuest()?.qrCodeToken }}</div>
                </div>
                <small class="qr-tip">Presenta este código en la entrada del evento para validar en 1 segundo.</small>
              </div>
            </div>

            <div class="ticket-footer">
              <button class="btn-outline" style="width:100%; margin-bottom: 8px;" (click)="openGuestCroquisModal(activeQrGuest()!)">
                <app-icon name="croquis" [size]="15"></app-icon>
                <span>Ver Mi Mesa en el Croquis</span>
              </button>
              <button class="btn-action" style="width:100%;" (click)="copyPassLink(activeQrGuest()!)">
                <app-icon name="copy" [size]="15"></app-icon>
                <span>Copiar Enlace del Pase</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Personalized Guest Croquis & Seating Modal -->
      <div *ngIf="activeCroquisGuest()" class="modal-backdrop">
        <div class="modal-box guest-croquis-modal">
          <div class="modal-header">
            <div class="modal-title-with-icon">
              <app-icon name="croquis" [size]="20"></app-icon>
              <div>
                <h3>Ubicación de Mesa en el Croquis</h3>
                <small class="modal-subtitle">Plano del salón con señalamiento exacto de asiento para el invitado</small>
              </div>
            </div>
            <button class="close-btn" (click)="activeCroquisGuest.set(null)">✕</button>
          </div>

          <div class="guest-croquis-body" *ngIf="activeCroquisGuest() as guest">
            <!-- Guest Target Seating Info Banner -->
            <div class="guest-table-target-banner">
              <div class="target-left">
                <span class="badge-tag">COMENSAL OFICIAL</span>
                <h2>{{ guest.fullName }}</h2>
                <p>Pases Autorizados: <b>{{ guest.totalPasses }} personas</b> · Estado: <b>{{ guest.status }}</b></p>
              </div>
              <div class="target-right">
                <div class="table-assigned-pill">
                  <app-icon name="map-pin" [size]="18"></app-icon>
                  <div>
                    <small>MESA ASIGNADA</small>
                    <strong>{{ guest.assignedTableName || 'Mesa 1 (VIP)' }}</strong>
                  </div>
                </div>
              </div>
            </div>

            <!-- Mini Architectural Salon Croquis with Highlighted Table -->
            <div class="croquis-svg-viewer-box">
              <div class="viewer-top-meta">
                <span>RECINTO: <b>{{ eventService.currentSalon()?.name }}</b></span>
                <span class="pulse-beacon">📍 Destacada: <b>{{ guest.assignedTableName || 'Tu Mesa' }}</b></span>
              </div>

              <div class="salon-preview-svg-canvas">
                <svg viewBox="0 0 600 860" class="mini-cad-svg" xmlns="http://www.w3.org/2000/svg">
                  <!-- Outer Walls -->
                  <rect x="20" y="20" width="560" height="820" fill="none" stroke="currentColor" stroke-width="2.5" />
                  
                  <!-- Stage -->
                  <rect x="200" y="70" width="200" height="60" fill="color-mix(in srgb, currentColor 6%, transparent)" stroke="currentColor" stroke-width="1.5" />
                  <text x="300" y="105" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="11" fill="currentColor">ESCENARIO</text>

                  <!-- Dance Floor -->
                  <rect x="220" y="280" width="160" height="320" fill="color-mix(in srgb, currentColor 3%, transparent)" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4,4" />
                  <text x="300" y="445" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="13" fill="currentColor" opacity="0.3">PISTA DE BAILE</text>

                  <!-- Entrance -->
                  <line x1="260" y1="840" x2="340" y2="840" stroke="#0284c7" stroke-width="4"/>
                  <text x="300" y="825" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="10" font-weight="700" fill="currentColor">ENTRADA PRINCIPAL</text>

                  <!-- Salon Tables -->
                  <g *ngFor="let table of eventService.currentSalon()?.tables">
                    <!-- Normal Table -->
                    <circle 
                      *ngIf="table.shape === 'ROUND'"
                      [attr.cx]="table.posX" 
                      [attr.cy]="table.posY" 
                      r="28" 
                      [attr.fill]="isGuestTable(table, guest) ? '#0284c7' : '#f1f5f9'"
                      [attr.stroke]="isGuestTable(table, guest) ? '#0369a1' : '#94a3b8'"
                      [attr.stroke-width]="isGuestTable(table, guest) ? '3' : '1.5'"
                    />

                    <rect 
                      *ngIf="table.shape === 'RECTANGULAR'"
                      [attr.x]="table.posX - 35" 
                      [attr.y]="table.posY - 22" 
                      width="70" 
                      height="44" 
                      rx="6"
                      [attr.fill]="isGuestTable(table, guest) ? '#0284c7' : '#f1f5f9'"
                      [attr.stroke]="isGuestTable(table, guest) ? '#0369a1' : '#94a3b8'"
                      [attr.stroke-width]="isGuestTable(table, guest) ? '3' : '1.5'"
                    />

                    <!-- Table Number Text -->
                    <text 
                      [attr.x]="table.posX" 
                      [attr.y]="table.posY + 4" 
                      text-anchor="middle" 
                      font-family="'Plus Jakarta Sans', sans-serif" 
                      font-weight="800" 
                      font-size="10" 
                      [attr.fill]="isGuestTable(table, guest) ? '#ffffff' : '#334155'"
                    >
                      {{ table.tableName }}
                    </text>

                    <!-- Pulsing Halo & Beacon for THIS Guest's Table -->
                    <g *ngIf="isGuestTable(table, guest)">
                      <circle [attr.cx]="table.posX" [attr.cy]="table.posY" r="38" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="3,3" />
                      <!-- Pointer Badge -->
                      <rect [attr.x]="table.posX - 55" [attr.y]="table.posY - 48" width="110" height="20" rx="4" fill="#0284c7" />
                      <text [attr.x]="table.posX" [attr.y]="table.posY - 34" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="8.5" fill="#ffffff">
                        📍 TÚ ESTÁS AQUÍ
                      </text>
                    </g>
                  </g>
                </svg>
              </div>
            </div>

            <!-- Modal Action Buttons -->
            <div class="guest-croquis-actions-row">
              <button class="btn-outline" (click)="activeCroquisGuest.set(null)">Cerrar</button>
              <button class="btn-action" (click)="downloadPersonalizedGuestCroquisPdf(guest)">
                <app-icon name="download" [size]="15"></app-icon>
                <span>Descargar Mi Croquis Personalizado (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Guest Modal -->
      <div *ngIf="showAddModal()" class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-header">
            <h3>Registrar Nuevo Invitado</h3>
            <button class="close-btn" (click)="showAddModal.set(false)">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="handleAddGuest()">
            <div class="form-field">
              <label>Nombre Completo</label>
              <input type="text" [(ngModel)]="newGuest.fullName" name="fullName" placeholder="Ej. Ana Sofía Garza" required>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label>Teléfono (WhatsApp)</label>
                <input type="text" [(ngModel)]="newGuest.phone" name="phone" placeholder="667 123 4567">
              </div>

              <div class="form-field">
                <label>Acompañantes Extras</label>
                <input type="number" [(ngModel)]="newGuest.numCompanions" name="numCompanions" min="0" max="10">
              </div>
            </div>

            <div class="form-field">
              <label>Correo Electrónico (Opcional)</label>
              <input type="email" [(ngModel)]="newGuest.email" name="email" placeholder="correo@ejemplo.com">
            </div>

            <div class="form-field">
              <label>Estado Inicial</label>
              <select [(ngModel)]="newGuest.status" name="status">
                <option value="CONFIRMED">Confirmado (Asistirá)</option>
                <option value="PENDING">Pendiente por Responder</option>
                <option value="DECLINED">No Podrá Asistir</option>
              </select>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-outline" (click)="showAddModal.set(false)">Cancelar</button>
              <button type="submit" class="btn-action">Guardar Invitado</button>
            </div>
          </form>
        </div>
      </div>



    </div>
  `,
  styles: [`
    .guests-page-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Event Locked Banner */
    .event-locked-banner {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(185, 28, 28, 0.05));
      border: 1px solid rgba(239, 68, 68, 0.35);
      border-radius: var(--radius-lg);
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: var(--shadow-sm);
    }

    .locked-icon-bubble {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.18);
      color: #ef4444;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    .locked-text-wrap strong {
      font-size: 0.96rem;
      color: #b91c1c;
      display: block;
      margin-bottom: 2px;
    }

    .locked-text-wrap p {
      font-size: 0.82rem;
      color: var(--text-secondary);
      margin: 0;
    }

    .guests-header-card {
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

    .guests-header-card h2 {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .guests-header-card p {
      font-size: 0.88rem;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .header-actions-row {
      display: flex;
      gap: 12px;
    }

    /* Filters Toolbar */
    .filters-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .search-input-box {
      position: relative;
      width: min(340px, 100%);
    }

    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.95rem;
      color: var(--text-muted);
    }

    .search-input-box input {
      padding-left: 40px;
      height: 42px;
      border-radius: var(--radius-full);
    }

    .filter-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .filter-pill {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      padding: 8px 16px;
      border-radius: var(--radius-full);
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
      transition: all 0.2s;
    }

    .filter-pill:hover, .filter-pill.active {
      background: var(--brand-blue-light);
      color: var(--brand-blue);
      border-color: var(--brand-blue);
    }

    /* Table */
    .table-card-container {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .data-table th {
      background: var(--bg-input);
      padding: 14px 20px;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-ui);
    }

    .data-table td {
      padding: 14px 20px;
      border-bottom: 1px solid var(--border-ui);
      vertical-align: middle;
      font-size: 0.88rem;
    }

    .data-table tr:hover {
      background: color-mix(in srgb, var(--brand-blue-light) 30%, transparent);
    }

    .guest-cell-info {
      display: flex;
      flex-direction: column;
      line-height: 1.25;
    }

    .guest-cell-info strong {
      color: var(--text-main);
    }

    .guest-cell-info small {
      color: var(--text-muted);
      font-size: 0.75rem;
      margin-top: 2px;
    }

    .passes-pill {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .table-tag {
      background: var(--brand-blue-light);
      color: var(--brand-blue);
      font-weight: 700;
      font-size: 0.78rem;
      padding: 4px 10px;
      border-radius: 6px;
    }

    .table-tag.unassigned {
      background: var(--color-warning-light);
      color: #b45309;
    }

    .qr-code-token {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .table-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .action-btn-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      display: grid;
      place-items: center;
      font-size: 0.95rem;
      transition: all 0.2s;
    }

    .action-btn-circle:hover {
      transform: scale(1.1);
      background: var(--border-ui);
    }

    .text-danger:hover {
      background: var(--color-danger-light);
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-box {
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-ui);
      width: min(500px, 100%);
      padding: 26px;
      box-shadow: var(--shadow-hover);
    }

    .pass-modal {
      width: min(420px, 100%);
      padding: 20px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .modal-header h3 {
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .close-btn {
      font-size: 1.2rem;
      color: var(--text-muted);
      cursor: pointer;
    }

    /* Ticket View */
    .ticket-view-card {
      background: var(--bg-input);
      border: 2px dashed var(--border-ui);
      border-radius: var(--radius-md);
      padding: 20px;
    }

    .ticket-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-ui);
      padding-bottom: 12px;
      margin-bottom: 14px;
    }

    .brand-ep {
      font-size: 0.82rem;
      font-weight: 800;
      letter-spacing: 1px;
      color: var(--brand-blue);
      text-transform: uppercase;
    }

    .ticket-guest-name {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text-main);
      margin-bottom: 14px;
      text-align: center;
    }

    .ticket-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: var(--bg-card);
      border-radius: var(--radius-sm);
      padding: 12px;
      margin-bottom: 18px;
    }

    .ticket-details-grid small {
      display: block;
      font-size: 0.68rem;
      color: var(--text-muted);
      font-weight: 700;
    }

    .ticket-details-grid b {
      font-size: 0.95rem;
      color: var(--text-main);
    }

    .qr-render-box {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      margin-bottom: 18px;
    }

    .qr-matrix-simulated {
      width: 150px;
      height: 150px;
      background: #ffffff;
      border: 3px solid #0f172a;
      border-radius: 12px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--shadow-sm);
    }

    .qr-corner {
      position: absolute;
      width: 26px;
      height: 26px;
      border: 4px solid #0f172a;
    }

    .top-left { top: 10px; left: 10px; }
    .top-right { top: 10px; right: 10px; }
    .bottom-left { bottom: 10px; left: 10px; }

    .qr-center-token {
      font-family: monospace;
      font-weight: 900;
      font-size: 1.1rem;
      color: #0f172a;
      background: #e2e8f0;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .guest-croquis-modal {
      width: min(650px, 96%);
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }

    .guest-croquis-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
    }

    .guest-table-target-banner {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .guest-table-target-banner h2 {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 4px 0;
    }

    .guest-table-target-banner p {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin: 0;
    }

    .table-assigned-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--brand-blue-light);
      border: 1px solid var(--brand-blue);
      padding: 8px 14px;
      border-radius: var(--radius-md);
      color: var(--brand-blue);
    }

    .table-assigned-pill small {
      display: block;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.5px;
    }

    .table-assigned-pill strong {
      font-size: 0.95rem;
    }

    .croquis-svg-viewer-box {
      background: #0f172a;
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      padding: 14px;
      color: #94a3b8;
    }

    .viewer-top-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.78rem;
      color: #cbd5e1;
      margin-bottom: 10px;
    }

    .pulse-beacon {
      color: #38bdf8;
      font-weight: 700;
    }

    .salon-preview-svg-canvas {
      max-height: 380px;
      overflow-y: auto;
      display: flex;
      justify-content: center;
      background: #020617;
      border-radius: 8px;
      padding: 8px;
    }

    .mini-cad-svg {
      width: 100%;
      max-width: 480px;
      height: auto;
    }

    .guest-croquis-actions-row {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 10px;
      border-top: 1px solid var(--border-ui);
    }

    .form-field { margin-bottom: 14px; }
    .form-field label { display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }

    .guest-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* Modal Audit Box */
    .modal-audit-box {
      max-width: 960px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }

    .audit-badge-strip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.72rem;
      font-weight: 700;
      color: #059669;
      background: #ecfdf5;
      padding: 3px 10px;
      border-radius: var(--radius-full);
      margin-bottom: 6px;
    }

    .live-dot-pulse {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      animation: pulseDot 1.5s infinite;
    }

    .audit-tabs-bar {
      display: flex;
      gap: 10px;
      border-bottom: 1px solid var(--border-ui);
      padding: 0 4px 12px 4px;
      margin-bottom: 16px;
    }

    .audit-tab-btn {
      background: transparent;
      border: 1px solid var(--border-ui);
      padding: 8px 16px;
      border-radius: var(--radius-full);
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-secondary);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s;
    }

    .audit-tab-btn.active {
      background: var(--brand-blue-light);
      border-color: var(--brand-blue);
      color: var(--brand-blue);
    }

    .audit-tab-content {
      overflow-y: auto;
      max-height: calc(90vh - 220px);
      padding-right: 4px;
    }

    .connect-methods-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 16px;
    }

    .connect-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .connect-card.span-2 {
      grid-column: 1 / -1;
    }

    .connect-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .icon-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: grid;
      place-items: center;
    }
    .icon-circle.teal { background: #ecfdf5; color: #059669; }
    .icon-circle.blue { background: #eff6ff; color: #2563eb; }
    .icon-circle.navy { background: #f1f5f9; color: #0f172a; }

    .connect-card-header h4 {
      font-size: 0.95rem;
      margin: 0;
      color: var(--text-main);
    }

    .sub-badge {
      font-size: 0.68rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .card-desc {
      font-size: 0.8rem;
      color: var(--text-secondary);
      line-height: 1.4;
      margin: 0;
    }

    .copy-field-wrap label {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 4px;
      display: block;
    }

    .input-with-copy {
      display: flex;
      gap: 6px;
    }

    .input-with-copy input {
      flex: 1;
      padding: 7px 10px;
      font-size: 0.78rem;
    }

    .code-box {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      margin-bottom: 6px;
      overflow-x: auto;
    }

    .code-box code {
      font-size: 0.75rem;
      color: var(--brand-blue);
      font-family: monospace;
    }

    .qr-preview-row {
      display: flex;
      align-items: center;
      gap: 14px;
      background: var(--bg-input);
      padding: 10px;
      border-radius: var(--radius-sm);
      border: 1px dashed var(--border-ui);
    }

    .mini-qr-frame {
      background: #fff;
      color: #000;
      padding: 6px;
      border-radius: var(--radius-sm);
      display: grid;
      place-items: center;
    }

    .qr-hint {
      display: block;
      font-size: 0.74rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 6px;
    }

    .btn-sim-action {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      border: none;
      border-radius: var(--radius-sm);
      padding: 8px 14px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s;
    }

    .btn-sim-action:hover {
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      transform: translateY(-1px);
    }

    .api-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .api-item.full {
      grid-column: 1 / -1;
    }

    .api-item label {
      display: block;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    .api-item code {
      display: block;
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      font-size: 0.74rem;
      font-family: monospace;
      color: var(--brand-blue);
      overflow-x: auto;
    }

    .json-payload {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      font-size: 0.74rem;
      font-family: monospace;
      color: var(--text-main);
      margin: 0;
    }

    .api-actions-row {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    /* Audit Tab Styles */
    .audit-metrics-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }

    .metric-box {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      padding: 10px 14px;
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
    }

    .m-val {
      font-size: 1.3rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .m-val.text-teal { color: #059669; }
    .m-val.text-blue { color: #2563eb; }
    .m-val.text-emerald { color: #10b981; }

    .m-lbl {
      font-size: 0.7rem;
      color: var(--text-muted);
      font-weight: 600;
      margin-top: 2px;
    }

    .audit-filter-bar {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }

    .audit-search-input {
      flex: 1;
      padding: 8px 14px;
      border-radius: var(--radius-full);
      font-size: 0.8rem;
    }

    .audit-table-wrapper {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      overflow-x: auto;
    }

    .audit-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;
    }

    .audit-table th {
      background: var(--bg-input);
      padding: 10px 12px;
      text-align: left;
      font-size: 0.72rem;
      color: var(--text-muted);
      font-weight: 700;
      border-bottom: 1px solid var(--border-ui);
    }

    .audit-table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-ui);
      vertical-align: middle;
    }

    .source-tag {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: var(--radius-full);
      display: inline-flex;
      align-items: center;
    }
    .src-supabase { background: rgba(16, 185, 129, 0.16); color: #047857; font-weight: 700; }
    .src-google_sheets { background: rgba(37, 99, 235, 0.16); color: #1d4ed8; font-weight: 700; }
    .src-canva_qr { background: rgba(16, 185, 129, 0.12); color: #047857; }
    .src-webhook_api { background: rgba(37, 99, 235, 0.12); color: #1d4ed8; }
    .src-embed_widget { background: rgba(139, 92, 246, 0.12); color: #6d28d9; }
    .src-csv_import { background: rgba(245, 158, 11, 0.12); color: #b45309; }
    .src-manual { background: var(--bg-input); color: var(--text-muted); }

    .workflow-flow-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      padding: 10px 14px;
      border-radius: var(--radius-md);
      margin-bottom: 16px;
      overflow-x: auto;
    }
    .wf-step {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      white-space: nowrap;
    }
    .wf-step.done { color: #059669; }
    .wf-step.active { color: var(--brand-blue); }
    .wf-num {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--border-ui);
      color: var(--text-main);
      display: grid;
      place-items: center;
      font-size: 0.68rem;
    }
    .wf-step.done .wf-num { background: #10b981; color: #fff; }
    .wf-step.active .wf-num { background: var(--brand-blue); color: #fff; }
    .wf-arrow { color: var(--text-muted); font-size: 0.8rem; }

    .highlight-card {
      border: 2px solid var(--brand-blue) !important;
      background: linear-gradient(180deg, rgba(2, 132, 199, 0.04) 0%, var(--bg-card) 100%) !important;
    }

    .cloud-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.72rem;
      font-weight: 700;
      background: #ecfdf5;
      color: #059669;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      white-space: nowrap;
    }

    .supabase-config-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      padding: 10px 12px;
      border-radius: var(--radius-sm);
    }
    .supabase-config-row .field-item label {
      display: block;
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 3px;
    }
    .code-val-pill {
      font-size: 0.82rem;
      color: var(--brand-blue);
      font-weight: 800;
    }
    .connect-card-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-top: 4px;
    }

    .status-pill {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: var(--radius-full);
    }
    .status-pill.checked-in { background: #ecfdf5; color: #059669; }
    .status-pill.synced { background: #eff6ff; color: #2563eb; }
  `]
})
export class GuestsComponent {
  searchQuery = '';
  selectedStatus = signal<string>('ALL');
  activeQrGuest = signal<Guest | null>(null);
  activeCroquisGuest = signal<Guest | null>(null);
  showAddModal = signal(false);
  showLinkAuditModal = signal(false);
  tabLinkAudit = signal<'CONNECT' | 'AUDIT'>('CONNECT');
  auditSearchQuery = '';
  googleSheetInputUrl: string = '';

  newGuest: Partial<Guest> = {
    fullName: '',
    phone: '',
    email: '',
    numCompanions: 0,
    status: 'CONFIRMED'
  };

  constructor(
    public eventService: EventService,
    private notificationService: NotificationService
  ) {}

  openLinkAuditModal(): void {
    this.tabLinkAudit.set('CONNECT');
    this.auditSearchQuery = '';
    this.showLinkAuditModal.set(true);
  }

  getPublicRsvpUrl(): string {
    const ev = this.eventService.selectedEvent();
    if (!ev) return 'https://evenpass.io/rsvp/evento';
    const key = ev.webhookSyncKey || 'EP-HOOK';
    return `https://evenpass.io/rsvp/${ev.id}?key=${key}`;
  }

  getEmbedScriptCode(): string {
    const ev = this.eventService.selectedEvent();
    const key = ev?.webhookSyncKey || 'EP-HOOK';
    return `<script src="https://evenpass.io/embed.js" data-event-key="${key}"></script>`;
  }

  getApiEndpointSample(): string {
    const ev = this.eventService.selectedEvent();
    const id = ev?.id || 1;
    const key = ev?.webhookSyncKey || 'EP-HOOK-SECRET';
    return `curl -X POST https://api.evenpass.io/v1/events/${id}/sync-rsvp \\\n  -H "Authorization: Bearer ${key}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"guestName": "Carlos Mendoza", "totalPasses": 2, "phone": "6671234567"}'`;
  }

  getSupabaseSampleCode(): string {
    const ev = this.eventService.selectedEvent();
    const id = ev?.id || 1;
    return `// Inserción de confirmación RSVP en tu invitación web:\nconst { data, error } = await supabase\n  .from('guests')\n  .insert([{\n    event_id: ${id},\n    full_name: nombreInvitado,\n    total_passes: numeroDePases,\n    phone: telefonoInvitado,\n    status: 'CONFIRMED'\n  }]);`;
  }

  getSqlSchemaCode(): string {
    return `-- Esquema oficial para tabla de invitados en Supabase (PostgreSQL)\nCREATE TABLE IF NOT EXISTS public.guests (\n  id BIGSERIAL PRIMARY KEY,\n  event_id BIGINT NOT NULL,\n  full_name TEXT NOT NULL,\n  total_passes INT NOT NULL DEFAULT 1,\n  phone TEXT,\n  status TEXT NOT NULL DEFAULT 'CONFIRMED',\n  assigned_table TEXT,\n  qr_code TEXT,\n  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n);\n\n-- Índice para consultas en tiempo real filtradas por evento\nCREATE INDEX IF NOT EXISTS idx_guests_event_id ON public.guests(event_id);`;
  }

  syncSupabaseNow(): void {
    const ev = this.eventService.selectedEvent();
    if (ev) {
      this.eventService.syncWithSupabase(ev.id);
      this.tabLinkAudit.set('AUDIT');
    }
  }

  syncDigitalPanelDirectly(): void {
    const ev = this.eventService.selectedEvent();
    if (!ev) return;
    this.eventService.syncWithSupabase(ev.id);
  }

  async syncGoogleSheetNow(): Promise<void> {
    const ev = this.eventService.selectedEvent();
    if (ev) {
      await this.eventService.syncWithGoogleSheet(ev.id, this.googleSheetInputUrl);
      this.tabLinkAudit.set('AUDIT');
    }
  }

  copyToClipboard(text: string, label: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.notificationService.show('success', 'Copiado al Portapapeles', `${label} copiado exitosamente.`);
    }).catch(() => {
      this.notificationService.show('info', 'Copiado', text);
    });
  }

  downloadCanvaQrCode(): void {
    this.notificationService.show('success', 'QR Vectorial Generado', 'Código QR de alta definición listo para pegar en Canva o Illustrator.');
  }

  triggerSimulatedRsvp(source: 'SUPABASE' | 'GOOGLE_SHEETS' | 'CANVA_QR' | 'WEBHOOK_API' | 'EMBED_WIDGET'): void {
    const ev = this.eventService.selectedEvent();
    if (ev) {
      this.eventService.simulateExternalRsvp(ev.id, source);
      this.tabLinkAudit.set('AUDIT');
    }
  }

  filteredAuditEntries(): ExternalAuditEntry[] {
    const ev = this.eventService.selectedEvent();
    if (!ev) return [];
    let list = this.eventService.allAuditEntries().filter(a => a.eventId === ev.id);
    const q = this.auditSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(a => 
        a.guestName.toLowerCase().includes(q) ||
        a.assignedTable.toLowerCase().includes(q) ||
        a.qrToken.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q)
      );
    }
    return list;
  }

  getAuditCount(type: 'ALL' | 'SUPABASE' | 'GOOGLE_SHEETS' | 'CANVA_QR' | 'WEBHOOK_API' | 'EMBED_WIDGET' | 'CHECKED_IN'): number {
    const ev = this.eventService.selectedEvent();
    if (!ev) return 0;
    const list = this.eventService.allAuditEntries().filter(a => a.eventId === ev.id);
    if (type === 'ALL') return list.length;
    if (type === 'CHECKED_IN') return list.filter(a => a.status === 'CHECKED_IN').length;
    return list.filter(a => a.source === type).length;
  }

  filteredGuests(): Guest[] {
    let list = this.eventService.eventGuests();
    const status = this.selectedStatus();
    if (status !== 'ALL') {
      list = list.filter(g => g.status === status);
    }

    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(g =>
        g.fullName.toLowerCase().includes(q) ||
        (g.email && g.email.toLowerCase().includes(q)) ||
        g.qrCodeToken.toLowerCase().includes(q)
      );
    }
    return list;
  }

  viewQrPass(guest: Guest): void {
    this.activeQrGuest.set(guest);
  }

  openGuestCroquisModal(guest: Guest): void {
    this.activeCroquisGuest.set(guest);
  }

  isGuestTable(table: SalonTable, guest: Guest): boolean {
    if (guest.assignedTableId != null && table.id != null && Number(table.id) === Number(guest.assignedTableId)) {
      return true;
    }
    if (guest.assignedTableName) {
      const cleanGuestTbl = guest.assignedTableName.toLowerCase().trim();
      const cleanTbl = table.tableName.toLowerCase().trim();
      if (cleanGuestTbl === cleanTbl) return true;
      const regex = new RegExp(`\\b(mesa|table)\\s*0*${table.tableNumber}\\b`, 'i');
      return regex.test(cleanGuestTbl);
    }
    return false;
  }

  downloadPersonalizedGuestCroquisPdf(guest: Guest): void {
    const ev = this.eventService.selectedEvent();
    const salon = this.eventService.currentSalon();
    const tables = salon?.tables || [];

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 1. Header
    doc.setFillColor(2, 132, 199);
    doc.rect(0, 0, 210, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('EVENPASS · TU LUGAR EN EL EVENTO', 14, 11);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('PASE OFICIAL DE ACCESO & CROQUIS DE UBICACIÓN EN SALÓN', 14, 17);

    // 2. Event Info Card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 28, 182, 38, 3, 3, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(ev?.name || 'Evento Oficial', 20, 38);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Anfitrión: ', 20, 46);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(ev?.hostName || 'Cliente', 36, 46);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Sede / Salón: ', 100, 46);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(salon?.name || 'Salón Principal', 123, 46);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Fecha: ', 20, 56);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(ev?.eventDate ? new Date(ev.eventDate).toLocaleDateString('es-MX', { dateStyle: 'full' }) : 'Fecha por confirmar', 33, 56);

    // 3. Guest Seating Highlight Box
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(129, 140, 248);
    doc.roundedRect(14, 72, 182, 30, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 27, 75);
    doc.text(`Invitado(a): ${guest.fullName}`, 20, 82);

    doc.setFontSize(10);
    doc.setTextColor(67, 56, 202);
    doc.text(`MESA ASIGNADA: ${guest.assignedTableName || 'Mesa VIP 1'}`, 20, 93);
    doc.text(`Pases Autorizados: ${guest.totalPasses} lugares`, 120, 93);

    // 4. Floor distribution list
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('DISTRIBUCIÓN ARQUITECTÓNICA DE MESAS', 14, 112);

    let currentY = 118;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, currentY, 182, 7, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('MESA', 18, currentY + 4.5);
    doc.text('FORMA', 50, currentY + 4.5);
    doc.text('CAPACIDAD', 85, currentY + 4.5);
    doc.text('UBICACIÓN / ESTADO', 120, currentY + 4.5);
    currentY += 7;

    tables.slice(0, 16).forEach((t, idx) => {
      const isMine = this.isGuestTable(t, guest);
      if (isMine) {
        doc.setFillColor(224, 242, 254);
        doc.rect(14, currentY, 182, 6.5, 'F');
        doc.setTextColor(3, 105, 161);
        doc.setFont('helvetica', 'bold');
      } else {
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, currentY, 182, 6.5, 'F');
        }
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');
      }

      doc.setFontSize(7.5);
      doc.text(t.tableName, 18, currentY + 4.5);
      doc.text(t.shape === 'ROUND' ? 'Redonda (10p)' : 'Imperial / Honor', 50, currentY + 4.5);
      doc.text(`${t.capacity} asientos`, 85, currentY + 4.5);
      doc.text(isMine ? '>>> TU LUGAR ASIGNADO <<<' : 'Mesa General', 120, currentY + 4.5);
      currentY += 6.5;
    });

    // 5. Bottom QR & Footer Notes
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 260, 196, 260);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Folio QR: ${guest.qrCodeToken} · Presenta este comprobante al recepcionista en la puerta.`, 14, 267);
    doc.text('EvenPass Event Operating System', 196, 267, { align: 'right' });

    const safeName = guest.fullName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    doc.save(`EvenPass_Mi_Mesa_${safeName}.pdf`);
    this.notificationService.show('success', 'PDF Descargado', `Se descargó el croquis y tu asignación de mesa para ${guest.fullName}.`);
  }

  shareWhatsApp(guest: Guest): void {
    const text = encodeURIComponent(
      `¡Hola ${guest.fullName}! Te compartimos tu pase digital para el evento: Folio ${guest.qrCodeToken}. ` +
      `Mesa asignada: ${guest.assignedTableName || 'Mesa principal'}. Accede aquí: https://evenpass.io/p/${guest.qrCodeToken}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    this.notificationService.show('success', 'Enlace Compartido', `Enlace de pase enviado a WhatsApp para ${guest.fullName}`);
  }

  copyPassLink(guest: Guest): void {
    navigator.clipboard?.writeText(`https://evenpass.io/p/${guest.qrCodeToken}`);
    this.notificationService.show('info', 'Enlace Copiado', 'Enlace del pase copiado al portapapeles.');
  }

  handleAddGuest(): void {
    if (!this.newGuest.fullName) {
      this.notificationService.show('warning', 'Campo Requerido', 'Ingresa el nombre del invitado.');
      return;
    }
    this.eventService.addGuest(this.newGuest);
    this.showAddModal.set(false);
    this.newGuest = { fullName: '', phone: '', email: '', numCompanions: 0, status: 'CONFIRMED' };
  }

  onCsvFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text: string = e.target.result || '';
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) {
        this.notificationService.show('warning', 'Archivo Vacío', 'El archivo seleccionado no contiene datos.');
        return;
      }

      let importedCount = 0;
      // Check if line 0 is a header
      const headerLine = lines[0].toLowerCase();
      const hasHeader = headerLine.includes('nombre') || headerLine.includes('name') || headerLine.includes('invitado');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      dataLines.forEach(line => {
        // Support comma, semicolon or tab delimiter
        const delimiter = line.includes(';') ? ';' : (line.includes('\t') ? '\t' : ',');
        const cols = line.split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());

        if (cols.length > 0 && cols[0].length > 0) {
          const fullName = cols[0];
          const phone = cols.length > 1 && /^[0-9+() -]+$/.test(cols[1]) ? cols[1] : '';
          let companions = 0;
          let email = '';

          // Look for email in subsequent cols
          for (let i = 1; i < cols.length; i++) {
            if (cols[i].includes('@')) {
              email = cols[i];
            } else if (!isNaN(Number(cols[i])) && Number(cols[i]) >= 0 && Number(cols[i]) <= 20) {
              companions = Number(cols[i]);
            }
          }

          this.eventService.addGuest({
            fullName,
            phone,
            email,
            numCompanions: companions,
            status: 'CONFIRMED'
          });
          importedCount++;
        }
      });

      // Clear input so selecting the same file works again
      event.target.value = '';

      if (importedCount > 0) {
        this.notificationService.show('success', 'Importación Exitosa', `Se importaron ${importedCount} invitados desde "${file.name}".`);
      } else {
        this.notificationService.show('warning', 'Sin Registros', 'No se pudieron extraer registros válidos del archivo.');
      }
    };
    reader.readAsText(file);
  }

  exportGuestsCsv(): void {
    const guests = this.eventService.eventGuests();
    const ev = this.eventService.selectedEvent();
    if (guests.length === 0) {
      this.notificationService.show('info', 'Lista Vacía', 'No hay invitados registrados para exportar.');
      return;
    }

    let csv = '\uFEFFNombre Completo,Teléfono,Correo,Pases Totales,Mesa Asignada,Folio QR,Estado RSVP,Notas Dietéticas\n';
    guests.forEach(g => {
      const row = [
        `"${g.fullName}"`,
        `"${g.phone || ''}"`,
        `"${g.email || ''}"`,
        g.totalPasses,
        `"${g.assignedTableName || 'Sin mesa'}"`,
        `"${g.qrCodeToken}"`,
        `"${g.status}"`,
        `"${g.dietNotes || ''}"`
      ].join(',');
      csv += row + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EvenPass_Invitados_${(ev?.name || 'Evento').replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.notificationService.show('success', 'Lista Exportada', 'El archivo CSV de invitados se descargó en tu dispositivo.');
  }
}
