import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { EventService } from '../../services/event.service';
import { NotificationService } from '../../services/notification.service';
import { IconComponent } from '../icon.component';
import { EventItem, Guest, Salon, SalonTable } from '../../models/models';

@Component({
  selector: 'app-public-invitation',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="pub-inv-shell">
      <div class="pub-topbar">
        <div class="pub-brand">
          <span class="pub-logo-mark">EP</span>
          <span>EvenPass Digital</span>
        </div>
        <div class="live-sync-chip">
          <span class="live-dot"></span>
          <span>Sincronización en vivo</span>
        </div>
      </div>

      <ng-container *ngIf="currentEvent() as ev; else loadingTpl">
        <!-- Hero Card -->
        <header class="inv-hero-card">
          <div class="inv-type-pill">{{ ev.eventType }} · {{ ev.tierPlan }}</div>
          <h1>{{ ev.name }}</h1>
          <p class="inv-host">Anfitrión: <strong>{{ ev.hostName }}</strong></p>
          <p class="inv-desc" *ngIf="ev.description">{{ ev.description }}</p>

          <div class="inv-meta-grid">
            <div class="inv-meta-item">
              <app-icon name="calendar" [size]="16"></app-icon>
              <div>
                <small>FECHA Y HORA</small>
                <strong>{{ ev.eventDate | date:'mediumDate' }} · {{ ev.eventDate | date:'shortTime' }}</strong>
              </div>
            </div>
            <div class="inv-meta-item">
              <app-icon name="map-pin" [size]="16"></app-icon>
              <div>
                <small>RECINTO</small>
                <strong>{{ ev.venueName }}</strong>
                <span class="addr-sub">{{ ev.locationAddress }}</span>
              </div>
            </div>
          </div>

          <div class="capacity-meter-bar">
            <div class="cap-label-row">
              <span>Lugares confirmados del evento</span>
              <strong>{{ totalCommittedPasses() }} / {{ ev.maxCapacity }} pases</strong>
            </div>
            <div class="cap-track">
              <div class="cap-fill" [style.width.%]="capacityPercent()"></div>
            </div>
          </div>
        </header>

        <!-- Active Pass Card (when token / guest matched) -->
        <section *ngIf="activeGuest() as g" class="inv-card pass-highlight-card">
          <div class="card-head-row">
            <div>
              <span class="micro-badge">PASE DIGITAL PERSONALIZADO</span>
              <h2>{{ g.fullName }}</h2>
            </div>
            <span class="status-pill" [ngClass]="'st-' + g.status.toLowerCase()">
              {{ formatGuestStatus(g.status) }}
            </span>
          </div>

          <div class="pass-kpi-grid">
            <div class="kpi-tile">
              <small>PASES AUTORIZADOS</small>
              <strong>{{ g.totalPasses }} lugar{{ g.totalPasses > 1 ? 'es' : '' }}</strong>
            </div>
            <div class="kpi-tile">
              <small>MESA ASIGNADA</small>
              <strong class="table-highlight">
                {{ ev.hasCroquis ? (g.assignedTableName || 'Por asignar') : 'Acceso General' }}
              </strong>
            </div>
            <div class="kpi-tile">
              <small>FOLIO QR</small>
              <code>{{ g.qrCodeToken }}</code>
            </div>
          </div>

          <div class="qr-box-wrap" *ngIf="ev.hasScanner; else basicPassNotice">
            <div class="qr-card-visual">
              <div class="qr-corner tl"></div>
              <div class="qr-corner tr"></div>
              <div class="qr-corner bl"></div>
              <div class="qr-token-text">{{ g.qrCodeToken }}</div>
            </div>
            <p class="qr-note">
              Presenta este folio QR al llegar al recinto. Si tu mesa cambia en tiempo real, se reflejará aquí automáticamente.
            </p>
          </div>
          <ng-template #basicPassNotice>
            <p class="qr-note">
              Registro confirmado en lista oficial del evento. Presenta tu nombre y folio <b>{{ g.qrCodeToken }}</b> en recepción.
            </p>
          </ng-template>

          <!-- Live CAD Table Mini-Map when plan includes Croquis -->
          <div *ngIf="ev.hasCroquis && currentSalon() as salon" class="live-croquis-box">
            <div class="croquis-box-head">
              <strong>Tu Ubicación en {{ salon.name }}</strong>
              <span>Mesa destacada: <b>{{ g.assignedTableName || 'Pendiente de asignar' }}</b></span>
            </div>

            <div class="svg-map-wrap">
              <svg viewBox="0 0 600 860" class="live-croquis-svg" xmlns="http://www.w3.org/2000/svg">
                <image
                  *ngIf="salon.customCroquisUrl"
                  [attr.href]="salon.customCroquisUrl"
                  x="20"
                  y="20"
                  width="560"
                  height="820"
                  preserveAspectRatio="xMidYMid meet"
                  opacity="0.35"
                />
                <rect x="20" y="20" width="560" height="820" fill="none" stroke="#94a3b8" stroke-width="2" />
                <g *ngFor="let tbl of salon.tables">
                  <circle
                    *ngIf="tbl.shape === 'ROUND'"
                    [attr.cx]="tbl.posX"
                    [attr.cy]="tbl.posY"
                    r="26"
                    [attr.fill]="isGuestTable(tbl, g) ? '#0284c7' : '#f1f5f9'"
                    [attr.stroke]="isGuestTable(tbl, g) ? '#0369a1' : '#94a3b8'"
                    [attr.stroke-width]="isGuestTable(tbl, g) ? '3' : '1.5'"
                  />
                  <rect
                    *ngIf="tbl.shape === 'RECTANGULAR'"
                    [attr.x]="tbl.posX - 34"
                    [attr.y]="tbl.posY - 20"
                    width="68"
                    height="40"
                    rx="6"
                    [attr.fill]="isGuestTable(tbl, g) ? '#0284c7' : '#f1f5f9'"
                    [attr.stroke]="isGuestTable(tbl, g) ? '#0369a1' : '#94a3b8'"
                    [attr.stroke-width]="isGuestTable(tbl, g) ? '3' : '1.5'"
                  />
                  <text
                    [attr.x]="tbl.posX"
                    [attr.y]="tbl.posY + 4"
                    text-anchor="middle"
                    font-size="9.5"
                    font-weight="800"
                    [attr.fill]="isGuestTable(tbl, g) ? '#ffffff' : '#334155'"
                  >
                    {{ shortTableLabel(tbl.tableName) }}
                  </text>
                  <g *ngIf="isGuestTable(tbl, g)">
                    <circle [attr.cx]="tbl.posX" [attr.cy]="tbl.posY" r="36" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="4,3" />
                    <rect [attr.x]="tbl.posX - 42" [attr.y]="tbl.posY - 46" width="84" height="18" rx="4" fill="#0284c7" />
                    <text [attr.x]="tbl.posX" [attr.y]="tbl.posY - 34" text-anchor="middle" font-size="8.5" font-weight="800" fill="#ffffff">
                      TU MESA
                    </text>
                  </g>
                </g>
              </svg>
            </div>
          </div>

          <div class="pass-actions-row">
            <button type="button" class="btn-outline-clean" (click)="clearSelectedGuest()">
              Cambiar o buscar otro pase
            </button>
          </div>
        </section>

        <!-- Pass / Guest Lookup Card -->
        <section class="inv-card">
          <div class="card-head-row">
            <div>
              <h3>Consultar tu Pase o Mesa Asignada</h3>
              <p class="sub-hint">Busca por nombre completo o folio QR para ver tu lugar actualizado al instante.</p>
            </div>
          </div>
          <div class="lookup-row">
            <input
              type="text"
              [(ngModel)]="lookupQuery"
              placeholder="Ej. Mario o EP-3910..."
              (keyup.enter)="searchPass()"
            />
            <button type="button" class="btn-primary-clean" (click)="searchPass()">
              <app-icon name="search" [size]="15"></app-icon>
              <span>Buscar Pase</span>
            </button>
          </div>
          <p *ngIf="lookupMessage()" class="lookup-msg">{{ lookupMessage() }}</p>
        </section>

        <!-- Interactive RSVP Form -->
        <section class="inv-card">
          <div class="card-head-row">
            <div>
              <h3>Confirmar Asistencia (RSVP)</h3>
              <p class="sub-hint">Tu confirmación se sincroniza automáticamente con EvenPass OS y el Panel del Anfitrión.</p>
            </div>
          </div>

          <div *ngIf="isEventAtCapacity()" class="capacity-full-alert">
            <app-icon name="alert-triangle" [size]="18"></app-icon>
            <span>El evento ha alcanzado su límite máximo de aforo ({{ ev.maxCapacity }} pases).</span>
          </div>

          <form *ngIf="!isEventAtCapacity()" (ngSubmit)="submitRsvp()" class="rsvp-form-grid">
            <div class="field">
              <label>Nombre completo</label>
              <input type="text" [(ngModel)]="rsvpForm.fullName" name="fullName" placeholder="Ej. Valeria Montes" required />
            </div>

            <div class="field-row">
              <div class="field">
                <label>Teléfono (WhatsApp)</label>
                <input type="text" [(ngModel)]="rsvpForm.phone" name="phone" placeholder="667 123 4567" />
              </div>
              <div class="field">
                <label>Acompañantes extras</label>
                <input type="number" [(ngModel)]="rsvpForm.numCompanions" name="numCompanions" min="0" max="10" />
              </div>
            </div>

            <div class="field-row">
              <div class="field">
                <label>Correo electrónico</label>
                <input type="email" [(ngModel)]="rsvpForm.email" name="email" placeholder="correo@ejemplo.com" />
              </div>
              <div class="field">
                <label>Confirmación</label>
                <select [(ngModel)]="rsvpForm.status" name="status">
                  <option value="CONFIRMED">Sí, asistiré</option>
                  <option value="DECLINED">No podré asistir</option>
                </select>
              </div>
            </div>

            <div class="field">
              <label>Mensaje o nota dietética (opcional)</label>
              <input type="text" [(ngModel)]="rsvpForm.dietNotes" name="dietNotes" placeholder="Alergias, felicitación, etc." />
            </div>

            <button type="submit" class="btn-primary-clean btn-full">
              <app-icon name="check-circle" [size]="16"></app-icon>
              <span>Enviar Confirmación en Vivo</span>
            </button>
          </form>
        </section>

        <!-- Itinerary Section -->
        <section *ngIf="ev.itinerary && ev.itinerary.length > 0" class="inv-card">
          <h3>Programa del Evento</h3>
          <div class="itinerary-list">
            <div *ngFor="let item of ev.itinerary" class="it-row">
              <span class="it-time">{{ item.time }}</span>
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.description }} · <em>{{ item.location }}</em></p>
              </div>
            </div>
          </div>
        </section>
      </ng-container>

      <ng-template #loadingTpl>
        <div class="inv-card empty-state-card">
          <app-icon name="clock" [size]="28"></app-icon>
          <h3>Conectando con la invitación en vivo...</h3>
          <p>Esperando datos sincronizados del evento solicitado.</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .pub-inv-shell {
      min-height: 100vh;
      background: #f8fafc;
      color: #0f172a;
      padding: 20px 16px 48px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    }

    .pub-topbar, .inv-hero-card, .inv-card {
      width: min(760px, 100%);
    }

    .pub-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .pub-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
      font-size: 0.95rem;
    }

    .pub-logo-mark {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: #0284c7;
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 0.8rem;
      font-weight: 900;
    }

    .live-sync-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 5px 12px;
      border-radius: 999px;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      font-size: 0.76rem;
      font-weight: 700;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      animation: pulse-live 1.8s infinite;
    }

    @keyframes pulse-live {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.25); }
    }

    .inv-hero-card, .inv-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      padding: 24px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
    }

    .inv-hero-card {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
      color: #ffffff;
      border: none;
    }

    .inv-type-pill {
      display: inline-block;
      background: rgba(255, 255, 255, 0.14);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 0.74rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }

    .inv-hero-card h1 {
      margin: 0 0 6px;
      font-size: 1.75rem;
      font-weight: 800;
    }

    .inv-host { margin: 0 0 8px; color: #cbd5e1; font-size: 0.92rem; }
    .inv-desc { margin: 0 0 18px; color: #e2e8f0; font-size: 0.9rem; line-height: 1.45; }

    .inv-meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }

    .inv-meta-item {
      display: flex;
      gap: 10px;
      background: rgba(255, 255, 255, 0.08);
      padding: 12px;
      border-radius: 12px;
    }

    .inv-meta-item small { display: block; font-size: 0.68rem; color: #93c5fd; font-weight: 700; }
    .inv-meta-item strong { display: block; font-size: 0.9rem; }
    .addr-sub { display: block; font-size: 0.78rem; color: #cbd5e1; margin-top: 2px; }

    .cap-label-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.78rem;
      color: #cbd5e1;
      margin-bottom: 6px;
    }

    .cap-track {
      height: 8px;
      background: rgba(255, 255, 255, 0.16);
      border-radius: 999px;
      overflow: hidden;
    }

    .cap-fill {
      height: 100%;
      background: #38bdf8;
      border-radius: 999px;
      transition: width 0.3s ease;
    }

    .pass-highlight-card {
      border: 2px solid #0284c7;
    }

    .card-head-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 14px;
    }

    .card-head-row h2, .card-head-row h3, .inv-card h3 {
      margin: 0;
      font-weight: 800;
    }

    .micro-badge {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 800;
      color: #0284c7;
      letter-spacing: 0.6px;
      margin-bottom: 4px;
    }

    .sub-hint {
      margin: 4px 0 0;
      font-size: 0.84rem;
      color: #64748b;
    }

    .status-pill {
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 800;
    }
    .st-confirmed, .st-attended { background: #ecfdf5; color: #059669; }
    .st-pending { background: #fffbeb; color: #d97706; }
    .st-declined { background: #fef2f2; color: #dc2626; }

    .pass-kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }

    .kpi-tile {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px;
    }
    .kpi-tile small { display: block; font-size: 0.68rem; font-weight: 700; color: #64748b; margin-bottom: 4px; }
    .kpi-tile strong, .kpi-tile code { font-size: 0.95rem; font-weight: 800; }
    .table-highlight { color: #0284c7; }

    .qr-box-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 16px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      margin-bottom: 16px;
    }

    .qr-card-visual {
      width: 132px;
      height: 132px;
      background: #fff;
      border: 3px solid #0f172a;
      border-radius: 10px;
      position: relative;
      display: grid;
      place-items: center;
    }

    .qr-corner { position: absolute; width: 20px; height: 20px; border: 3px solid #0f172a; }
    .tl { top: 8px; left: 8px; }
    .tr { top: 8px; right: 8px; }
    .bl { bottom: 8px; left: 8px; }
    .qr-token-text { font-family: monospace; font-weight: 800; font-size: 0.95rem; background: #e2e8f0; padding: 4px 6px; border-radius: 4px; }
    .qr-note { font-size: 0.82rem; color: #475569; text-align: center; margin: 0; }

    .live-croquis-box {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 14px;
    }

    .croquis-box-head {
      background: #f1f5f9;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 0.82rem;
    }

    .svg-map-wrap {
      padding: 10px;
      background: #fff;
      display: flex;
      justify-content: center;
    }

    .live-croquis-svg {
      width: 100%;
      max-height: 400px;
    }

    .lookup-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .lookup-row input {
      flex: 1;
      min-width: 200px;
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 0.92rem;
    }

    .lookup-msg {
      margin: 10px 0 0;
      font-size: 0.84rem;
      color: #b45309;
      font-weight: 600;
    }

    .rsvp-form-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .field-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .field label {
      display: block;
      font-size: 0.78rem;
      font-weight: 700;
      color: #334155;
      margin-bottom: 5px;
    }

    .field input, .field select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 0.9rem;
      box-sizing: border-box;
    }

    .btn-primary-clean {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #0284c7;
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 11px 18px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
    }

    .btn-outline-clean {
      background: #fff;
      color: #334155;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 9px 14px;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
    }

    .btn-full { width: 100%; }

    .capacity-full-alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 10px;
      background: #fef2f2;
      color: #b91c1c;
      font-weight: 700;
      font-size: 0.88rem;
    }

    .itinerary-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 12px;
    }

    .it-row {
      display: flex;
      gap: 14px;
      padding: 10px 12px;
      background: #f8fafc;
      border-radius: 10px;
    }

    .it-time {
      font-weight: 800;
      color: #0284c7;
      min-width: 52px;
    }

    .it-row p { margin: 2px 0 0; font-size: 0.82rem; color: #475569; }

    .empty-state-card {
      text-align: center;
      padding: 48px 24px;
      color: #475569;
    }

    @media (max-width: 600px) {
      .field-row { grid-template-columns: 1fr; }
    }
  `]
})
export class PublicInvitationComponent implements OnInit {
  targetEventId = signal<number | null>(null);
  targetToken = signal<string | null>(null);
  selectedGuestId = signal<number | null>(null);
  lookupQuery = '';
  lookupMessage = signal('');

  rsvpForm: Partial<Guest> = {
    fullName: '',
    phone: '',
    email: '',
    numCompanions: 0,
    status: 'CONFIRMED',
    dietNotes: ''
  };

  currentEvent = computed<EventItem | undefined>(() => {
    const id = this.targetEventId();
    const list = this.eventService.events();
    if (id != null) {
      return list.find(e => e.id === id) || list[0];
    }
    const token = this.targetToken();
    if (token) {
      const matched = this.eventService.allGuests().find(g => g.qrCodeToken.toUpperCase() === token.toUpperCase());
      if (matched) {
        return list.find(e => e.id === matched.eventId) || list[0];
      }
    }
    return this.eventService.selectedEvent() || list[0];
  });

  eventGuests = computed<Guest[]>(() => {
    const ev = this.currentEvent();
    if (!ev) return [];
    return this.eventService.allGuests().filter(g => g.eventId === ev.id);
  });

  currentSalon = computed<Salon | undefined>(() => {
    const ev = this.currentEvent();
    if (!ev || !ev.hasCroquis || !ev.salonId) return undefined;
    return this.eventService.salons().find(s => s.id === ev.salonId);
  });

  activeGuest = computed<Guest | undefined>(() => {
    const gid = this.selectedGuestId();
    if (gid != null) {
      return this.eventGuests().find(g => g.id === gid);
    }
    const token = this.targetToken();
    if (token) {
      return this.eventGuests().find(g => g.qrCodeToken.toUpperCase() === token.toUpperCase());
    }
    return undefined;
  });

  totalCommittedPasses = computed<number>(() => {
    return this.eventGuests()
      .filter(g => g.status !== 'DECLINED')
      .reduce((sum, g) => sum + (g.totalPasses || 1), 0);
  });

  capacityPercent = computed<number>(() => {
    const ev = this.currentEvent();
    const cap = ev?.maxCapacity || 1;
    return Math.min(100, Math.round((this.totalCommittedPasses() / cap) * 100));
  });

  isEventAtCapacity = computed<boolean>(() => {
    const ev = this.currentEvent();
    if (!ev) return false;
    return this.totalCommittedPasses() >= ev.maxCapacity;
  });

  constructor(
    public eventService: EventService,
    private notificationService: NotificationService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const evParam = params.get('eventId');
      const tokenParam = params.get('token');
      if (evParam && !isNaN(Number(evParam))) {
        const evId = Number(evParam);
        this.targetEventId.set(evId);
        this.eventService.selectEvent(evId);
        this.eventService.requestCloudFullState(evId);
      }
      if (tokenParam) {
        this.targetToken.set(tokenParam.trim());
      }
    });

    this.route.queryParamMap.subscribe(q => {
      const cfg = q.get('cfg');
      if (cfg) {
        const hydratedId = this.eventService.hydrateFromCompactConfig(cfg, true);
        if (hydratedId) {
          this.targetEventId.set(hydratedId);
          this.eventService.requestCloudFullState(hydratedId);
        }
      }
      const qEv = q.get('eventId');
      if (qEv && !isNaN(Number(qEv))) {
        const evId = Number(qEv);
        this.targetEventId.set(evId);
        this.eventService.selectEvent(evId);
        this.eventService.requestCloudFullState(evId);
      }
      const qToken = q.get('token');
      if (qToken) {
        this.targetToken.set(qToken.trim());
      }
    });
  }

  searchPass(): void {
    const q = this.lookupQuery.trim().toLowerCase();
    this.lookupMessage.set('');
    if (!q) return;
    const match = this.eventGuests().find(g =>
      g.qrCodeToken.toLowerCase() === q ||
      g.fullName.toLowerCase().includes(q)
    );
    if (match) {
      this.selectedGuestId.set(match.id);
    } else {
      this.lookupMessage.set('No se encontró ningún invitado con ese nombre o folio QR en este evento.');
    }
  }

  clearSelectedGuest(): void {
    this.selectedGuestId.set(null);
    this.targetToken.set(null);
  }

  submitRsvp(): void {
    const ev = this.currentEvent();
    if (!ev || !this.rsvpForm.fullName?.trim()) return;
    this.eventService.selectEvent(ev.id);

    const beforeCount = this.eventGuests().length;
    this.eventService.addGuest({
      fullName: this.rsvpForm.fullName.trim(),
      phone: this.rsvpForm.phone?.trim() || '',
      email: this.rsvpForm.email?.trim() || '',
      numCompanions: Number(this.rsvpForm.numCompanions) || 0,
      status: this.rsvpForm.status || 'CONFIRMED',
      dietNotes: this.rsvpForm.dietNotes?.trim() || ''
    });

    const latestGuests = this.eventGuests();
    if (latestGuests.length > beforeCount) {
      const created = latestGuests.find(
        g => g.fullName.toLowerCase() === this.rsvpForm.fullName!.trim().toLowerCase()
      );
      if (created) {
        this.selectedGuestId.set(created.id);
      }
      this.rsvpForm = {
        fullName: '',
        phone: '',
        email: '',
        numCompanions: 0,
        status: 'CONFIRMED',
        dietNotes: ''
      };
      this.notificationService.show('success', 'Confirmación Registrada', 'Tu pase digital ha sido generado y sincronizado.');
    }
  }

  isGuestTable(table: SalonTable, guest: Guest): boolean {
    if (guest.assignedTableId != null && Number(guest.assignedTableId) === Number(table.id)) {
      return true;
    }
    if (guest.assignedTableName) {
      const a = guest.assignedTableName.toLowerCase().trim();
      const b = table.tableName.toLowerCase().trim();
      if (a === b) return true;
      const rx = new RegExp(`\\b(mesa|table)\\s*0*${table.tableNumber}\\b`, 'i');
      return rx.test(a);
    }
    return false;
  }

  shortTableLabel(name: string): string {
    if (!name) return '';
    return name.length > 14 ? name.slice(0, 12) + '..' : name;
  }

  formatGuestStatus(status: Guest['status']): string {
    switch (status) {
      case 'ATTENDED': return 'En el Salón';
      case 'CONFIRMED': return 'Confirmado';
      case 'DECLINED': return 'No Asistirá';
      default: return 'Pendiente';
    }
  }
}
