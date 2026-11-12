import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../services/event.service';
import { ItineraryItem } from '../../models/models';
import { NotificationService } from '../../services/notification.service';
import { IconComponent } from '../icon.component';

@Component({
  selector: 'app-itinerary',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="itinerary-page-container">

      <!-- Locked Banner when Event Finished -->
      <div *ngIf="eventService.isEventLocked()" class="event-locked-banner">
        <div class="locked-icon-bubble">
          <app-icon name="lock" [size]="20"></app-icon>
        </div>
        <div class="locked-text-wrap">
          <strong>Evento Concluido · Cronograma Archivado (Solo Lectura)</strong>
          <p>Este evento está marcado como finalizado. Si deseas reprogramar momentos, agregar fases o reactivar la agenda, haz clic en reactivar.</p>
        </div>
        <button type="button" class="btn-unlock-banner" (click)="eventService.setEventStatus(eventService.selectedEvent()!.id, 'PENDIENTE')" title="Reabrir agenda del evento">
          <app-icon name="refresh" [size]="14"></app-icon>
          <span>Reactivar Agenda &amp; Horarios</span>
        </button>
      </div>

      <!-- Real-Time Smart Clock & Simulation Controller -->
      <div class="smart-clock-card">
        <div class="clock-info-col">
          <div class="clock-title-row">
            <span class="live-pulse-dot" [class.is-simulated]="eventService.simulatedTime() !== null"></span>
            <strong class="clock-display">Reloj del Sistema: {{ eventService.currentEffectiveTime() }} hrs</strong>
            <span class="clock-badge-tag" [class.badge-simulated]="eventService.simulatedTime() !== null">
              {{ eventService.simulatedTime() ? 'SIMULACIÓN ACTIVA' : 'HORA REAL' }}
            </span>
          </div>
          <p class="clock-desc">
            <b>Automatización Inteligente:</b> Los momentos de la agenda se marcan solos según el reloj si el anfitrión no los marca manualmente.
            <span *ngIf="eventService.selectedEvent()?.status === 'PENDIENTE'" class="status-cue pending">
              Evento programado para el {{ eventService.selectedEvent()?.eventDate | date:'mediumDate' }} · Invitaciones y confirmaciones RSVP activas.
            </span>
            <span *ngIf="eventService.selectedEvent()?.status === 'EN_PROGRESO'" class="status-cue live">
              Evento en curso en este momento · Recepción y control de acceso activos.
            </span>
            <span *ngIf="eventService.selectedEvent()?.status === 'FINALIZADO'" class="status-cue done">
              Evento concluido según cronograma (Modo histórico).
            </span>
          </p>
        </div>

        <div class="clock-sim-actions-col">
          <span class="sim-label-text">Probar Horario (Simulador):</span>
          <div class="sim-buttons-flex">
            <button class="btn-sim-pill" [class.active]="eventService.simulatedTime() === '09:25'" (click)="eventService.setSimulatedTime('09:25')">
              09:25 (Mañana)
            </button>
            <button class="btn-sim-pill" [class.active]="eventService.simulatedTime() === '19:00'" (click)="eventService.setSimulatedTime('19:00')">
              19:00 (Recepción)
            </button>
            <button class="btn-sim-pill" [class.active]="eventService.simulatedTime() === '19:45'" (click)="eventService.setSimulatedTime('19:45')">
              19:45 (Apertura)
            </button>
            <button class="btn-sim-pill" [class.active]="eventService.simulatedTime() === '20:30'" (click)="eventService.setSimulatedTime('20:30')">
              20:30 (Vals)
            </button>
            <button class="btn-sim-pill" [class.active]="eventService.simulatedTime() === '21:15'" (click)="eventService.setSimulatedTime('21:15')">
              21:15 (Cena)
            </button>
            <button class="btn-sim-pill" [class.active]="eventService.simulatedTime() === '22:30'" (click)="eventService.setSimulatedTime('22:30')">
              22:30 (DJ)
            </button>
            <button class="btn-sim-pill" [class.active]="eventService.simulatedTime() === '02:30'" (click)="eventService.setSimulatedTime('02:30')">
              02:30 (Finalizar)
            </button>
            <button class="btn-sim-reset" *ngIf="eventService.simulatedTime() !== null" (click)="eventService.setSimulatedTime(null)">
              ↺ Hora Real
            </button>
          </div>
        </div>
      </div>

      <!-- Header Card with Quick Add -->
      <div class="itinerary-header-card">
        <div class="itinerary-title-block">
          <div class="title-eyebrow">
            <span class="badge-tag">CRONOGRAMA &amp; CONTROL EN TIEMPO REAL</span>
            <span class="dot-sep">•</span>
            <span>{{ eventService.selectedEvent()?.eventType }}</span>
          </div>
          <h2>{{ eventService.selectedEvent()?.name }}</h2>
          <p>
            Anfitrión: <b>{{ eventService.selectedEvent()?.hostName }}</b> · 
            Recinto: <b>{{ eventService.selectedEvent()?.venueName }}</b>
          </p>
        </div>

        <div class="header-actions-row">
          <button class="btn-action" [disabled]="eventService.isEventLocked()" (click)="showAddModal.set(true)">
            <app-icon name="plus" [size]="16"></app-icon>
            <span>+ Agregar Momento al Itinerario</span>
          </button>
        </div>
      </div>

      <!-- Bulk Time Shift (Ajuste de Desfase en Bloque) Toolbar -->
      <div class="time-shift-card" [class.is-disabled]="eventService.isEventLocked()">
        <div class="shift-info-col">
          <div class="shift-title-row">
            <app-icon name="clock" [size]="18" class="shift-icon"></app-icon>
            <strong>Ajuste de Desfase en Bloque (Retraso o Adelanto de Agenda)</strong>
          </div>
          <p class="shift-desc">
            Si la ceremonia, cena o vals se retrasan, desplaza automáticamente todos los momentos en curso y futuros sin editar uno por uno.
          </p>
        </div>

        <div class="shift-actions-row">
          <div class="quick-shift-buttons">
            <button class="btn-shift-pill positive" [disabled]="eventService.isEventLocked()" (click)="applyTimeShift(15)">+15 min</button>
            <button class="btn-shift-pill positive" [disabled]="eventService.isEventLocked()" (click)="applyTimeShift(30)">+30 min</button>
            <button class="btn-shift-pill positive" [disabled]="eventService.isEventLocked()" (click)="applyTimeShift(45)">+45 min</button>
            <button class="btn-shift-pill negative" [disabled]="eventService.isEventLocked()" (click)="applyTimeShift(-15)">-15 min</button>
          </div>

          <div class="custom-shift-input-group">
            <input type="number" [(ngModel)]="customShiftMinutes" placeholder="± Minutos" class="shift-num-input" [disabled]="eventService.isEventLocked()">
            <button class="btn-outline btn-apply-shift" (click)="applyCustomShift()" [disabled]="!customShiftMinutes || eventService.isEventLocked()">
              Aplicar Desfase
            </button>
          </div>
        </div>
      </div>

      <!-- 3 Categorized Timeline Sections -->
      <div class="timeline-sections-grid">

        <!-- SECTION 1: LO QUE ESTÁ PASANDO AHORA (IN_PROGRESS) -->
        <div class="itinerary-column-card current-active-column">
          <div class="column-header-bar progress-header">
            <div class="beacon-pulse-wrap">
              <span class="beacon-dot"></span>
              <h3>LO QUE ESTÁ PASANDO AHORA</h3>
            </div>
            <span class="count-pill">{{ inProgressItems().length }}</span>
          </div>

          <div class="column-items-body">
            <div *ngIf="inProgressItems().length === 0" class="empty-column-box">
              <app-icon name="clock" [size]="24"></app-icon>
              <p>No hay ninguna actividad en curso actualmente.</p>
              <small>Inicia una actividad desde la sección "Lo que va a pasar".</small>
            </div>

            <div *ngFor="let item of inProgressItems()" class="active-spotlight-card">
              <div class="spotlight-top">
                <span class="spotlight-time">{{ item.time }} hrs</span>
                <span class="live-pill">EN VIVO</span>
              </div>
              <h4 class="spotlight-title">{{ item.title }}</h4>
              <p class="spotlight-desc">{{ item.description }}</p>
              
              <div class="spotlight-footer">
                <small *ngIf="item.location" class="loc-text">
                  <app-icon name="croquis" [size]="12"></app-icon>
                  {{ item.location }}
                </small>
                <div class="spotlight-actions">
                  <button class="btn-action btn-finish-now" [disabled]="eventService.isEventLocked()" (click)="eventService.toggleItineraryStatus(item.id)">
                    <app-icon name="check" [size]="14"></app-icon>
                    <span>Concluir Momento</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 2: LO QUE VA A PASAR (UPCOMING) -->
        <div class="itinerary-column-card upcoming-column">
          <div class="column-header-bar upcoming-header">
            <div class="beacon-pulse-wrap">
              <app-icon name="calendar" [size]="16"></app-icon>
              <h3>LO QUE VA A PASAR (PRÓXIMOS MOMENTOS)</h3>
            </div>
            <span class="count-pill">{{ upcomingItems().length }}</span>
          </div>

          <div class="column-items-body">
            <div *ngIf="upcomingItems().length === 0" class="empty-column-box">
              <app-icon name="check-circle" [size]="24"></app-icon>
              <p>No hay momentos próximos pendientes.</p>
              <small>Todos los hitos han sido completados o no se han programado aún.</small>
            </div>

            <div *ngFor="let item of upcomingItems()" class="milestone-row-card upcoming-card">
              <div class="card-time-col">
                <span class="time-text">{{ item.time }}</span>
                <small class="time-label">Programado</small>
              </div>

              <div class="card-details-col">
                <div class="card-title-row">
                  <strong>{{ item.title }}</strong>
                  <div class="item-action-btns">
                    <button class="btn-start-phase" [disabled]="eventService.isEventLocked()" (click)="eventService.toggleItineraryStatus(item.id)" title="Iniciar momento ahora">
                      <app-icon name="play" [size]="12"></app-icon>
                      <span>Iniciar</span>
                    </button>
                    <button class="btn-del-phase" [disabled]="eventService.isEventLocked()" (click)="eventService.deleteMilestone(item.id)" title="Eliminar de la agenda">
                      <app-icon name="trash" [size]="12"></app-icon>
                    </button>
                  </div>
                </div>
                <p class="card-desc">{{ item.description }}</p>
                <small *ngIf="item.location" class="loc-text">
                  <app-icon name="croquis" [size]="11"></app-icon>
                  {{ item.location }}
                </small>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 3: LO QUE YA PASÓ (COMPLETED) -->
        <div class="itinerary-column-card completed-column">
          <div class="column-header-bar completed-header">
            <div class="beacon-pulse-wrap">
              <app-icon name="check" [size]="16"></app-icon>
              <h3>LO QUE YA PASÓ (HITOS CONCLUIDOS)</h3>
            </div>
            <span class="count-pill">{{ completedItems().length }}</span>
          </div>

          <div class="column-items-body">
            <div *ngIf="completedItems().length === 0" class="empty-column-box">
              <app-icon name="history" [size]="24"></app-icon>
              <p>El evento aún no inicia actividades concluidas.</p>
            </div>

            <div *ngFor="let item of completedItems()" class="milestone-row-card completed-card">
              <div class="card-time-col">
                <span class="time-text text-muted">{{ item.time }}</span>
                <span class="done-tag">Concluido</span>
              </div>

              <div class="card-details-col">
                <div class="card-title-row">
                  <strong class="text-completed-title">{{ item.title }}</strong>
                  <button class="btn-reopen" [disabled]="eventService.isEventLocked()" (click)="eventService.toggleItineraryStatus(item.id)" title="Reabrir / Regresar a Próximo">
                    <span>Reabrir</span>
                  </button>
                </div>
                <p class="card-desc text-muted">{{ item.description }}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Add Milestone Modal -->
      <div *ngIf="showAddModal()" class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-header">
            <h3>Nuevo Hito en el Cronograma</h3>
            <button class="close-btn" (click)="showAddModal.set(false)">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="handleAddMilestone()">
            <div class="form-row">
              <div class="form-group">
                <label>Hora Programada (24 hrs)</label>
                <input type="text" [(ngModel)]="newMilestone.time" name="time" placeholder="Ej. 21:30" required>
              </div>
              <div class="form-group">
                <label>Fase Inicial</label>
                <select [(ngModel)]="newMilestone.status" name="status">
                  <option value="UPCOMING">Lo que va a pasar (Próximo)</option>
                  <option value="IN_PROGRESS">Lo que está pasando (En Curso)</option>
                  <option value="COMPLETED">Lo que ya pasó (Concluido)</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Título de la Actividad o Momento</label>
              <input type="text" [(ngModel)]="newMilestone.title" name="title" placeholder="Ej. Brindis con los Padrinos &amp; Entrada de Novios" required>
            </div>

            <div class="form-group">
              <label>Ubicación / Área del Recinto</label>
              <input type="text" [(ngModel)]="newMilestone.location" name="location" placeholder="Ej. Pista Central / Escenario">
            </div>

            <div class="form-group">
              <label>Descripción y Detalles Operativos</label>
              <textarea [(ngModel)]="newMilestone.description" name="description" rows="3" placeholder="Coordinación con DJ, fotógrafo y meseros para descorche."></textarea>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-outline" (click)="showAddModal.set(false)">Cancelar</button>
              <button type="submit" class="btn-action">Guardar en Itinerario</button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .itinerary-page-container {
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

    .btn-unlock-banner {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 16px;
      background: #1d4ed8;
      color: #ffffff;
      border: none;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
      box-shadow: 0 2px 6px rgba(29, 78, 216, 0.3);
    }
    .btn-unlock-banner:hover {
      background: #1e40af;
      transform: translateY(-1px);
    }

    /* Smart Real-Time Clock & Simulator Card */
    .smart-clock-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
      box-shadow: var(--shadow-sm);
    }

    .clock-info-col {
      flex: 1;
      min-width: 280px;
    }

    .clock-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
    }

    .live-pulse-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.6);
      animation: pulse 1.8s infinite;
    }

    .live-pulse-dot.is-simulated {
      background: #f59e0b;
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.6);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.15); }
    }

    .clock-display {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--text-main);
      font-family: monospace;
    }

    .clock-badge-tag {
      font-size: 0.68rem;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 4px;
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
    }

    .clock-badge-tag.badge-simulated {
      background: rgba(245, 158, 11, 0.15);
      color: #b45309;
    }

    .clock-desc {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin: 0;
    }

    .status-cue.pending { color: #d97706; font-weight: 700; }
    .status-cue.live { color: #059669; font-weight: 700; }
    .status-cue.done { color: #6b7280; font-weight: 700; }

    .clock-sim-actions-col {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .sim-label-text {
      font-size: 0.73rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .sim-buttons-flex {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }

    .btn-sim-pill {
      font-size: 0.74rem;
      font-weight: 700;
      padding: 5px 9px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-ui);
      background: var(--bg-main);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-sim-pill:hover {
      background: var(--bg-hover);
      color: var(--text-main);
      border-color: var(--brand-blue);
    }

    .btn-sim-pill.active {
      background: var(--brand-blue);
      color: #ffffff;
      border-color: var(--brand-blue);
      box-shadow: 0 0 8px rgba(2, 132, 199, 0.35);
    }

    .btn-sim-reset {
      font-size: 0.74rem;
      font-weight: 700;
      padding: 5px 10px;
      border-radius: var(--radius-sm);
      border: 1px dashed #ef4444;
      background: rgba(239, 68, 68, 0.08);
      color: #dc2626;
      cursor: pointer;
    }

    .btn-sim-reset:hover {
      background: #dc2626;
      color: #ffffff;
    }

    .time-shift-card.is-disabled {
      opacity: 0.55;
      pointer-events: none;
    }

    /* Header */
    .itinerary-header-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 22px 26px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      box-shadow: var(--shadow-sm);
    }

    .title-eyebrow {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.76rem;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    .badge-tag {
      background: var(--brand-blue-light);
      color: var(--brand-blue);
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
      letter-spacing: 0.5px;
    }

    .itinerary-title-block h2 {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .itinerary-title-block p {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 4px;
    }

    /* Bulk Time Shift Card */
    .time-shift-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
      box-shadow: var(--shadow-sm);
    }

    .shift-info-col {
      flex: 1;
      min-width: 280px;
    }

    .shift-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--brand-blue);
      font-size: 0.94rem;
    }

    .shift-title-row strong {
      color: var(--text-main);
    }

    .shift-desc {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-top: 4px;
      max-width: 620px;
    }

    .shift-actions-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .quick-shift-buttons {
      display: flex;
      gap: 6px;
    }

    .btn-shift-pill {
      padding: 6px 12px;
      border-radius: var(--radius-full);
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }

    .btn-shift-pill.positive {
      background: rgba(2, 132, 199, 0.1);
      color: #0284c7;
      border-color: rgba(2, 132, 199, 0.25);
    }

    .btn-shift-pill.positive:hover {
      background: #0284c7;
      color: #ffffff;
    }

    .btn-shift-pill.negative {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.25);
    }

    .btn-shift-pill.negative:hover {
      background: #ef4444;
      color: #ffffff;
    }

    .custom-shift-input-group {
      display: flex;
      gap: 6px;
    }

    .shift-num-input {
      width: 90px;
      padding: 6px 10px;
      font-size: 0.82rem;
      text-align: center;
    }

    .btn-apply-shift {
      padding: 6px 12px;
      font-size: 0.82rem;
      white-space: nowrap;
    }

    /* 3 Categorized Columns */
    .timeline-sections-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      align-items: start;
    }

    .itinerary-column-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: var(--shadow-sm);
    }

    .column-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-ui);
    }

    .beacon-pulse-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .beacon-pulse-wrap h3 {
      font-size: 0.82rem;
      font-weight: 800;
      letter-spacing: 0.6px;
      color: var(--text-main);
    }

    .beacon-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: pulseBeacon 1.4s infinite ease-in-out;
    }

    @keyframes pulseBeacon {
      0% { transform: scale(0.9); opacity: 0.7; }
      50% { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0.7; }
    }

    .count-pill {
      font-size: 0.74rem;
      font-weight: 800;
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      padding: 2px 8px;
      border-radius: var(--radius-full);
      color: var(--text-muted);
    }

    .column-items-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 200px;
    }

    .empty-column-box {
      text-align: center;
      padding: 30px 16px;
      background: var(--bg-input);
      border: 1px dashed var(--border-ui);
      border-radius: var(--radius-md);
      color: var(--text-muted);
    }

    .empty-column-box p {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 8px 0 2px;
    }

    .empty-column-box small {
      font-size: 0.74rem;
    }

    /* Active Spotlight Card */
    .active-spotlight-card {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(2, 132, 199, 0.08) 100%);
      border: 2px solid #10b981;
      border-radius: var(--radius-md);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.15);
    }

    .spotlight-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .spotlight-time {
      font-size: 1.15rem;
      font-weight: 900;
      color: #047857;
    }

    [data-theme="dark"] .spotlight-time {
      color: #34d399;
    }

    .live-pill {
      background: #10b981;
      color: #ffffff;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      letter-spacing: 0.5px;
    }

    .spotlight-title {
      font-size: 1rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .spotlight-desc {
      font-size: 0.84rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .spotlight-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 6px;
      padding-top: 10px;
      border-top: 1px solid rgba(16, 185, 129, 0.2);
    }

    .btn-finish-now {
      padding: 6px 14px;
      font-size: 0.8rem;
      background: #10b981;
      border: none;
    }

    .btn-finish-now:hover {
      background: #059669;
    }

    /* Milestone Row Cards */
    .milestone-row-card {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      padding: 12px 14px;
      display: flex;
      gap: 14px;
      align-items: flex-start;
      transition: all 0.2s ease;
    }

    .card-time-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      min-width: 58px;
    }

    .time-text {
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .time-label {
      font-size: 0.65rem;
      color: var(--text-muted);
    }

    .card-details-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .card-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }

    .card-title-row strong {
      font-size: 0.88rem;
      color: var(--text-main);
    }

    .item-action-btns {
      display: flex;
      gap: 4px;
    }

    .btn-start-phase {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 700;
      background: var(--brand-blue-light);
      color: var(--brand-blue);
      border: 1px solid rgba(2, 132, 199, 0.25);
      cursor: pointer;
    }

    .btn-start-phase:hover {
      background: var(--brand-blue);
      color: #ffffff;
    }

    .btn-del-phase {
      padding: 3px 6px;
      border-radius: 4px;
      color: var(--text-muted);
      cursor: pointer;
    }

    .btn-del-phase:hover {
      color: #ef4444;
      background: #fee2e2;
    }

    .card-desc {
      font-size: 0.8rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .loc-text {
      font-size: 0.72rem;
      color: var(--brand-blue);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    /* Completed items */
    .completed-card {
      opacity: 0.85;
    }

    .done-tag {
      font-size: 0.64rem;
      font-weight: 800;
      color: #047857;
      background: #ecfdf5;
      padding: 1px 5px;
      border-radius: 3px;
    }

    .text-completed-title {
      text-decoration: line-through;
      color: var(--text-muted) !important;
    }

    .btn-reopen {
      font-size: 0.7rem;
      color: var(--text-muted);
      background: none;
      border: none;
      cursor: pointer;
      text-decoration: underline;
    }

    /* Modal Form */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: grid;
      place-items: center;
      padding: 20px;
    }

    .modal-box {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 24px;
      width: 100%;
      max-width: 520px;
      box-shadow: var(--shadow-hover);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-ui);
      padding-bottom: 12px;
    }

    .close-btn {
      font-size: 1.2rem;
      color: var(--text-muted);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-bottom: 12px;
    }

    .form-group label {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      border-top: 1px solid var(--border-ui);
      padding-top: 14px;
    }

    @media (max-width: 1024px) {
      .timeline-sections-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ItineraryComponent {
  showAddModal = signal(false);
  customShiftMinutes: number | null = null;

  newMilestone: Partial<ItineraryItem> = {
    time: '21:00',
    title: '',
    description: '',
    location: '',
    status: 'UPCOMING'
  };

  // 3 Categorized computed slices
  inProgressItems = computed<ItineraryItem[]>(() => {
    return this.eventService.eventItinerary().filter(i => i.status === 'IN_PROGRESS');
  });

  upcomingItems = computed<ItineraryItem[]>(() => {
    return this.eventService.eventItinerary().filter(i => i.status === 'UPCOMING');
  });

  completedItems = computed<ItineraryItem[]>(() => {
    return this.eventService.eventItinerary().filter(i => i.status === 'COMPLETED');
  });

  constructor(
    public eventService: EventService,
    private notificationService: NotificationService
  ) {}

  applyTimeShift(minutes: number): void {
    this.eventService.shiftItineraryTimes(minutes);
  }

  applyCustomShift(): void {
    if (this.customShiftMinutes) {
      this.eventService.shiftItineraryTimes(this.customShiftMinutes);
      this.customShiftMinutes = null;
    }
  }

  handleAddMilestone(): void {
    if (!this.newMilestone.title || !this.newMilestone.time) {
      this.notificationService.show('warning', 'Campos Requeridos', 'Indica la hora y título del hito.');
      return;
    }

    this.eventService.addMilestone({
      time: this.newMilestone.time,
      title: this.newMilestone.title,
      description: this.newMilestone.description || '',
      location: this.newMilestone.location || '',
      status: this.newMilestone.status as any || 'UPCOMING'
    });

    this.showAddModal.set(false);
    this.newMilestone = { time: '21:00', title: '', description: '', location: '', status: 'UPCOMING' };
  }
}
