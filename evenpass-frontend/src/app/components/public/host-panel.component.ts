import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { EventService } from '../../services/event.service';
import { NotificationService } from '../../services/notification.service';
import { IconComponent } from '../icon.component';
import { EventItem, Guest, Salon, SalonTable } from '../../models/models';

@Component({
  selector: 'app-host-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="host-shell">
      <header class="host-topbar">
        <div class="host-brand">
          <span class="host-logo">EP</span>
          <div>
            <strong>Panel del Anfitrión · EvenPass</strong>
            <small>Control bidireccional automático en vivo</small>
          </div>
        </div>
        <div class="topbar-right">
          <span class="live-badge">
            <span class="live-dot"></span>
            <span>Sincronización automática activa</span>
          </span>
        </div>
      </header>

      <ng-container *ngIf="currentEvent() as ev; else emptyHostTpl">
        <!-- Event Overview Banner -->
        <section class="host-hero">
          <div class="hero-left">
            <div class="plan-chip-row">
              <span class="plan-chip">{{ ev.tierPlan }}</span>
              <span class="plan-chip" *ngIf="ev.hasCroquis">Croquis Activo</span>
              <span class="plan-chip" *ngIf="ev.hasScanner">Escáner QR Activo</span>
            </div>
            <h1>{{ ev.name }}</h1>
            <p>
              Anfitrión: <strong>{{ ev.hostName }}</strong> ·
              {{ ev.venueName }} ·
              {{ ev.eventDate | date:'mediumDate' }} {{ ev.eventDate | date:'shortTime' }}
            </p>
          </div>

          <div class="hero-actions">
            <button type="button" class="btn-ghost" (click)="copyPublicInviteLink()">
              <app-icon name="copy" [size]="14"></app-icon>
              <span>Copiar Link de Invitación</span>
            </button>
            <button type="button" class="btn-solid" (click)="openPublicInvite()">
              <app-icon name="external-link" [size]="14"></app-icon>
              <span>Ver Invitación Pública</span>
            </button>
            <button
              *ngIf="ev.externalInvitationUrl"
              type="button"
              class="btn-ghost"
              (click)="openExternalPanel()"
            >
              <app-icon name="external-link" [size]="14"></app-icon>
              <span>Abrir Web Externa</span>
            </button>
          </div>
        </section>

        <!-- KPI Strip -->
        <section class="kpi-grid">
          <div class="kpi-card">
            <small>INVITADOS REGISTRADOS</small>
            <strong>{{ eventGuests().length }}</strong>
          </div>
          <div class="kpi-card">
            <small>PASES COMPROMETIDOS / AFORO</small>
            <strong>{{ totalCommittedPasses() }} / {{ ev.maxCapacity }}</strong>
          </div>
          <div class="kpi-card">
            <small>INGRESADOS EN PUERTA</small>
            <strong>{{ totalAttended() }}</strong>
          </div>
          <div class="kpi-card">
            <small>{{ ev.hasCroquis ? 'MESAS EN CROQUIS' : 'MODO DE ACCESO' }}</small>
            <strong>{{ ev.hasCroquis ? (currentSalon()?.tables?.length || 0) : 'Lista General' }}</strong>
          </div>
        </section>

        <!-- Main Workspace Grid -->
        <div class="workspace-columns" [class.single-col]="!ev.hasCroquis">
          <!-- Left Column: Guest Management -->
          <section class="panel-card">
            <div class="panel-head">
              <div>
                <h2>Gestión de Invitados</h2>
                <p>Agrega, edita o reasigna mesas; todo se refleja al instante en EvenPass OS y pases QR.</p>
              </div>
              <button type="button" class="btn-primary" (click)="showAddModal.set(true)">
                <app-icon name="plus" [size]="15"></app-icon>
                <span>Agregar Invitado</span>
              </button>
            </div>

            <div class="filter-bar">
              <div class="search-wrap">
                <app-icon name="search" [size]="15"></app-icon>
                <input type="text" [(ngModel)]="searchQuery" placeholder="Buscar por nombre, teléfono o folio..." />
              </div>
              <div class="status-tabs">
                <button type="button" [class.active]="statusFilter() === 'ALL'" (click)="statusFilter.set('ALL')">Todos</button>
                <button type="button" [class.active]="statusFilter() === 'CONFIRMED'" (click)="statusFilter.set('CONFIRMED')">Confirmados</button>
                <button type="button" [class.active]="statusFilter() === 'PENDING'" (click)="statusFilter.set('PENDING')">Pendientes</button>
                <button type="button" [class.active]="statusFilter() === 'ATTENDED'" (click)="statusFilter.set('ATTENDED')">En Puerta</button>
              </div>
            </div>

            <div class="table-scroll">
              <table class="host-table">
                <thead>
                  <tr>
                    <th>Invitado</th>
                    <th>Pases</th>
                    <th>Estado</th>
                    <th>Mesa</th>
                    <th style="text-align: right;">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let g of filteredGuests()">
                    <td>
                      <div class="guest-name">{{ g.fullName }}</div>
                      <small class="guest-sub">{{ g.phone || g.email || g.qrCodeToken }}</small>
                    </td>
                    <td>
                      <span class="passes-tag">{{ g.totalPasses }}p</span>
                    </td>
                    <td>
                      <span class="st-pill" [ngClass]="'st-' + g.status.toLowerCase()">
                        {{ formatStatus(g.status) }}
                      </span>
                    </td>
                    <td>
                      <ng-container *ngIf="ev.hasCroquis && currentSalon()?.tables?.length; else noCroquisTbl">
                        <select
                          class="tbl-select"
                          [ngModel]="g.assignedTableId || 'UNASSIGNED'"
                          (ngModelChange)="assignTable(g, $event)"
                        >
                          <option value="UNASSIGNED">Sin mesa</option>
                          <option *ngFor="let t of currentSalon()!.tables" [value]="t.id">
                            {{ t.tableName }} ({{ t.occupiedSeats }}/{{ t.capacity }}p)
                          </option>
                        </select>
                      </ng-container>
                      <ng-template #noCroquisTbl>
                        <span class="muted-label">Acceso General</span>
                      </ng-template>
                    </td>
                    <td style="text-align: right;">
                      <div class="row-actions">
                        <button type="button" class="icon-btn" (click)="sendWhatsApp(g)" title="Enviar invitación por WhatsApp">
                          <app-icon name="message" [size]="14"></app-icon>
                        </button>
                        <button type="button" class="icon-btn" (click)="copyGuestInviteLink(g)" title="Copiar enlace del pase">
                          <app-icon name="copy" [size]="14"></app-icon>
                        </button>
                        <button type="button" class="icon-btn" (click)="openEditGuest(g)" title="Editar invitado">
                          <app-icon name="edit" [size]="14"></app-icon>
                        </button>
                        <button type="button" class="icon-btn danger" (click)="deleteGuest(g)" title="Eliminar invitado">
                          <app-icon name="trash" [size]="14"></app-icon>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="filteredGuests().length === 0">
                    <td colspan="5" class="empty-row">No hay invitados con este filtro.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Right Column: Tables & Live Croquis (when hasCroquis) -->
          <section *ngIf="ev.hasCroquis" class="panel-card">
            <div class="panel-head">
              <div>
                <h2>Mesas &amp; Croquis en Vivo</h2>
                <p>Sin sobreocupo: el sistema bloquea excesos y permite crear mesas nuevas.</p>
              </div>
              <div class="head-btns">
                <button type="button" class="btn-outline" (click)="autoAssign()">
                  <app-icon name="sparkles" [size]="14"></app-icon>
                  <span>Auto-Acomodar</span>
                </button>
                <button type="button" class="btn-primary" (click)="showAddTableModal.set(true)">
                  <app-icon name="plus" [size]="14"></app-icon>
                  <span>Nueva Mesa</span>
                </button>
              </div>
            </div>

            <!-- Live SVG Blueprint -->
            <div *ngIf="currentSalon() as salon" class="cad-mini-wrap">
              <svg viewBox="0 0 600 860" class="cad-mini-svg" xmlns="http://www.w3.org/2000/svg">
                <image
                  *ngIf="salon.customCroquisUrl"
                  [attr.href]="salon.customCroquisUrl"
                  x="20"
                  y="20"
                  width="560"
                  height="820"
                  preserveAspectRatio="xMidYMid meet"
                  opacity="0.32"
                />
                <rect x="20" y="20" width="560" height="820" fill="none" stroke="#cbd5e1" stroke-width="2" />
                <g *ngFor="let t of salon.tables">
                  <circle
                    *ngIf="t.shape === 'ROUND'"
                    [attr.cx]="t.posX"
                    [attr.cy]="t.posY"
                    r="26"
                    [attr.fill]="(t.occupiedSeats || 0) >= t.capacity ? '#fef3c7' : ((t.occupiedSeats || 0) > 0 ? '#dbeafe' : '#f8fafc')"
                    [attr.stroke]="(t.occupiedSeats || 0) >= t.capacity ? '#d97706' : '#0284c7'"
                    stroke-width="2"
                  />
                  <rect
                    *ngIf="t.shape === 'RECTANGULAR'"
                    [attr.x]="t.posX - 34"
                    [attr.y]="t.posY - 20"
                    width="68"
                    height="40"
                    rx="6"
                    [attr.fill]="(t.occupiedSeats || 0) >= t.capacity ? '#fef3c7' : ((t.occupiedSeats || 0) > 0 ? '#dbeafe' : '#f8fafc')"
                    [attr.stroke]="(t.occupiedSeats || 0) >= t.capacity ? '#d97706' : '#0284c7'"
                    stroke-width="2"
                  />
                  <text [attr.x]="t.posX" [attr.y]="t.posY - 2" text-anchor="middle" font-size="8.5" font-weight="800" fill="#0f172a">
                    {{ shortLabel(t.tableName) }}
                  </text>
                  <text [attr.x]="t.posX" [attr.y]="t.posY + 11" text-anchor="middle" font-size="8" font-weight="700" fill="#475569">
                    {{ t.occupiedSeats || 0 }}/{{ t.capacity }}p
                  </text>
                </g>
              </svg>
            </div>

            <!-- Table Cards List -->
            <div *ngIf="currentSalon() as salon" class="tables-grid">
              <div *ngFor="let t of salon.tables" class="table-card">
                <div class="tc-head">
                  <div>
                    <strong>{{ t.tableName }}</strong>
                    <small>{{ t.shape === 'RECTANGULAR' ? 'Imperial' : 'Redonda' }}</small>
                  </div>
                  <div class="tc-right">
                    <span class="cap-badge" [class.full]="(t.occupiedSeats || 0) >= t.capacity">
                      {{ t.occupiedSeats || 0 }}/{{ t.capacity }}p
                    </span>
                    <button type="button" class="icon-btn danger" (click)="deleteTable(t)" title="Eliminar mesa">
                      <app-icon name="trash" [size]="13"></app-icon>
                    </button>
                  </div>
                </div>
                <div class="tc-bar">
                  <div class="tc-fill" [style.width.%]="tableFillPct(t)"></div>
                </div>
                <div class="tc-members">
                  <span *ngFor="let m of getTableGuests(t)" class="member-chip">
                    {{ m.fullName }} ({{ m.totalPasses }}p)
                  </span>
                  <span *ngIf="getTableGuests(t).length === 0" class="muted-label">Disponible</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Add Guest Modal -->
        <div *ngIf="showAddModal()" class="modal-backdrop">
          <div class="modal-box">
            <div class="modal-head">
              <h3>Agregar Invitado</h3>
              <button type="button" class="icon-btn" (click)="showAddModal.set(false)">
                <app-icon name="x" [size]="16"></app-icon>
              </button>
            </div>
            <form (ngSubmit)="submitAddGuest()" class="modal-form">
              <div class="field">
                <label>Nombre completo</label>
                <input type="text" [(ngModel)]="newGuest.fullName" name="fullName" required />
              </div>
              <div class="field-row">
                <div class="field">
                  <label>Teléfono (WhatsApp)</label>
                  <input type="text" [(ngModel)]="newGuest.phone" name="phone" />
                </div>
                <div class="field">
                  <label>Acompañantes extras</label>
                  <input type="number" [(ngModel)]="newGuest.numCompanions" name="numCompanions" min="0" max="15" />
                </div>
              </div>
              <div class="field-row">
                <div class="field">
                  <label>Correo electrónico</label>
                  <input type="email" [(ngModel)]="newGuest.email" name="email" />
                </div>
                <div class="field">
                  <label>Estado</label>
                  <select [(ngModel)]="newGuest.status" name="status">
                    <option value="CONFIRMED">Confirmado</option>
                    <option value="PENDING">Pendiente</option>
                  </select>
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-outline" (click)="showAddModal.set(false)">Cancelar</button>
                <button type="submit" class="btn-primary">Guardar Invitado</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Edit Guest Modal -->
        <div *ngIf="editingGuest() as eg" class="modal-backdrop">
          <div class="modal-box">
            <div class="modal-head">
              <h3>Editar Invitado</h3>
              <button type="button" class="icon-btn" (click)="editingGuest.set(null)">
                <app-icon name="x" [size]="16"></app-icon>
              </button>
            </div>
            <form (ngSubmit)="submitEditGuest()" class="modal-form">
              <div class="field">
                <label>Nombre completo</label>
                <input type="text" [(ngModel)]="editForm.fullName" name="editFullName" required />
              </div>
              <div class="field-row">
                <div class="field">
                  <label>Teléfono</label>
                  <input type="text" [(ngModel)]="editForm.phone" name="editPhone" />
                </div>
                <div class="field">
                  <label>Acompañantes extras</label>
                  <input type="number" [(ngModel)]="editForm.numCompanions" name="editCompanions" min="0" max="15" />
                </div>
              </div>
              <div class="field-row">
                <div class="field">
                  <label>Correo</label>
                  <input type="email" [(ngModel)]="editForm.email" name="editEmail" />
                </div>
                <div class="field">
                  <label>Estado</label>
                  <select [(ngModel)]="editForm.status" name="editStatus">
                    <option value="CONFIRMED">Confirmado</option>
                    <option value="PENDING">Pendiente</option>
                    <option value="DECLINED">No asistirá</option>
                  </select>
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-outline" (click)="editingGuest.set(null)">Cancelar</button>
                <button type="submit" class="btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Add Table Modal -->
        <div *ngIf="showAddTableModal()" class="modal-backdrop">
          <div class="modal-box">
            <div class="modal-head">
              <h3>Crear Nueva Mesa</h3>
              <button type="button" class="icon-btn" (click)="showAddTableModal.set(false)">
                <app-icon name="x" [size]="16"></app-icon>
              </button>
            </div>
            <form (ngSubmit)="submitAddTable()" class="modal-form">
              <div class="field">
                <label>Nombre de la mesa</label>
                <input type="text" [(ngModel)]="newTable.tableName" name="tableName" placeholder="Ej. Mesa VIP Familia" required />
              </div>
              <div class="field-row">
                <div class="field">
                  <label>Formato</label>
                  <select [(ngModel)]="newTable.shape" name="shape">
                    <option value="ROUND">Redonda</option>
                    <option value="RECTANGULAR">Imperial Rectangular</option>
                  </select>
                </div>
                <div class="field">
                  <label>Capacidad (lugares)</label>
                  <input type="number" [(ngModel)]="newTable.capacity" name="capacity" min="2" max="30" required />
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-outline" (click)="showAddTableModal.set(false)">Cancelar</button>
                <button type="submit" class="btn-primary">Crear Mesa</button>
              </div>
            </form>
          </div>
        </div>
      </ng-container>

      <ng-template #emptyHostTpl>
        <div class="panel-card empty-host">
          <app-icon name="clock" [size]="28"></app-icon>
          <h3>Cargando Panel del Anfitrión...</h3>
          <p>Esperando datos sincronizados del evento.</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .host-shell {
      min-height: 100vh;
      background: #f1f5f9;
      color: #0f172a;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    }

    .host-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px 20px;
    }

    .host-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .host-brand strong { display: block; font-size: 0.96rem; }
    .host-brand small { color: #64748b; font-size: 0.76rem; }

    .host-logo {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #0284c7;
      color: #fff;
      font-weight: 900;
      display: grid;
      place-items: center;
    }

    .live-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 0.78rem;
      font-weight: 700;
    }
    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      animation: host-pulse 1.8s infinite;
    }
    @keyframes host-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

    .host-hero {
      background: linear-gradient(135deg, #0f172a 0%, #1e40af 100%);
      color: #fff;
      border-radius: 16px;
      padding: 22px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .plan-chip-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    .plan-chip {
      background: rgba(255, 255, 255, 0.14);
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
    }

    .host-hero h1 { margin: 0 0 4px; font-size: 1.55rem; font-weight: 800; }
    .host-hero p { margin: 0; font-size: 0.88rem; color: #dbeafe; }

    .hero-actions { display: flex; gap: 10px; flex-wrap: wrap; }

    .btn-ghost {
      display: inline-flex; align-items: center; gap: 7px;
      background: rgba(255,255,255,0.12); color: #fff;
      border: 1px solid rgba(255,255,255,0.28);
      padding: 9px 14px; border-radius: 10px; font-weight: 700; font-size: 0.84rem; cursor: pointer;
    }
    .btn-solid {
      display: inline-flex; align-items: center; gap: 7px;
      background: #fff; color: #0f172a; border: none;
      padding: 9px 14px; border-radius: 10px; font-weight: 800; font-size: 0.84rem; cursor: pointer;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }
    .kpi-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px;
    }
    .kpi-card small { display: block; font-size: 0.7rem; font-weight: 700; color: #64748b; margin-bottom: 4px; }
    .kpi-card strong { font-size: 1.4rem; font-weight: 800; }

    .workspace-columns {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
      gap: 18px;
      align-items: start;
    }
    .workspace-columns.single-col { grid-template-columns: 1fr; }

    .panel-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px;
    }

    .panel-head {
      display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 14px;
    }
    .panel-head h2 { margin: 0; font-size: 1.15rem; font-weight: 800; }
    .panel-head p { margin: 4px 0 0; font-size: 0.82rem; color: #64748b; }
    .head-btns { display: flex; gap: 8px; flex-wrap: wrap; }

    .btn-primary {
      display: inline-flex; align-items: center; gap: 6px;
      background: #0284c7; color: #fff; border: none; border-radius: 10px;
      padding: 9px 14px; font-weight: 700; font-size: 0.84rem; cursor: pointer;
    }
    .btn-outline {
      display: inline-flex; align-items: center; gap: 6px;
      background: #fff; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 10px;
      padding: 8px 13px; font-weight: 700; font-size: 0.82rem; cursor: pointer;
    }

    .filter-bar {
      display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;
    }
    .search-wrap {
      flex: 1; min-width: 210px; display: flex; align-items: center; gap: 8px;
      border: 1px solid #cbd5e1; border-radius: 10px; padding: 7px 12px;
    }
    .search-wrap input { border: none; outline: none; width: 100%; font-size: 0.88rem; }

    .status-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
    .status-tabs button {
      border: 1px solid #cbd5e1; background: #fff; color: #475569;
      padding: 6px 12px; border-radius: 999px; font-size: 0.78rem; font-weight: 700; cursor: pointer;
    }
    .status-tabs button.active { background: #0284c7; color: #fff; border-color: #0284c7; }

    .table-scroll { overflow-x: auto; }
    .host-table { width: 100%; border-collapse: collapse; }
    .host-table th {
      text-align: left; font-size: 0.74rem; color: #64748b; text-transform: uppercase;
      border-bottom: 1px solid #e2e8f0; padding: 10px 8px;
    }
    .host-table td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }

    .guest-name { font-weight: 700; font-size: 0.9rem; }
    .guest-sub { color: #64748b; font-size: 0.76rem; }
    .passes-tag { background: #f1f5f9; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 0.78rem; }

    .st-pill { padding: 3px 9px; border-radius: 999px; font-size: 0.73rem; font-weight: 700; }
    .st-confirmed, .st-attended { background: #ecfdf5; color: #059669; }
    .st-pending { background: #fffbeb; color: #d97706; }
    .st-declined { background: #fef2f2; color: #dc2626; }

    .tbl-select {
      border: 1px solid #cbd5e1; border-radius: 8px; padding: 5px 8px;
      font-size: 0.8rem; font-weight: 700; color: #0f172a; max-width: 190px;
    }

    .row-actions { display: inline-flex; gap: 6px; }
    .icon-btn {
      width: 30px; height: 30px; border-radius: 8px; border: 1px solid #e2e8f0;
      background: #fff; color: #334155; display: grid; place-items: center; cursor: pointer;
    }
    .icon-btn.danger { color: #dc2626; }

    .cad-mini-wrap {
      border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px; background: #f8fafc; margin-bottom: 14px;
    }
    .cad-mini-svg { width: 100%; max-height: 290px; display: block; }

    .tables-grid { display: flex; flex-direction: column; gap: 10px; max-height: 440px; overflow-y: auto; }
    .table-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
    .tc-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .tc-head small { display: block; color: #64748b; font-size: 0.74rem; }
    .tc-right { display: flex; align-items: center; gap: 8px; }
    .cap-badge { font-size: 0.76rem; font-weight: 800; padding: 3px 8px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; }
    .cap-badge.full { background: #fef3c7; color: #b45309; }
    .tc-bar { height: 6px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin-bottom: 8px; }
    .tc-fill { height: 100%; background: #0284c7; transition: width 0.25s ease; }
    .tc-members { display: flex; flex-wrap: wrap; gap: 6px; }
    .member-chip { background: #f1f5f9; border-radius: 6px; padding: 3px 8px; font-size: 0.74rem; font-weight: 600; }
    .muted-label { color: #94a3b8; font-size: 0.78rem; }
    .empty-row { text-align: center; color: #64748b; padding: 24px; }

    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55);
      display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 1000;
    }
    .modal-box {
      background: #fff; border-radius: 16px; width: min(480px, 100%); padding: 22px;
    }
    .modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .modal-head h3 { margin: 0; font-weight: 800; }
    .modal-form { display: flex; flex-direction: column; gap: 12px; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .field label { display: block; font-size: 0.78rem; font-weight: 700; margin-bottom: 4px; }
    .field input, .field select {
      width: 100%; padding: 9px 11px; border: 1px solid #cbd5e1; border-radius: 9px; box-sizing: border-box;
    }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }
    .empty-host { text-align: center; padding: 48px 24px; }

    @media (max-width: 960px) {
      .workspace-columns { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      .field-row { grid-template-columns: 1fr; }
    }
  `]
})
export class HostPanelComponent implements OnInit {
  targetEventId = signal<number | null>(null);
  searchQuery = '';
  statusFilter = signal<'ALL' | 'CONFIRMED' | 'PENDING' | 'ATTENDED'>('ALL');
  showAddModal = signal(false);
  showAddTableModal = signal(false);
  editingGuest = signal<Guest | null>(null);

  newGuest: Partial<Guest> = {
    fullName: '',
    phone: '',
    email: '',
    numCompanions: 0,
    status: 'CONFIRMED'
  };

  editForm: Partial<Guest> = {
    fullName: '',
    phone: '',
    email: '',
    numCompanions: 0,
    status: 'CONFIRMED'
  };

  newTable = {
    tableName: '',
    shape: 'ROUND' as 'ROUND' | 'RECTANGULAR',
    capacity: 10
  };

  currentEvent = computed<EventItem | undefined>(() => {
    const id = this.targetEventId();
    const list = this.eventService.events();
    if (id != null) {
      return list.find(e => e.id === id) || list[0];
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

  filteredGuests = computed<Guest[]>(() => {
    let list = this.eventGuests();
    const st = this.statusFilter();
    if (st !== 'ALL') {
      list = list.filter(g => g.status === st);
    }
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(g =>
        g.fullName.toLowerCase().includes(q) ||
        (g.phone || '').toLowerCase().includes(q) ||
        (g.qrCodeToken || '').toLowerCase().includes(q)
      );
    }
    return list;
  });

  totalCommittedPasses = computed<number>(() => {
    return this.eventGuests()
      .filter(g => g.status !== 'DECLINED')
      .reduce((sum, g) => sum + (g.totalPasses || 1), 0);
  });

  totalAttended = computed<number>(() => {
    return this.eventGuests()
      .filter(g => g.status === 'ATTENDED')
      .reduce((sum, g) => sum + (g.totalPasses || 1), 0);
  });

  constructor(
    public eventService: EventService,
    private notificationService: NotificationService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('eventId');
      if (id && !isNaN(Number(id))) {
        const evId = Number(id);
        this.targetEventId.set(evId);
        this.eventService.selectEvent(evId);
        this.eventService.requestCloudFullState(evId);
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
      const qId = q.get('eventId');
      if (qId && !isNaN(Number(qId))) {
        const evId = Number(qId);
        this.targetEventId.set(evId);
        this.eventService.selectEvent(evId);
        this.eventService.requestCloudFullState(evId);
      }
    });
  }

  private ensureSelected(): void {
    const ev = this.currentEvent();
    if (ev && this.eventService.activeEventId() !== ev.id) {
      this.eventService.selectEvent(ev.id);
    }
  }

  submitAddGuest(): void {
    if (!this.newGuest.fullName?.trim()) return;
    this.ensureSelected();
    this.eventService.addGuest(this.newGuest);
    this.showAddModal.set(false);
    this.newGuest = { fullName: '', phone: '', email: '', numCompanions: 0, status: 'CONFIRMED' };
  }

  openEditGuest(g: Guest): void {
    this.editingGuest.set(g);
    this.editForm = {
      fullName: g.fullName,
      phone: g.phone || '',
      email: g.email || '',
      numCompanions: g.numCompanions,
      status: g.status
    };
  }

  submitEditGuest(): void {
    const g = this.editingGuest();
    if (!g) return;
    this.ensureSelected();
    if (this.eventService.updateGuest(g.id, this.editForm)) {
      this.editingGuest.set(null);
    }
  }

  deleteGuest(g: Guest): void {
    this.ensureSelected();
    this.eventService.deleteGuest(g.id);
  }

  assignTable(g: Guest, tableIdStr: any): void {
    this.ensureSelected();
    if (!tableIdStr || tableIdStr === 'UNASSIGNED') {
      this.eventService.unassignGuestTable(g.id);
      return;
    }
    const targetId = Number(tableIdStr);
    if (!isNaN(targetId)) {
      this.eventService.assignTableToGuest(g.id, targetId);
    }
  }

  autoAssign(): void {
    this.ensureSelected();
    this.eventService.autoAssignTables();
  }

  submitAddTable(): void {
    if (!this.newTable.tableName.trim()) return;
    this.ensureSelected();
    const created = this.eventService.addTableToCurrentSalon({
      tableName: this.newTable.tableName.trim(),
      shape: this.newTable.shape,
      capacity: Number(this.newTable.capacity) || 10
    });
    if (created) {
      this.showAddTableModal.set(false);
      this.newTable = { tableName: '', shape: 'ROUND', capacity: 10 };
    }
  }

  deleteTable(t: SalonTable): void {
    this.ensureSelected();
    this.eventService.deleteTableFromCurrentSalon(t.id);
  }

  getTableGuests(t: SalonTable): Guest[] {
    return this.eventGuests().filter(g => {
      if (g.status === 'DECLINED') return false;
      if (g.assignedTableId != null && Number(g.assignedTableId) === Number(t.id)) return true;
      return !!(g.assignedTableName && g.assignedTableName.trim().toLowerCase() === t.tableName.trim().toLowerCase());
    });
  }

  tableFillPct(t: SalonTable): number {
    if (!t.capacity) return 0;
    return Math.min(100, Math.round(((t.occupiedSeats || 0) / t.capacity) * 100));
  }

  shortLabel(name: string): string {
    return name.length > 13 ? name.slice(0, 11) + '..' : name;
  }

  formatStatus(status: Guest['status']): string {
    switch (status) {
      case 'ATTENDED': return 'En el Salón';
      case 'CONFIRMED': return 'Confirmado';
      case 'DECLINED': return 'No Asistirá';
      default: return 'Pendiente';
    }
  }

  openPublicInvite(): void {
    const ev = this.currentEvent();
    window.open(this.eventService.getPublicInviteUrl(ev), '_blank');
  }

  copyPublicInviteLink(): void {
    const ev = this.currentEvent();
    const url = this.eventService.getPublicInviteUrl(ev);
    navigator.clipboard?.writeText(url);
    this.notificationService.show('success', 'Enlace Copiado', 'Enlace de invitación pública copiado al portapapeles.');
  }

  copyGuestInviteLink(g: Guest): void {
    const ev = this.currentEvent();
    const url = this.eventService.getPublicInviteUrl(ev, g);
    navigator.clipboard?.writeText(url);
    this.notificationService.show('info', 'Enlace Copiado', `Pase personal de ${g.fullName} copiado.`);
  }

  sendWhatsApp(g: Guest): void {
    const ev = this.currentEvent();
    const url = this.eventService.getPublicInviteUrl(ev, g);
    const msg = encodeURIComponent(
      `Hola ${g.fullName}, te compartimos tu pase digital para ${ev?.name || 'el evento'}. ` +
      `Pases: ${g.totalPasses}. Mesa: ${g.assignedTableName || 'Por asignar'}. Ingresa aquí: ${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  }

  openExternalPanel(): void {
    const ev = this.currentEvent();
    window.open(this.eventService.getExternalHostPanelUrl(ev), '_blank');
  }
}
