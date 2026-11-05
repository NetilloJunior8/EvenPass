import { Component, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EventService } from '../../services/event.service';
import { SalonTable, Guest, Salon, SalonType } from '../../models/models';
import { NotificationService } from '../../services/notification.service';
import { IconComponent } from '../icon.component';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-croquis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IconComponent],
  template: `
    <div class="croquis-workspace-container">

      <!-- ============================================================== -->
      <!-- RESTRICTED VIEW: OPERATOR LOCK FOR NON-PREMIUM PLANS           -->
      <!-- ============================================================== -->
      <div *ngIf="!isCroquisIncluded()" class="croquis-restricted-wrapper">
        <div class="restricted-card-box">
          <div class="restricted-icon-bubble">
            <app-icon name="shield" [size]="38"></app-icon>
          </div>

          <div class="plan-tag-strip">
            <span class="plan-name-badge">
              PLAN {{ eventService.selectedEvent()?.tierPlan }} · CROQUIS BLOQUEADO
            </span>
          </div>

          <h2>Módulo Bloqueado para este Plan</h2>
          <p class="restricted-lead">
            El evento <strong>"{{ eventService.selectedEvent()?.name }}"</strong> está registrado en 
            <strong>Plan {{ eventService.selectedEvent()?.tierPlan === 'BASIC' ? 'Básico' : 'Estándar' }}</strong>. 
            El croquis arquitectónico CAD, distribución de planos y asignación de mesas son exclusivos del <strong>Plan Premium Pro</strong>.
          </p>

          <!-- 5-Day Upgrade Window Policy Status -->
          <div class="plan-lock-status-box" [class.window-open]="canUpgrade().allowed" [class.window-closed]="!canUpgrade().allowed">
            <div class="status-icon-col">
              <app-icon [name]="canUpgrade().allowed ? 'clock' : 'alert-triangle'" [size]="22"></app-icon>
            </div>
            <div class="status-text-col">
              <strong>{{ canUpgrade().allowed ? 'Ventana de Actualización a Pro Disponible' : 'Cambio de Plan Bloqueado' }}</strong>
              <p>{{ canUpgrade().message }}</p>
            </div>
          </div>

          <div class="restricted-actions-row">
            <button 
              *ngIf="canUpgrade().allowed" 
              class="btn-upgrade-plan-action" 
              (click)="upgradeCurrentEventToPremium()"
            >
              <app-icon name="sparkles" [size]="16"></app-icon>
              <span>Actualizar a Plan Premium Pro ({{ canUpgrade().remainingDays }} días restantes)</span>
            </button>
            <a routerLink="/dashboard" class="btn-return-link">
              <app-icon name="arrow-left" [size]="14"></app-icon>
              <span>Volver al Panel del Evento</span>
            </a>
          </div>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- FULL CAD WORKSPACE: ONLY WHEN PLAN INCLUDES CROQUIS            -->
      <!-- ============================================================== -->
      <ng-container *ngIf="isCroquisIncluded()">

      <!-- Locked Banner when Event Finished -->
      <div *ngIf="eventService.isEventLocked()" class="event-locked-banner">
        <div class="locked-icon-bubble">
          <app-icon name="lock" [size]="20"></app-icon>
        </div>
        <div class="locked-text-wrap">
          <strong>Evento Concluido · Plano CAD en Modo Histórico (Solo Lectura)</strong>
          <p>Este evento está marcado como finalizado. Si necesitas ajustar mesas, reasignar asientos o seguir planeando, reactívalo con un solo clic.</p>
        </div>
        <button type="button" class="btn-unlock-banner" (click)="eventService.setEventStatus(eventService.selectedEvent()!.id, 'PENDIENTE')" title="Reabrir evento para continuar gestionando plano y mesas">
          <app-icon name="refresh" [size]="14"></app-icon>
          <span>Reactivar Plano &amp; Mesas</span>
        </button>
      </div>

      <!-- Salon Selection & Global Controls Bar -->
      <div class="salon-selection-header-card">
        <div class="salon-title-col">
          <div class="salon-eyebrow">
            <span class="badge-tag">GESTOR ARQUITECTÓNICO MULTI-RECINTO</span>
            <span class="dot-sep">•</span>
            <span>Evento: <b>{{ eventService.selectedEvent()?.name }}</b></span>
          </div>
          <div class="salon-name-wrap">
            <h2>{{ eventService.currentSalon()?.name }}</h2>
            <span class="salon-spec-pill">
              {{ eventService.currentSalon()?.widthMeters }}m × {{ eventService.currentSalon()?.lengthMeters }}m · 
              Aforo: {{ eventService.currentSalon()?.totalCapacity }} comensales
            </span>
          </div>
          <p class="salon-desc">{{ eventService.currentSalon()?.description }}</p>
        </div>

        <!-- Venue Switcher Pills & Action Buttons -->
        <div class="salon-actions-col">
          <div class="venue-pills-row">
            <button 
              *ngFor="let s of eventService.salons()"
              class="venue-pill-btn" 
              [class.active]="eventService.currentSalon()?.id === s.id"
              (click)="onSelectSalon(s.id)"
            >
              <app-icon [name]="s.type === 'WHITE_POLE_TENT' ? 'croquis' : (s.type === 'ZAFIRO_ROOM' ? 'template' : 'calendar')" [size]="14"></app-icon>
              <span>{{ s.name }}</span>
            </button>
          </div>

          <div class="croquis-primary-actions-row">
            <button class="btn-outline" [disabled]="eventService.isEventLocked()" (click)="openAiDetectorModal()">
              <app-icon name="sparkles" [size]="15"></app-icon>
              <span>Auto-Detectar con IA</span>
            </button>
            <button class="btn-outline" [disabled]="eventService.isEventLocked()" (click)="showNewSalonModal.set(true)">
              <app-icon name="plus" [size]="15"></app-icon>
              <span>+ Nuevo Salón</span>
            </button>
            <button class="btn-outline" [disabled]="eventService.isEventLocked()" (click)="openEditSalonModal()" title="Modificar nombre, aforo y medidas del salón actual">
              <app-icon name="edit" [size]="15"></app-icon>
              <span>Editar Salón</span>
            </button>
            <button class="btn-outline" [disabled]="eventService.isEventLocked()" (click)="showNewTableModal.set(true)">
              <app-icon name="plus" [size]="15"></app-icon>
              <span>+ Agregar Mesa</span>
            </button>
            <button class="btn-outline btn-pdf-export" (click)="showPdfExportModal.set(true)">
              <app-icon name="download" [size]="15"></app-icon>
              <span>Descargar Dossier / Reportes</span>
            </button>
            <button class="btn-action btn-auto-assign" [disabled]="eventService.isEventLocked()" (click)="runAutoAssign()">
              <app-icon name="sparkles" [size]="15"></app-icon>
              <span>Asignar Automáticamente</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Algorithmic Assignment Summary Banner -->
      <div *ngIf="lastAssignmentResult()" class="algorithm-summary-banner">
        <div class="banner-icon">
          <app-icon name="check-circle" [size]="20"></app-icon>
        </div>
        <div class="banner-info">
          <strong>{{ lastAssignmentResult()?.message }}</strong>
          <small>
            Total pases ubicados: <b>{{ lastAssignmentResult()?.totalPassesAssigned }}</b> · 
            Mesas optimizadas: <b>{{ lastAssignmentResult()?.tablesUtilized }}</b> · 
            Sin cupo restante: {{ lastAssignmentResult()?.remainingUnassignedGuests }}
          </small>
        </div>
        <button class="banner-close" (click)="lastAssignmentResult.set(null)">
          <app-icon name="x" [size]="14"></app-icon>
        </button>
      </div>

      <!-- Main Canvas Layout with Table Details Sidebar -->
      <div class="croquis-main-grid">

        <!-- Architectural Blueprint Canvas Card -->
        <div class="blueprint-canvas-card">
          <div class="canvas-header-bar">
            <div class="venue-badge-pill">
              <span class="bp-title">PLANO CAD OFICIAL</span>
              <span class="divider">|</span>
              <small>{{ eventService.currentSalon()?.name || 'Salón de Eventos' }}</small>
            </div>

            <!-- Zoom Controls -->
            <div class="zoom-pill-controls">
              <button class="zoom-btn" (click)="zoomOut()" title="Reducir Zoom">
                <app-icon name="zoom-out" [size]="14"></app-icon>
              </button>
              <span class="zoom-level-text">{{ (zoomScale() * 100) | number:'1.0-0' }}%</span>
              <button class="zoom-btn" (click)="zoomIn()" title="Aumentar Zoom">
                <app-icon name="zoom-in" [size]="14"></app-icon>
              </button>
              <button class="zoom-btn reset" (click)="resetZoom()" title="Restablecer vista">1:1</button>
            </div>

            <div class="status-legend-row">
              <span class="leg-item"><i class="leg-box round"></i> Redonda (10p)</span>
              <span class="leg-item"><i class="leg-box rect"></i> Honor / Imperial</span>
              <span class="leg-item"><i class="leg-dot occupied"></i> Ocupada</span>
              <span class="leg-item"><i class="leg-dot free"></i> Con Asientos</span>
            </div>
          </div>

          <!-- Scalable SVG Viewport -->
          <div class="svg-scroll-viewport">
            <div class="svg-canvas-wrapper" [style.transform]="'scale(' + zoomScale() + ')'">

              <!-- ============================================================== -->
              <!-- CASE 1: SALÓN REAL IMPERIAL (16 Tables CAD Architecture)      -->
              <!-- ============================================================== -->
              <svg 
                *ngIf="eventService.currentSalon()?.type === 'BANQUET_IMPERIAL'"
                viewBox="0 0 600 860" 
                class="architectural-svg"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern id="cadGridImperial" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" stroke-opacity="0.04" stroke-width="0.5"/>
                  </pattern>
                </defs>
                <rect width="600" height="860" fill="url(#cadGridImperial)" />

                <!-- Outer Architectural Walls -->
                <rect x="20" y="20" width="560" height="820" fill="none" stroke="currentColor" stroke-width="3" />

                <!-- Stage / Escenario -->
                <rect x="200" y="80" width="200" height="70" fill="color-mix(in srgb, currentColor 4%, transparent)" stroke="currentColor" stroke-width="2" />
                <text x="300" y="120" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="12" fill="currentColor">
                  ESCENARIO PRINCIPAL
                </text>

                <!-- DJ Booth -->
                <rect x="250" y="160" width="100" height="40" fill="color-mix(in srgb, currentColor 6%, transparent)" stroke="currentColor" stroke-width="1.8" />
                <text x="300" y="185" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="11" fill="currentColor">
                  DJ BOOTH
                </text>

                <!-- Cake Table -->
                <circle cx="300" cy="230" r="16" fill="color-mix(in srgb, currentColor 5%, transparent)" stroke="currentColor" stroke-width="1.5" />
                <text x="300" y="234" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="700" fill="currentColor">cake</text>

                <!-- Bar Section -->
                <rect x="430" y="20" width="150" height="130" fill="none" stroke="currentColor" stroke-width="2" />
                <rect x="440" y="80" width="130" height="30" fill="color-mix(in srgb, currentColor 10%, transparent)" stroke="currentColor" stroke-width="1.5" />
                <text x="505" y="100" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="12" fill="currentColor">BAR</text>

                <!-- Restrooms Top Left -->
                <rect x="20" y="20" width="80" height="130" fill="none" stroke="currentColor" stroke-width="2" />
                <text x="60" y="90" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="10" font-weight="600" fill="currentColor">SANITARIOS</text>

                <!-- Central Dance Floor -->
                <rect x="220" y="270" width="160" height="350" fill="color-mix(in srgb, currentColor 2%, transparent)" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4,4" />
                <text x="300" y="445" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="14" fill="currentColor" opacity="0.4" letter-spacing="3">
                  PISTA DE BAILE
                </text>

                <!-- Entrance Door at Bottom -->
                <path d="M 260 840 A 40 40 0 0 1 300 800" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3,3"/>
                <path d="M 340 840 A 40 40 0 0 0 300 800" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3,3"/>
                <line x1="260" y1="840" x2="340" y2="840" stroke="#0284c7" stroke-width="4"/>
                <text x="300" y="825" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="10" font-weight="700" fill="currentColor">ACCESO PRINCIPAL</text>

                <!-- Render Dynamic Imperial Tables -->
                <g *ngFor="let table of eventService.currentSalon()?.tables" 
                   (pointerdown)="onTablePointerDown($event, table)"
                   (click)="selectTable(table)"
                   class="table-cad-group"
                   [class.is-selected]="selectedTable()?.id === table.id"
                   [class.is-dragging]="isDragging() && draggedTable?.id === table.id"
                   style="cursor: grab; touch-action: none;"
                >
                  <!-- Selection Halo -->
                  <circle *ngIf="selectedTable()?.id === table.id && !isRectTable(table)" [attr.cx]="table.posX" [attr.cy]="table.posY" r="44" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="4,4" />
                  <rect *ngIf="selectedTable()?.id === table.id && isRectTable(table)" [attr.x]="table.posX - 38" [attr.y]="table.posY - 30" width="76" height="60" rx="8" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="4,4" />

                  <!-- Round Table -->
                  <ng-container *ngIf="!isRectTable(table)">
                    <circle 
                      [attr.cx]="table.posX" 
                      [attr.cy]="table.posY" 
                      r="32" 
                      [attr.fill]="getTableOccupiedSeats(table) >= table.capacity ? '#ef4444' : (getTableOccupiedSeats(table) > 0 ? '#10b981' : '#f8fafc')"
                      [attr.stroke]="getTableOccupiedSeats(table) > 0 ? '#047857' : '#475569'"
                      stroke-width="2"
                    />
                    <!-- Radial chairs -->
                    <circle [attr.cx]="table.posX" [attr.cy]="table.posY - 40" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX" [attr.cy]="table.posY + 40" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX - 40" [attr.cy]="table.posY" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 40" [attr.cy]="table.posY" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX - 28" [attr.cy]="table.posY - 28" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 28" [attr.cy]="table.posY - 28" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX - 28" [attr.cy]="table.posY + 28" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 28" [attr.cy]="table.posY + 28" r="5" fill="#64748b" />
                    
                    <text [attr.x]="table.posX" [attr.y]="table.posY - 4" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="12" [attr.fill]="getTableOccupiedSeats(table) > 0 ? '#ffffff' : '#0f172a'">
                      {{ table.tableNumber }}
                    </text>
                    <text [attr.x]="table.posX" [attr.y]="table.posY + 10" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="9" [attr.fill]="getTableOccupiedSeats(table) > 0 ? '#ffffff' : '#64748b'">
                      {{ getTableOccupiedSeats(table) }}/{{ table.capacity }}p
                    </text>
                  </ng-container>

                  <!-- Rectangular / Imperial Table -->
                  <ng-container *ngIf="isRectTable(table)">
                    <rect 
                      [attr.x]="table.posX - 30" 
                      [attr.y]="table.posY - 22" 
                      width="60" 
                      height="44" 
                      rx="4"
                      [attr.fill]="getTableOccupiedSeats(table) >= table.capacity ? '#ef4444' : (getTableOccupiedSeats(table) > 0 ? '#10b981' : '#f8fafc')"
                      [attr.stroke]="getTableOccupiedSeats(table) > 0 ? '#047857' : '#475569'"
                      stroke-width="2"
                    />
                    <!-- Top & Bottom Chairs -->
                    <rect [attr.x]="table.posX - 25" [attr.y]="table.posY - 29" width="10" height="5" rx="1" fill="#64748b" />
                    <rect [attr.x]="table.posX - 5" [attr.y]="table.posY - 29" width="10" height="5" rx="1" fill="#64748b" />
                    <rect [attr.x]="table.posX + 15" [attr.y]="table.posY - 29" width="10" height="5" rx="1" fill="#64748b" />
                    <rect [attr.x]="table.posX - 25" [attr.y]="table.posY + 24" width="10" height="5" rx="1" fill="#64748b" />
                    <rect [attr.x]="table.posX - 5" [attr.y]="table.posY + 24" width="10" height="5" rx="1" fill="#64748b" />
                    <rect [attr.x]="table.posX + 15" [attr.y]="table.posY + 24" width="10" height="5" rx="1" fill="#64748b" />
                    
                    <text [attr.x]="table.posX" [attr.y]="table.posY - 2" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="11" [attr.fill]="getTableOccupiedSeats(table) > 0 ? '#ffffff' : '#0f172a'">
                      {{ table.tableNumber }}
                    </text>
                    <text [attr.x]="table.posX" [attr.y]="table.posY + 12" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="8.5" [attr.fill]="getTableOccupiedSeats(table) > 0 ? '#ffffff' : '#64748b'">
                      {{ getTableOccupiedSeats(table) }}/{{ table.capacity }}p
                    </text>
                  </ng-container>
                </g>
              </svg>

              <!-- ============================================================== -->
              <!-- CASE 2: CARPA REAL 40x60 WHITE POLE TENT                       -->
              <!-- Exact CAD geometry matching user image media_1793653282587    -->
              <!-- ============================================================== -->
              <svg 
                *ngIf="eventService.currentSalon()?.type === 'WHITE_POLE_TENT'"
                viewBox="0 0 620 880" 
                class="architectural-svg"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern id="tentGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" stroke-opacity="0.04" stroke-width="0.5"/>
                  </pattern>
                </defs>
                <rect width="620" height="880" fill="url(#tentGrid)" />

                <!-- Outer Tent Perimeter (40ft width x 60ft length equivalent) -->
                <rect x="30" y="40" width="560" height="800" fill="none" stroke="currentColor" stroke-width="3" />
                
                <!-- Dimension Marks -->
                <line x1="30" y1="25" x2="590" y2="25" stroke="#0284c7" stroke-width="1.5" />
                <text x="310" y="20" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="12" fill="#0284c7">40' 0" ANCHO DE CARPA</text>
                
                <line x1="15" y1="40" x2="15" y2="840" stroke="#0284c7" stroke-width="1.5" />
                <text x="18" y="440" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="12" fill="#0284c7" transform="rotate(-90 18 440)">60' 0" LARGO DE CARPA</text>

                <!-- Tent Center Poles (White Pole Tent Structure) -->
                <circle cx="310" cy="220" r="6" fill="#0284c7" stroke="#ffffff" stroke-width="2" />
                <circle cx="310" cy="620" r="6" fill="#0284c7" stroke="#ffffff" stroke-width="2" />
                <line x1="310" y1="40" x2="310" y2="840" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="6,6" />

                <!-- 12' x 20' DANCE FLOOR (Central Area) -->
                <rect x="220" y="280" width="180" height="260" fill="color-mix(in srgb, #f59e0b 8%, transparent)" stroke="#f59e0b" stroke-width="2" />
                <path d="M 220 340 L 400 340 M 220 400 L 400 400 M 220 460 L 400 460 M 280 280 L 280 540 M 340 280 L 340 540" stroke="#f59e0b" stroke-opacity="0.3" stroke-width="1"/>
                <text x="310" y="405" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="12" fill="#d97706" letter-spacing="1">
                  12' × 20' DANCE FLOOR
                </text>
                <text x="310" y="425" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="600" font-size="10" fill="#d97706">
                  (PISTA DE BAILE)
                </text>

                <!-- DJ Station (In front of Dance Floor) -->
                <rect x="260" y="555" width="100" height="36" fill="color-mix(in srgb, currentColor 8%, transparent)" stroke="currentColor" stroke-width="1.8" />
                <text x="310" y="578" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="11" fill="currentColor">
                  DJ STATION
                </text>

                <!-- Cake Table (48" Round Cake Table) -->
                <circle cx="210" cy="575" r="18" fill="none" stroke="currentColor" stroke-width="1.5" />
                <text x="210" y="579" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="8.5" font-weight="700" fill="currentColor">48" CAKE</text>

                <!-- 8' BUFFET TABLE (Top Edge / Wall) -->
                <rect x="220" y="50" width="180" height="32" fill="color-mix(in srgb, currentColor 10%, transparent)" stroke="currentColor" stroke-width="1.8" />
                <text x="310" y="71" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="11" fill="currentColor">
                  8' BUFFET TABLE
                </text>

                <!-- BAR COUNTER (Bottom Corner) -->
                <rect x="220" y="780" width="180" height="40" fill="color-mix(in srgb, #0284c7 12%, transparent)" stroke="#0284c7" stroke-width="2" />
                <text x="310" y="805" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="13" fill="#0284c7">
                  BAR &amp; BEVERAGES
                </text>

                <!-- Render Carpa Real Tables (Head Table 12p + 14 Round 8p Tables) -->
                <g *ngFor="let table of eventService.currentSalon()?.tables" 
                   (pointerdown)="onTablePointerDown($event, table)"
                   (click)="selectTable(table)"
                   class="table-cad-group"
                   [class.is-selected]="selectedTable()?.id === table.id"
                   [class.is-dragging]="isDragging() && draggedTable?.id === table.id"
                   style="cursor: grab; touch-action: none;"
                >
                  <!-- Selection Halo -->
                  <circle *ngIf="selectedTable()?.id === table.id && !isRectTable(table)" [attr.cx]="table.posX" [attr.cy]="table.posY" r="42" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="4,4" />
                  <rect *ngIf="selectedTable()?.id === table.id && isRectTable(table)" [attr.x]="table.posX - 8" [attr.y]="table.posY - 8" width="176" height="52" rx="8" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="4,4" />

                  <!-- Head Table (Presidium 12 seats) -->
                  <ng-container *ngIf="isRectTable(table)">
                    <rect 
                      [attr.x]="table.posX" 
                      [attr.y]="table.posY" 
                      width="160" 
                      height="36" 
                      rx="4" 
                      [attr.fill]="getTableOccupiedSeats(table) >= table.capacity ? '#ef4444' : (getTableOccupiedSeats(table) > 0 ? '#10b981' : '#f8fafc')"
                      [attr.stroke]="getTableOccupiedSeats(table) > 0 ? '#047857' : '#0284c7'"
                      stroke-width="2"
                    />
                    <!-- 12 Chairs on Upper Edge -->
                    <circle [attr.cx]="table.posX + 10" [attr.cy]="table.posY - 6" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 23" [attr.cy]="table.posY - 6" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 36" [attr.cy]="table.posY - 6" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 49" [attr.cy]="table.posY - 6" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 62" [attr.cy]="table.posY - 6" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 75" [attr.cy]="table.posY - 6" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 88" [attr.cy]="table.posY - 6" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 101" [attr.cy]="table.posY - 6" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 114" [attr.cy]="table.posY - 6" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 127" [attr.cy]="table.posY - 6" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 140" [attr.cy]="table.posY - 6" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 153" [attr.cy]="table.posY - 6" r="4.5" fill="#64748b" />
                    
                    <text [attr.x]="table.posX + 80" [attr.y]="table.posY + 16" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="10.5" [attr.fill]="getTableOccupiedSeats(table) > 0 ? '#ffffff' : '#0f172a'">
                      {{ table.tableNumber === 1 ? 'HEAD TABLE (12 CHAIRS)' : ('MESA ' + table.tableNumber + ' (IMPERIAL)') }}
                    </text>
                    <text [attr.x]="table.posX + 80" [attr.y]="table.posY + 29" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="9" [attr.fill]="getTableOccupiedSeats(table) > 0 ? '#ffffff' : '#64748b'">
                      {{ getTableOccupiedSeats(table) }}/{{ table.capacity }}p Ocupados
                    </text>
                  </ng-container>

                  <!-- 14 Round Tables 60" (8 Chairs each) -->
                  <ng-container *ngIf="!isRectTable(table)">
                    <circle 
                      [attr.cx]="table.posX" 
                      [attr.cy]="table.posY" 
                      r="28" 
                      [attr.fill]="getTableOccupiedSeats(table) >= table.capacity ? '#ef4444' : (getTableOccupiedSeats(table) > 0 ? '#10b981' : '#f8fafc')"
                      [attr.stroke]="getTableOccupiedSeats(table) > 0 ? '#047857' : '#475569'"
                      stroke-width="2"
                    />
                    <!-- 8 Chairs around 60" round table -->
                    <circle [attr.cx]="table.posX" [attr.cy]="table.posY - 35" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX" [attr.cy]="table.posY + 35" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX - 35" [attr.cy]="table.posY" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 35" [attr.cy]="table.posY" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX - 25" [attr.cy]="table.posY - 25" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 25" [attr.cy]="table.posY - 25" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX - 25" [attr.cy]="table.posY + 25" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 25" [attr.cy]="table.posY + 25" r="4.5" fill="#64748b" />
                    
                    <text [attr.x]="table.posX" [attr.y]="table.posY - 3" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="11" [attr.fill]="getTableOccupiedSeats(table) > 0 ? '#ffffff' : '#0f172a'">
                      {{ table.tableNumber }}
                    </text>
                    <text [attr.x]="table.posX" [attr.y]="table.posY + 9" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="8" [attr.fill]="getTableOccupiedSeats(table) > 0 ? '#ffffff' : '#64748b'">
                      {{ getTableOccupiedSeats(table) }}/{{ table.capacity }}p
                    </text>
                  </ng-container>
                </g>
              </svg>

              <!-- ============================================================== -->
              <!-- CASE 3: SALÓN ZAFIRO BANQUET ROOM (6.19m x 8.625m)            -->
              <!-- Exact CAD geometry matching user image media_1793653291090    -->
              <!-- ============================================================== -->
              <svg 
                *ngIf="eventService.currentSalon()?.type === 'ZAFIRO_ROOM'"
                viewBox="0 0 600 750" 
                class="architectural-svg"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern id="zafiroGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" stroke-opacity="0.04" stroke-width="0.5"/>
                  </pattern>
                </defs>
                <rect width="600" height="750" fill="url(#zafiroGrid)" />

                <!-- Outer Architectural Walls (8.625m width x 6.19m depth) -->
                <rect x="40" y="50" width="520" height="640" fill="none" stroke="currentColor" stroke-width="3.5" />

                <!-- Metric Dimension Callouts -->
                <line x1="40" y1="35" x2="560" y2="35" stroke="#0284c7" stroke-width="1.5"/>
                <text x="300" y="28" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="12" fill="#0284c7">8.625 METROS</text>

                <line x1="25" y1="50" x2="25" y2="690" stroke="#0284c7" stroke-width="1.5"/>
                <text x="25" y="370" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="12" fill="#0284c7" transform="rotate(-90 25 370)">6.19 METROS</text>

                <!-- Fireplace Hearth (Chimenea on Top Wall) -->
                <rect x="230" y="45" width="140" height="24" fill="color-mix(in srgb, #ef4444 14%, transparent)" stroke="#ef4444" stroke-width="2" />
                <text x="300" y="61" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="10" fill="#dc2626">
                  CHIMENEA / FIREPLACE
                </text>

                <!-- French Windows along Left Wall -->
                <line x1="40" y1="120" x2="40" y2="260" stroke="#0284c7" stroke-width="6" stroke-linecap="round"/>
                <text x="52" y="195" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="9" fill="#0284c7" transform="rotate(90 52 195)">VENTANALES FRANCESES</text>

                <line x1="40" y1="340" x2="40" y2="480" stroke="#0284c7" stroke-width="6" stroke-linecap="round"/>
                <text x="52" y="415" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="9" fill="#0284c7" transform="rotate(90 52 415)">VENTANALES FRANCESES</text>

                <!-- Kitchen Exit (Door Swing Top Right) -->
                <path d="M 560 120 A 40 40 0 0 1 520 80" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="3,3"/>
                <line x1="560" y1="120" x2="520" y2="120" stroke="currentColor" stroke-width="2"/>
                <text x="500" y="105" text-anchor="end" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="700" fill="currentColor">SALIDA A COCINA</text>

                <!-- Visitor Exit (Door Swing Bottom Right) -->
                <path d="M 560 620 A 40 40 0 0 0 520 660" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="3,3"/>
                <line x1="560" y1="620" x2="520" y2="620" stroke="currentColor" stroke-width="2"/>
                <text x="500" y="640" text-anchor="end" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="700" fill="currentColor">ACCESO VISITANTES</text>

                <!-- Render Salón Zafiro Tables (Top Table on right wall + 5 Round Banquet Tables) -->
                <g *ngFor="let table of eventService.currentSalon()?.tables" 
                   (pointerdown)="onTablePointerDown($event, table)"
                   (click)="selectTable(table)"
                   class="table-cad-group"
                   [class.is-selected]="selectedTable()?.id === table.id"
                   [class.is-dragging]="isDragging() && draggedTable?.id === table.id"
                   style="cursor: grab; touch-action: none;"
                >
                  <!-- Selection Halo -->
                  <circle *ngIf="selectedTable()?.id === table.id && !isRectTable(table)" [attr.cx]="table.posX" [attr.cy]="table.posY" r="48" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="4,4" />
                  <rect *ngIf="selectedTable()?.id === table.id && isRectTable(table)" [attr.x]="table.posX - 28" [attr.y]="table.posY - 8" width="56" height="156" rx="8" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="4,4" />

                  <!-- Long Top Table (6 single-sided seats along right wall) -->
                  <ng-container *ngIf="isRectTable(table)">
                    <rect 
                      [attr.x]="table.posX - 20" 
                      [attr.y]="table.posY" 
                      width="40" 
                      height="140" 
                      rx="4"
                      [attr.fill]="getTableOccupiedSeats(table) >= table.capacity ? '#ef4444' : (getTableOccupiedSeats(table) > 0 ? '#10b981' : '#f8fafc')"
                      [attr.stroke]="getTableOccupiedSeats(table) > 0 ? '#047857' : '#0284c7'"
                      stroke-width="2"
                    />
                    <!-- 6 Chairs on the inner side (left side of the table) -->
                    <circle [attr.cx]="table.posX - 28" [attr.cy]="table.posY + 15" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX - 28" [attr.cy]="table.posY + 38" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX - 28" [attr.cy]="table.posY + 61" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX - 28" [attr.cy]="table.posY + 84" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX - 28" [attr.cy]="table.posY + 107" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX - 28" [attr.cy]="table.posY + 130" r="5" fill="#64748b" />

                    <text [attr.x]="table.posX" [attr.y]="table.posY + 70" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="11" [attr.fill]="getTableOccupiedSeats(table) > 0 ? '#ffffff' : '#0f172a'" [attr.transform]="'rotate(90 ' + table.posX + ' ' + (table.posY + 70) + ')'">
                      {{ table.tableNumber === 1 ? 'MESA DE HONOR (6p)' : ('MESA ' + table.tableNumber) }}
                    </text>
                  </ng-container>

                  <!-- 5 Round Banquet Tables (10p each) -->
                  <ng-container *ngIf="!isRectTable(table)">
                    <circle 
                      [attr.cx]="table.posX" 
                      [attr.cy]="table.posY" 
                      r="36" 
                      [attr.fill]="getTableOccupiedSeats(table) >= table.capacity ? '#ef4444' : (getTableOccupiedSeats(table) > 0 ? '#10b981' : '#f8fafc')"
                      [attr.stroke]="getTableOccupiedSeats(table) > 0 ? '#047857' : '#475569'"
                      stroke-width="2"
                    />
                    <!-- 10 Chairs around table -->
                    <circle [attr.cx]="table.posX" [attr.cy]="table.posY - 45" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 27" [attr.cy]="table.posY - 36" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 43" [attr.cy]="table.posY - 14" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 43" [attr.cy]="table.posY + 14" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 27" [attr.cy]="table.posY + 36" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX" [attr.cy]="table.posY + 45" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX - 27" [attr.cy]="table.posY + 36" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX - 43" [attr.cy]="table.posY + 14" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX - 43" [attr.cy]="table.posY - 14" r="5" fill="#64748b" />
                    <circle [attr.cx]="table.posX - 27" [attr.cy]="table.posY - 36" r="5" fill="#64748b" />

                    <text [attr.x]="table.posX" [attr.y]="table.posY - 4" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="13" [attr.fill]="getTableOccupiedSeats(table) > 0 ? '#ffffff' : '#0f172a'">
                      {{ table.tableNumber }}
                    </text>
                    <text [attr.x]="table.posX" [attr.y]="table.posY + 12" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="10" [attr.fill]="getTableOccupiedSeats(table) > 0 ? '#ffffff' : '#64748b'">
                      {{ getTableOccupiedSeats(table) }}/{{ table.capacity }}p
                    </text>
                  </ng-container>
                </g>
              </svg>

              <!-- ============================================================== -->
              <!-- CASE 4: CUSTOM IMPORTED SALON BLUEPRINT                        -->
              <!-- ============================================================== -->
              <svg 
                *ngIf="eventService.currentSalon()?.type === 'CUSTOM'"
                viewBox="0 0 600 750" 
                class="architectural-svg"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern id="customGrid" width="25" height="25" patternUnits="userSpaceOnUse">
                    <path d="M 25 0 L 0 0 0 25" fill="none" stroke="currentColor" stroke-opacity="0.05" stroke-width="0.5"/>
                  </pattern>
                </defs>
                <rect width="600" height="750" fill="url(#customGrid)" />
                <rect x="30" y="30" width="540" height="690" fill="none" stroke="currentColor" stroke-width="2.5" />
                <text x="300" y="60" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="13" fill="currentColor">
                  PLANO PERSONALIZADO IMPORTADO CON IA
                </text>

                <g *ngFor="let table of eventService.currentSalon()?.tables" 
                   (pointerdown)="onTablePointerDown($event, table)"
                   (click)="selectTable(table)"
                   class="table-cad-group"
                   [class.is-selected]="selectedTable()?.id === table.id"
                   [class.is-dragging]="isDragging() && draggedTable?.id === table.id"
                   style="cursor: grab; touch-action: none;"
                >
                  <!-- Selection Halo -->
                  <circle *ngIf="selectedTable()?.id === table.id && !isRectTable(table)" [attr.cx]="table.posX" [attr.cy]="table.posY" r="40" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="4,4" />
                  <rect *ngIf="selectedTable()?.id === table.id && isRectTable(table)" [attr.x]="table.posX - 38" [attr.y]="table.posY - 30" width="76" height="60" rx="8" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="4,4" />

                  <!-- Round Table -->
                  <ng-container *ngIf="!isRectTable(table)">
                    <circle 
                      [attr.cx]="table.posX" 
                      [attr.cy]="table.posY" 
                      r="28" 
                      [attr.fill]="getTableOccupiedSeats(table) >= table.capacity ? '#ef4444' : (getTableOccupiedSeats(table) > 0 ? '#10b981' : '#f8fafc')"
                      [attr.stroke]="getTableOccupiedSeats(table) > 0 ? '#047857' : '#475569'"
                      stroke-width="2"
                    />
                    <!-- Radial chairs -->
                    <circle [attr.cx]="table.posX" [attr.cy]="table.posY - 36" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX" [attr.cy]="table.posY + 36" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX - 36" [attr.cy]="table.posY" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 36" [attr.cy]="table.posY" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX - 25" [attr.cy]="table.posY - 25" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 25" [attr.cy]="table.posY - 25" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX - 25" [attr.cy]="table.posY + 25" r="4.5" fill="#64748b" />
                    <circle [attr.cx]="table.posX + 25" [attr.cy]="table.posY + 25" r="4.5" fill="#64748b" />

                    <text [attr.x]="table.posX" [attr.y]="table.posY - 2" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="11" [attr.fill]="getTableOccupiedSeats(table) > 0 ? '#ffffff' : '#0f172a'">
                      {{ table.tableNumber }}
                    </text>
                    <text [attr.x]="table.posX" [attr.y]="table.posY + 10" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="8.5" [attr.fill]="getTableOccupiedSeats(table) > 0 ? '#ffffff' : '#64748b'">
                      {{ getTableOccupiedSeats(table) }}/{{ table.capacity }}p
                    </text>
                  </ng-container>

                  <!-- Rectangular / Imperial Table -->
                  <ng-container *ngIf="isRectTable(table)">
                    <rect 
                      [attr.x]="table.posX - 30" 
                      [attr.y]="table.posY - 22" 
                      width="60" 
                      height="44" 
                      rx="4"
                      [attr.fill]="getTableOccupiedSeats(table) >= table.capacity ? '#ef4444' : (getTableOccupiedSeats(table) > 0 ? '#10b981' : '#f8fafc')"
                      [attr.stroke]="getTableOccupiedSeats(table) > 0 ? '#047857' : '#475569'"
                      stroke-width="2"
                    />
                    <!-- Top & Bottom Chairs -->
                    <rect [attr.x]="table.posX - 25" [attr.y]="table.posY - 29" width="10" height="5" rx="1" fill="#64748b" />
                    <rect [attr.x]="table.posX - 5" [attr.y]="table.posY - 29" width="10" height="5" rx="1" fill="#64748b" />
                    <rect [attr.x]="table.posX + 15" [attr.y]="table.posY - 29" width="10" height="5" rx="1" fill="#64748b" />
                    <rect [attr.x]="table.posX - 25" [attr.y]="table.posY + 24" width="10" height="5" rx="1" fill="#64748b" />
                    <rect [attr.x]="table.posX - 5" [attr.y]="table.posY + 24" width="10" height="5" rx="1" fill="#64748b" />
                    <rect [attr.x]="table.posX + 15" [attr.y]="table.posY + 24" width="10" height="5" rx="1" fill="#64748b" />
                    
                    <text [attr.x]="table.posX" [attr.y]="table.posY - 2" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="11" [attr.fill]="getTableOccupiedSeats(table) > 0 ? '#ffffff' : '#0f172a'">
                      {{ table.tableNumber }}
                    </text>
                    <text [attr.x]="table.posX" [attr.y]="table.posY + 10" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="8.5" [attr.fill]="getTableOccupiedSeats(table) > 0 ? '#ffffff' : '#64748b'">
                      {{ getTableOccupiedSeats(table) }}/{{ table.capacity }}p
                    </text>
                  </ng-container>
                </g>
              </svg>

            </div>
          </div>
        </div>

        <!-- Right Side: Table Inspector & Direct Guest Seating -->
        <div class="table-inspector-card">
          <div class="inspector-header">
            <div>
              <h3>Inspección de Mesa</h3>
              <p *ngIf="activeSelectedTable()">{{ activeSelectedTable()?.tableName }}</p>
              <p *ngIf="!activeSelectedTable()">Selecciona una mesa en el plano para ver detalles</p>
            </div>
            <span *ngIf="activeSelectedTable()" class="badge" [ngClass]="{
              'badge-danger': getTableOccupiedSeats(activeSelectedTable()) >= (activeSelectedTable()?.capacity || 1),
              'badge-success': getTableOccupiedSeats(activeSelectedTable()) < (activeSelectedTable()?.capacity || 1) && getTableOccupiedSeats(activeSelectedTable()) > 0,
              'badge-info': getTableOccupiedSeats(activeSelectedTable()) === 0
            }">
              {{ getTableOccupiedSeats(activeSelectedTable()) >= (activeSelectedTable()?.capacity || 1) ? 'Llena' : (getTableOccupiedSeats(activeSelectedTable()) > 0 ? 'Con Espacio' : 'Disponible') }}
            </span>
          </div>

          <div *ngIf="activeSelectedTable()" class="inspector-body">
            
            <!-- Metric Stats Grid -->
            <div class="table-stats-grid">
              <div class="stat-box">
                <span class="stat-label">Capacidad</span>
                <strong class="stat-val">{{ activeSelectedTable()?.capacity }} personas</strong>
              </div>
              <div class="stat-box">
                <span class="stat-label">Pases Ocupados</span>
                <strong class="stat-val" [class.text-danger]="getTableOccupiedSeats(activeSelectedTable()) >= (activeSelectedTable()?.capacity || 1)">
                  {{ getTableOccupiedSeats(activeSelectedTable()) }} pases
                </strong>
              </div>
              <div class="stat-box">
                <span class="stat-label">Asientos Libres</span>
                <strong class="stat-val text-success">
                  {{ (activeSelectedTable()?.capacity || 0) - getTableOccupiedSeats(activeSelectedTable()) }} libres
                </strong>
              </div>
              <div class="stat-box">
                <span class="stat-label">Geometría</span>
                <strong class="stat-val">{{ isRectTable(activeSelectedTable()) ? 'Imperial / Rectangular' : 'Redonda' }}</strong>
              </div>
            </div>

            <!-- Overcapacity Alert Banner (Sobrecupo 10/8 Fix) -->
            <div *ngIf="isOvercapacity(activeSelectedTable())" class="overcapacity-banner">
              <div class="overcap-title">
                <app-icon name="alert-triangle" [size]="18"></app-icon>
                <strong>Sobrecupo Detectado ({{ getTableOccupiedSeats(activeSelectedTable()) }}/{{ activeSelectedTable()?.capacity }} pases)</strong>
              </div>
              <p>Esta mesa sobrepasa su capacidad física por {{ getTableOccupiedSeats(activeSelectedTable()) - (activeSelectedTable()?.capacity || 0) }} asiento(s). Puedes reubicar los comensales excedentes automáticamente.</p>
              <button class="btn-resolve-overcap" (click)="resolveOvercapacity(activeSelectedTable()!)">
                <app-icon name="sparkles" [size]="14"></app-icon>
                <span>Reubicar Excedentes Automáticamente</span>
              </button>
            </div>

            <!-- Fine-Tuning Precision Positioning & Drag Controls -->
            <div class="fine-tuning-box">
              <div class="fine-tuning-header">
                <span class="fine-tuning-title">
                  <app-icon name="croquis" [size]="14"></app-icon>
                  Ajuste de Posición en Plano CAD
                </span>
                <span class="coords-pill">X: {{ activeSelectedTable()?.posX }}px · Y: {{ activeSelectedTable()?.posY }}px</span>
              </div>
              <div class="nudge-controls-wrap">
                <div class="nudge-pad">
                  <div class="nudge-row">
                    <button type="button" class="nudge-btn" (click)="nudgeTable(0, -10)" title="Subir Mesa (10px)">↑</button>
                  </div>
                  <div class="nudge-row">
                    <button type="button" class="nudge-btn" (click)="nudgeTable(-10, 0)" title="Mover a la Izquierda (10px)">←</button>
                    <button type="button" class="nudge-btn center-dot" (click)="nudgeTable(0, 0)" title="Posición Actual">•</button>
                    <button type="button" class="nudge-btn" (click)="nudgeTable(10, 0)" title="Mover a la Derecha (10px)">→</button>
                  </div>
                  <div class="nudge-row">
                    <button type="button" class="nudge-btn" (click)="nudgeTable(0, 10)" title="Bajar Mesa (10px)">↓</button>
                  </div>
                </div>
                <div class="direct-coords-inputs">
                  <div class="coord-field">
                    <label>Eje X (Horizontal)</label>
                    <input type="number" [ngModel]="activeSelectedTable()?.posX" (ngModelChange)="setTableCoord('posX', $event)" step="5" min="20" max="580">
                  </div>
                  <div class="coord-field">
                    <label>Eje Y (Vertical)</label>
                    <input type="number" [ngModel]="activeSelectedTable()?.posY" (ngModelChange)="setTableCoord('posY', $event)" step="5" min="20" max="840">
                  </div>
                </div>
              </div>
              <small class="nudge-hint">
                <app-icon name="sparkles" [size]="12"></app-icon>
                Arrastra libremente con el mouse o dedo en el plano, o usa las flechas para ajuste milimétrico.
              </small>
            </div>

            <!-- Seated Guests List (Bug fixed: Reliable lookup) -->
            <div class="seated-guests-section">
              <div class="section-title-row">
                <h4>Comensales Sentados ({{ getGuestsForSelectedTable().length }})</h4>
                <small class="text-muted">Total: {{ getSeatedGuestsPassesCount() }} pases</small>
              </div>

              <div *ngIf="getGuestsForSelectedTable().length === 0" class="empty-seating-box">
                <app-icon name="users" [size]="24"></app-icon>
                <p>No hay invitados asignados a esta mesa todavía.</p>
                <small>Usa la asignación automática o el selector inferior para sentar familias.</small>
              </div>

              <div class="guests-seating-scroll">
                <div *ngFor="let g of getGuestsForSelectedTable()" class="seated-guest-row">
                  <div class="guest-info-col">
                    <span class="guest-name">
                      {{ g.fullName }}
                      <span class="badge-passes">{{ g.totalPasses }} pases</span>
                    </span>
                    <small *ngIf="g.dietNotes" class="guest-diet">
                      <app-icon name="alert-triangle" [size]="11"></app-icon>
                      <span>{{ g.dietNotes }}</span>
                    </small>
                    <small *ngIf="g.phone" class="guest-phone">{{ g.phone }}</small>
                  </div>
                  <div class="guest-row-btns">
                    <button class="btn-reassign-guest" (click)="openReassignModal(g)" title="Cambiar a otra mesa por petición del comensal">
                      <app-icon name="arrow-right" [size]="12"></app-icon>
                      <span>Cambiar Mesa</span>
                    </button>
                    <button class="btn-unseat" (click)="unassignGuest(g.id)" title="Desasignar de esta mesa">
                      <app-icon name="x" [size]="14"></app-icon>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Direct Guest Assignment Dropdown -->
            <div class="quick-seat-section">
              <label>Sentar Invitado en esta Mesa:</label>
              <div class="seat-picker-row">
                <select [(ngModel)]="guestToSeatId" class="seat-select">
                  <option [ngValue]="null">-- Seleccionar invitado no asignado --</option>
                  <option *ngFor="let g of getUnassignedGuests()" [ngValue]="g.id">
                    {{ g.fullName }} ({{ g.totalPasses }} pases)
                  </option>
                </select>
                <button 
                  class="btn-action btn-seat-confirm" 
                  [disabled]="!guestToSeatId"
                  (click)="handleManualSeatGuest()"
                >
                  Sentar
                </button>
              </div>
            </div>

            <!-- Table Actions (Delete / Edit) -->
            <div class="table-management-actions">
              <button class="btn-outline" (click)="openEditTableModal()" style="margin-bottom: 8px; width: 100%;">
                <app-icon name="edit" [size]="14"></app-icon>
                <span>Editar Mesa (Nombre, Sillas, Forma)</span>
              </button>
              <button class="btn-outline btn-danger-action" (click)="handleDeleteCurrentTable()">
                <app-icon name="trash" [size]="14"></app-icon>
                <span>Eliminar Mesa del Salón</span>
              </button>
            </div>

          </div>
        </div>

      </div>

      <!-- ================================================================ -->
      <!-- MODAL 1: AI TABLE DETECTION & CROQUIS SCANNER                    -->
      <!-- ================================================================ -->
      <div *ngIf="showAiModal()" class="modal-backdrop">
        <div class="modal-box ai-scanner-modal">
          <div class="modal-header">
            <div class="modal-title-with-icon">
              <app-icon name="sparkles" [size]="20"></app-icon>
              <h3>Importar Plano CAD con Detección IA</h3>
            </div>
            <button class="close-btn" (click)="showAiModal.set(false)">✕</button>
          </div>

          <div class="ai-modal-content">
            <p class="modal-intro">
              Sube un boceto arquitectónico o plano en PDF/PNG. Nuestro motor de visión por computadora detectará automáticamente las mesas, pistas de baile y aforos.
            </p>

            <!-- Preset Plan Selector -->
            <div class="presets-selector-group">
              <label>O selecciona una plantilla de plano arquitectónico:</label>
              <div class="presets-grid">
                <button 
                  type="button" 
                  class="preset-card" 
                  [class.selected]="aiSelectedPreset() === 'WHITE_POLE_TENT'"
                  (click)="selectAiPreset('WHITE_POLE_TENT')"
                >
                  <div class="preset-name">Carpa Real 40x60 White Pole Tent</div>
                  <small>15 mesas · Pista 12x20 · 124 comensales</small>
                </button>

                <button 
                  type="button" 
                  class="preset-card" 
                  [class.selected]="aiSelectedPreset() === 'ZAFIRO_ROOM'"
                  (click)="selectAiPreset('ZAFIRO_ROOM')"
                >
                  <div class="preset-name">Salón Zafiro Banquet Room</div>
                  <small>6 mesas · Chimenea · 56 comensales</small>
                </button>

                <button 
                  type="button" 
                  class="preset-card" 
                  [class.selected]="aiSelectedPreset() === 'BANQUET_IMPERIAL'"
                  (click)="selectAiPreset('BANQUET_IMPERIAL')"
                >
                  <div class="preset-name">Gran Salón Imperial</div>
                  <small>16 mesas · Escenario estelar · 250 aforo</small>
                </button>
              </div>
            </div>

            <!-- Upload Zone -->
            <div class="file-upload-dropzone" [class.scanning]="isScanning()">
              <input type="file" (change)="onFileSelected($event)" accept="image/*,application/pdf" class="file-input-hidden" id="croquisFile">
              <label for="croquisFile" class="dropzone-label">
                <app-icon name="camera" [size]="32"></app-icon>
                <strong>Arrastra aquí el plano arquitectónico</strong>
                <small>Formatos admitidos: PNG, JPG, CAD DWG, PDF (Hasta 25MB)</small>
              </label>

              <!-- Scanning HUD Laser Overlay -->
              <div *ngIf="isScanning()" class="scanner-laser-bar"></div>
            </div>

            <!-- Real-time AI Progress Bar -->
            <div *ngIf="isScanning()" class="scanning-feedback-box">
              <div class="scan-step-text">{{ scanningStepText() }}</div>
              <div class="progress-track">
                <div class="progress-fill" [style.width]="scanningProgress() + '%'"></div>
              </div>
            </div>

            <!-- Manual Name Input -->
            <div class="form-group" style="margin-top: 14px;">
              <label>Nombre para este Nuevo Salón / Recinto:</label>
              <input type="text" [(ngModel)]="aiSalonName" placeholder="Ej. Jardín Las Palmas / Carpa Diamante">
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-outline" (click)="showAiModal.set(false)" [disabled]="isScanning()">Cancelar</button>
            <button class="btn-action" (click)="runAiDetection()" [disabled]="isScanning()">
              <app-icon name="sparkles" [size]="15"></app-icon>
              <span>{{ isScanning() ? 'Escaneando Plano CAD...' : 'Iniciar Auto-Detección' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ================================================================ -->
      <!-- MODAL 2: REGISTER NEW SALON MANUALLY                             -->
      <!-- ================================================================ -->
      <div *ngIf="showNewSalonModal()" class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-header">
            <h3>Registrar Nuevo Salón / Recinto</h3>
            <button class="close-btn" (click)="showNewSalonModal.set(false)">✕</button>
          </div>

          <form (ngSubmit)="handleCreateSalon()">
            <div class="form-group">
              <label>Nombre del Salón o Terraza</label>
              <input type="text" [(ngModel)]="newSalonForm.name" name="name" placeholder="Ej. Salón Esmeralda" required>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Tipo de Distribución</label>
                <select [(ngModel)]="newSalonForm.type" name="type">
                  <option value="BANQUET_IMPERIAL">Banquete Imperial (16 Mesas)</option>
                  <option value="WHITE_POLE_TENT">Carpa de Poste 40x60 ft (15 Mesas)</option>
                  <option value="ZAFIRO_ROOM">Salón Colonial Zafiro (6 Mesas)</option>
                  <option value="CUSTOM">Personalizado / Modular</option>
                </select>
              </div>

              <div class="form-group">
                <label>Capacidad Estimada (Personas)</label>
                <input type="number" [(ngModel)]="newSalonForm.totalCapacity" name="totalCapacity" min="20" max="1500" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Ancho (Metros)</label>
                <input type="number" [(ngModel)]="newSalonForm.widthMeters" name="widthMeters" min="5">
              </div>
              <div class="form-group">
                <label>Largo (Metros)</label>
                <input type="number" [(ngModel)]="newSalonForm.lengthMeters" name="lengthMeters" min="5">
              </div>
            </div>

            <div class="form-group">
              <label>Descripción / Observaciones</label>
              <textarea [(ngModel)]="newSalonForm.description" name="description" rows="2" placeholder="Ubicación de escenario, pista y accesos de proveedores."></textarea>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-outline" (click)="showNewSalonModal.set(false)">Cancelar</button>
              <button type="submit" class="btn-action">Guardar y Activar Salón</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ================================================================ -->
      <!-- MODAL 3: ADD TABLE TO ACTIVE SALON                               -->
      <!-- ================================================================ -->
      <div *ngIf="showNewTableModal()" class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-header">
            <h3>Agregar Mesa al Salón Actual</h3>
            <button class="close-btn" (click)="showNewTableModal.set(false)">✕</button>
          </div>

          <form (ngSubmit)="handleCreateTable()">
            <div class="form-group">
              <label>Nombre de la Mesa</label>
              <input type="text" [(ngModel)]="newTableForm.tableName" name="tableName" placeholder="Ej. Mesa 17 (Zona VIP)" required>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Geometría de Mesa</label>
                <select [(ngModel)]="newTableForm.shape" name="shape">
                  <option value="ROUND">Redonda (Banquetera)</option>
                  <option value="RECTANGULAR">Imperial / Rectangular</option>
                </select>
              </div>

              <div class="form-group">
                <label>Capacidad de Comensales (Sillas)</label>
                <input type="number" [(ngModel)]="newTableForm.capacity" name="capacity" min="2" max="24" required>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-outline" (click)="showNewTableModal.set(false)">Cancelar</button>
              <button type="submit" class="btn-action">Insertar en Plano CAD</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ================================================================ -->
      <!-- MODAL 4: PROFESSIONAL PDF EXPORT MODAL                           -->
      <!-- ================================================================ -->
      <div *ngIf="showPdfExportModal()" class="modal-backdrop">
        <div class="modal-box pdf-export-modal">
          <div class="modal-header">
            <h3>Hoja Técnica de Montaje &amp; Croquis Oficial</h3>
            <button class="close-btn" (click)="showPdfExportModal.set(false)">✕</button>
          </div>

          <div class="pdf-print-sheet" id="printableCroquisSheet">
            <div class="sheet-top-header">
              <div class="title-left">
                <span class="badge-tag">EVENPASS ARCHITECTURAL CAD REPORT</span>
                <h1>{{ eventService.selectedEvent()?.name }}</h1>
                <p>ANFITRIÓN: <b>{{ eventService.selectedEvent()?.hostName }}</b> · RECINTO: <b>{{ eventService.currentSalon()?.name }}</b></p>
                <small>FECHA: {{ eventService.selectedEvent()?.eventDate | date:'fullDate' }}</small>
              </div>
              <div class="title-right">
                <div class="metric-block">
                  <span class="num">{{ eventService.currentSalon()?.tables?.length }}</span>
                  <small>MESAS TOTALES</small>
                </div>
                <div class="metric-block">
                  <span class="num">{{ eventService.currentSalon()?.totalCapacity }}</span>
                  <small>AFORO TOTAL</small>
                </div>
              </div>
            </div>

            <div class="sheet-summary-banner">
              RESUMEN DE DISTRIBUCIÓN DE MESAS Y COMENSALES ASIGNADOS
            </div>

            <div class="tables-summary-grid">
              <div *ngFor="let t of eventService.currentSalon()?.tables" class="t-summary-cell">
                <strong>{{ t.tableName }}</strong>
                <span>{{ t.occupiedSeats || 0 }} de {{ t.capacity }} pases ocupados</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-outline" (click)="showPdfExportModal.set(false)">Cerrar</button>
            <button class="btn-outline" (click)="downloadTablesCsv()">
              <app-icon name="download" [size]="15"></app-icon>
              <span>Descargar CSV (Excel)</span>
            </button>
            <button class="btn-action" (click)="downloadCroquisPdf()">
              <app-icon name="download" [size]="15"></app-icon>
              <span>Descargar Dossier Oficial en PDF</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ================================================================ -->
      <!-- MODAL 5: REUBICAR INVITADO A OTRA MESA                           -->
      <!-- ================================================================ -->
      <div *ngIf="showReassignModal()" class="modal-backdrop">
        <div class="modal-box reassign-modal">
          <div class="modal-header">
            <div class="modal-title-with-icon">
              <app-icon name="users" [size]="20"></app-icon>
              <h3>Reubicar Invitado a Otra Mesa</h3>
            </div>
            <button class="close-btn" (click)="showReassignModal.set(false)">✕</button>
          </div>

          <div class="modal-body-content" *ngIf="guestToReassign() as guest">
            <div class="guest-reassign-banner">
              <div>
                <strong>{{ guest.fullName }}</strong>
                <span class="badge-passes" style="margin-left:8px;">{{ guest.totalPasses }} pases</span>
              </div>
              <span>Mesa Actual: <b>{{ guest.assignedTableName || 'Sin asignar' }}</b></span>
            </div>

            <p class="reassign-lead">
              Selecciona la mesa a la que el comensal desea cambiarse (por ejemplo para sentarse junto a otros invitados o familiares):
            </p>

            <div class="tables-reassign-grid">
              <div 
                *ngFor="let t of eventService.currentSalon()?.tables" 
                class="reassign-table-card"
                [class.current-table]="t.id === guest.assignedTableId"
                [class.has-space]="(t.capacity - getTableOccupiedSeats(t)) >= guest.totalPasses"
                [class.is-full]="(t.capacity - getTableOccupiedSeats(t)) < guest.totalPasses"
              >
                <div class="t-card-header">
                  <strong>{{ t.tableName }}</strong>
                  <span class="t-badge-cap" [class.badge-full]="getTableOccupiedSeats(t) >= t.capacity">
                    {{ getTableOccupiedSeats(t) }}/{{ t.capacity }} pases
                  </span>
                </div>

                <div class="t-occupants-preview">
                  <small class="occupants-label">Comensales actuales:</small>
                  <div class="occupants-names">
                    <span *ngIf="getTableOccupantsNames(t.id).length === 0" class="no-one">Mesa vacía</span>
                    <span *ngFor="let name of getTableOccupantsNames(t.id)" class="occ-pill">{{ name }}</span>
                  </div>
                </div>

                <button 
                  class="btn-choose-table"
                  [disabled]="t.id === guest.assignedTableId"
                  (click)="confirmReassign(t.id)"
                >
                  <app-icon name="check" [size]="14"></app-icon>
                  <span>{{ t.id === guest.assignedTableId ? 'Mesa Actual' : 'Mover Aquí' }}</span>
                </button>
              </div>
            </div>

            <div class="modal-reassign-actions" style="margin-top: 16px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 14px;">
              <button type="button" class="btn-outline" (click)="createTableAndReassign(guest)" style="display: inline-flex; align-items: center; gap: 6px;">
                <app-icon name="plus" [size]="14"></app-icon>
                <span>Crear Nueva Mesa y Mover Aquí</span>
              </button>
              <button type="button" class="btn-outline" (click)="showReassignModal.set(false)">Cerrar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ================================================================ -->
      <!-- MODAL 6: MODIFICAR PROPIEDADES DE MESA                           -->
      <!-- ================================================================ -->
      <div *ngIf="showEditTableModal()" class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-header">
            <h3>Modificar Propiedades de Mesa</h3>
            <button class="close-btn" (click)="showEditTableModal.set(false)">✕</button>
          </div>

          <form (ngSubmit)="saveTableEdit()">
            <div class="form-group">
              <label>Nombre de la Mesa</label>
              <input type="text" [(ngModel)]="editTableForm.tableName" name="editTableName" required>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Geometría</label>
                <select [(ngModel)]="editTableForm.shape" name="editTableShape">
                  <option value="ROUND">Redonda (Banquetera)</option>
                  <option value="RECTANGULAR">Imperial / Rectangular</option>
                </select>
              </div>

              <div class="form-group">
                <label>Capacidad (Sillas / Cupos)</label>
                <input type="number" [(ngModel)]="editTableForm.capacity" name="editTableCapacity" min="2" max="30" required>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-outline" (click)="showEditTableModal.set(false)">Cancelar</button>
              <button type="submit" class="btn-action">Guardar Cambios</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ================================================================ -->
      <!-- MODAL 7: MODIFICAR SALÓN ACTUAL                                  -->
      <!-- ================================================================ -->
      <div *ngIf="showEditSalonModal()" class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-header">
            <h3>Modificar Salón / Recinto</h3>
            <button class="close-btn" (click)="showEditSalonModal.set(false)">✕</button>
          </div>

          <form (ngSubmit)="saveSalonEdit()">
            <div class="form-group">
              <label>Nombre del Salón o Espacio</label>
              <input type="text" [(ngModel)]="editSalonForm.name" name="editSalonName" required>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Aforo Total Estimado</label>
                <input type="number" [(ngModel)]="editSalonForm.totalCapacity" name="editSalonCap" min="10" max="2500" required>
              </div>
              <div class="form-group">
                <label>Ancho (Metros)</label>
                <input type="number" [(ngModel)]="editSalonForm.widthMeters" name="editSalonWidth" min="4" max="100">
              </div>
              <div class="form-group">
                <label>Largo (Metros)</label>
                <input type="number" [(ngModel)]="editSalonForm.lengthMeters" name="editSalonLength" min="4" max="150">
              </div>
            </div>

            <div class="form-group">
              <label>Descripción / Observaciones del Recinto</label>
              <textarea [(ngModel)]="editSalonForm.description" name="editSalonDesc" rows="2"></textarea>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-outline" (click)="showEditSalonModal.set(false)">Cancelar</button>
              <button type="submit" class="btn-action">Guardar Datos del Salón</button>
            </div>
          </form>
        </div>
      </div>

      </ng-container>

    </div>
  `,
  styles: [`
    .croquis-workspace-container {
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

    /* Restricted Mode When Event Plan Does Not Include Croquis */
    .croquis-restricted-wrapper {
      padding: 30px 10px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 65vh;
    }

    .restricted-card-box {
      max-width: 820px;
      width: 100%;
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-xl, 18px);
      padding: 40px 48px;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.1);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .restricted-icon-bubble {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(2, 132, 199, 0.08);
      border: 1px solid rgba(2, 132, 199, 0.25);
      color: var(--brand-blue, #0284c7);
      display: grid;
      place-items: center;
      position: relative;
      margin-bottom: 20px;
    }

    .lock-pill-badge {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #f59e0b;
      color: #fff;
      display: grid;
      place-items: center;
      border: 2px solid var(--bg-card);
    }

    .plan-tag-strip {
      margin-bottom: 12px;
    }

    .plan-name-badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 1px;
      padding: 4px 12px;
      border-radius: 9999px;
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
    }

    .restricted-card-box h2 {
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0 0 12px;
    }

    .restricted-lead {
      font-size: 0.95rem;
      color: var(--text-secondary);
      max-width: 660px;
      line-height: 1.6;
      margin: 0 0 28px;
    }

    .plan-lock-status-box {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      border-radius: var(--radius-md, 12px);
      margin-bottom: 24px;
      text-align: left;
      max-width: 660px;
      width: 100%;
    }

    .plan-lock-status-box.window-open {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: var(--text-main);
    }

    .plan-lock-status-box.window-closed {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: var(--text-main);
    }

    .status-icon-col {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    .window-open .status-icon-col {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }

    .window-closed .status-icon-col {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    .status-text-col strong {
      display: block;
      font-size: 0.95rem;
      font-weight: 800;
      margin-bottom: 3px;
    }

    .status-text-col p {
      font-size: 0.84rem;
      margin: 0;
      opacity: 0.9;
      line-height: 1.4;
    }

    .restricted-actions-row {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .btn-upgrade-plan-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: var(--radius-md, 10px);
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      font-weight: 700;
      font-size: 0.92rem;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
      transition: all 0.2s;
    }

    .btn-upgrade-plan-action:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(2, 132, 199, 0.45);
    }

    .btn-return-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 11px 20px;
      border-radius: var(--radius-md, 10px);
      background: transparent;
      border: 1px solid var(--border-ui);
      color: var(--text-main);
      font-weight: 600;
      font-size: 0.88rem;
      text-decoration: none;
      transition: all 0.2s;
    }

    .btn-return-link:hover {
      background: var(--bg-input);
      border-color: var(--brand-blue);
    }

    /* Venue Header Selection Card */
    .salon-selection-header-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      flex-wrap: wrap;
      box-shadow: var(--shadow-sm);
    }

    .salon-title-col {
      flex: 1;
      min-width: 280px;
    }

    .salon-eyebrow {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.78rem;
      color: var(--text-muted);
      margin-bottom: 6px;
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

    .salon-name-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .salon-name-wrap h2 {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .salon-spec-pill {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      padding: 3px 10px;
      border-radius: var(--radius-full);
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--brand-blue);
    }

    .salon-desc {
      font-size: 0.84rem;
      color: var(--text-muted);
      margin-top: 6px;
      max-width: 680px;
    }

    .salon-actions-col {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: flex-end;
    }

    .venue-pills-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .venue-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: var(--radius-full);
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      color: var(--text-secondary);
      font-size: 0.82rem;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .venue-pill-btn:hover {
      border-color: var(--brand-blue);
      color: var(--brand-blue);
    }

    .venue-pill-btn.active {
      background: var(--brand-blue);
      border-color: var(--brand-blue);
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.3);
    }

    .croquis-primary-actions-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* Algorithm Summary Banner */
    .algorithm-summary-banner {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: var(--radius-md);
      padding: 12px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      color: #047857;
      animation: fadeIn 0.3s ease;
    }

    [data-theme="dark"] .algorithm-summary-banner {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.4);
      color: #34d399;
    }

    .banner-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .banner-close {
      color: inherit;
      padding: 4px;
      border-radius: 50%;
    }

    /* Main Grid */
    .croquis-main-grid {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 20px;
      align-items: start;
    }

    /* Blueprint Canvas Card */
    .blueprint-canvas-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: var(--shadow-sm);
    }

    .canvas-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-ui);
    }

    .bp-title {
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: var(--text-main);
    }

    .zoom-pill-controls {
      display: flex;
      align-items: center;
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-full);
      padding: 3px 6px;
      gap: 4px;
    }

    .zoom-btn {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: var(--text-secondary);
      font-weight: 700;
      font-size: 0.78rem;
    }

    .zoom-btn:hover {
      background: var(--border-ui);
      color: var(--text-main);
    }

    .zoom-level-text {
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0 4px;
      min-width: 42px;
      text-align: center;
      color: var(--text-main);
    }

    .status-legend-row {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 0.76rem;
      color: var(--text-muted);
    }

    .leg-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .leg-box.round {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 1px solid #475569;
    }

    .leg-box.rect {
      width: 14px;
      height: 10px;
      border-radius: 2px;
      border: 1px solid #475569;
    }

    .leg-dot.occupied {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
    }

    .leg-dot.free {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #f8fafc;
      border: 1px solid #94a3b8;
    }

    /* SVG Viewport */
    .svg-scroll-viewport {
      width: 100%;
      min-height: 640px;
      max-height: 820px;
      overflow: auto;
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      background: var(--bg-input);
      display: flex;
      justify-content: center;
      padding: 24px;
    }

    .svg-canvas-wrapper {
      transform-origin: top center;
      transition: transform 0.2s ease-out;
    }

    .architectural-svg {
      width: 600px;
      height: auto;
      display: block;
      color: var(--text-main);
    }

    /* Table Inspector Sidebar Card */
    .table-inspector-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: var(--shadow-sm);
      position: sticky;
      top: 80px;
    }

    .inspector-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid var(--border-ui);
      padding-bottom: 14px;
    }

    .inspector-header h3 {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .inspector-header p {
      font-size: 0.85rem;
      color: var(--brand-blue);
      font-weight: 700;
      margin-top: 2px;
    }

    .table-stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 16px;
    }

    .stat-box {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-sm);
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .stat-label {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .stat-val {
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .text-danger { color: #ef4444 !important; }
    .text-success { color: #10b981 !important; }

    /* Fine-Tuning Box & Direct Canvas Nudge */
    .fine-tuning-box {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-sm);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .fine-tuning-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .fine-tuning-title {
      font-size: 0.8rem;
      font-weight: 800;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .coords-pill {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--brand-blue);
      background: var(--brand-blue-light);
      padding: 2px 8px;
      border-radius: 4px;
      font-family: monospace;
    }

    .nudge-controls-wrap {
      display: flex;
      gap: 14px;
      align-items: center;
    }

    .nudge-pad {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
    }

    .nudge-row {
      display: flex;
      gap: 3px;
    }

    .nudge-btn {
      width: 28px;
      height: 28px;
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: 4px;
      color: var(--text-main);
      font-weight: 800;
      font-size: 0.85rem;
      cursor: pointer;
      display: grid;
      place-items: center;
      transition: all 0.15s;
    }

    .nudge-btn:hover {
      background: var(--brand-blue);
      color: #fff;
      border-color: var(--brand-blue);
    }

    .nudge-btn.center-dot {
      color: var(--text-muted);
      cursor: default;
    }

    .direct-coords-inputs {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }

    .coord-field {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .coord-field label {
      font-size: 0.74rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .coord-field input {
      width: 75px;
      padding: 4px 8px;
      font-size: 0.82rem;
      font-weight: 700;
      font-family: monospace;
      text-align: right;
    }

    .nudge-hint {
      font-size: 0.72rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 5px;
      line-height: 1.3;
    }

    .table-cad-group.is-dragging {
      opacity: 0.85;
      filter: drop-shadow(0 10px 15px rgba(2, 132, 199, 0.4));
      cursor: grabbing !important;
    }

    .seated-guests-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .section-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-title-row h4 {
      font-size: 0.9rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .guests-seating-scroll {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 220px;
      overflow-y: auto;
    }

    .empty-seating-box {
      text-align: center;
      padding: 24px 12px;
      background: var(--bg-input);
      border: 1px dashed var(--border-ui);
      border-radius: var(--radius-md);
      color: var(--text-muted);
    }

    .empty-seating-box p {
      font-size: 0.84rem;
      font-weight: 700;
      margin: 8px 0 2px;
      color: var(--text-main);
    }

    .empty-seating-box small {
      font-size: 0.75rem;
    }

    .seated-guest-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-sm);
      padding: 8px 12px;
    }

    .guest-info-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .guest-name {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .badge-passes {
      background: var(--brand-blue-light);
      color: var(--brand-blue);
      font-size: 0.7rem;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 4px;
    }

    .guest-diet {
      font-size: 0.74rem;
      color: #d97706;
      font-weight: 600;
    }

    .guest-phone {
      font-size: 0.74rem;
      color: var(--text-muted);
    }

    .btn-unseat {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: var(--text-muted);
      transition: all 0.2s;
    }

    .btn-unseat:hover {
      background: #fee2e2;
      color: #ef4444;
    }

    /* Guest Row Actions */
    .guest-row-btns {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-reassign-guest {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 4px;
      background: transparent;
      border: 1px solid var(--border-ui);
      color: var(--brand-blue);
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-reassign-guest:hover {
      background: var(--brand-blue);
      color: #fff;
      border-color: var(--brand-blue);
    }

    /* Overcapacity Alert Banner */
    .overcapacity-banner {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.35);
      border-radius: var(--radius-sm);
      padding: 12px 14px;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .overcap-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #ef4444;
      font-size: 0.88rem;
    }

    .overcapacity-banner p {
      margin: 0;
      font-size: 0.78rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .btn-resolve-overcap {
      align-self: flex-start;
      margin-top: 4px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 6px;
      background: #ef4444;
      color: #ffffff;
      font-size: 0.76rem;
      font-weight: 700;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-resolve-overcap:hover {
      background: #dc2626;
    }

    /* Reassign Modal Grid */
    .reassign-modal {
      max-width: 680px;
      width: 95%;
    }

    .guest-reassign-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 12px;
      font-size: 0.88rem;
    }

    .reassign-lead {
      font-size: 0.82rem;
      color: var(--text-secondary);
      margin-bottom: 14px;
    }

    .tables-reassign-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
      max-height: 380px;
      overflow-y: auto;
      padding: 4px;
    }

    .reassign-table-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: all 0.2s;
    }

    .reassign-table-card.current-table {
      border-color: var(--brand-blue);
      background: rgba(2, 132, 199, 0.05);
    }

    .reassign-table-card.has-space {
      border-left: 3px solid #10b981;
    }

    .reassign-table-card.is-full {
      border-left: 3px solid #ef4444;
      opacity: 0.85;
    }

    .t-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .t-badge-cap {
      font-size: 0.72rem;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 999px;
      background: #dcfce7;
      color: #15803d;
    }

    .t-badge-cap.badge-full {
      background: #fee2e2;
      color: #b91c1c;
    }

    .t-occupants-preview {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .occupants-names {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 4px;
    }

    .occ-pill {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.7rem;
      color: var(--text-main);
    }

    .no-one {
      font-style: italic;
      color: var(--text-muted);
    }

    .btn-choose-table {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 6px;
      background: var(--brand-blue);
      color: #fff;
      font-size: 0.78rem;
      font-weight: 700;
      border: none;
      cursor: pointer;
      margin-top: auto;
      transition: all 0.2s;
    }

    .btn-choose-table:disabled {
      background: var(--bg-input);
      color: var(--text-muted);
      cursor: not-allowed;
      border: 1px solid var(--border-ui);
    }

    .btn-choose-table:hover:not(:disabled) {
      filter: brightness(1.1);
    }

    /* Quick Seat */
    .quick-seat-section {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-sm);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .quick-seat-section label {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .seat-picker-row {
      display: flex;
      gap: 6px;
    }

    .seat-select {
      flex: 1;
      padding: 6px 10px;
      font-size: 0.82rem;
    }

    .btn-seat-confirm {
      padding: 6px 14px;
      font-size: 0.82rem;
      white-space: nowrap;
    }

    .table-management-actions {
      border-top: 1px solid var(--border-ui);
      padding-top: 14px;
      margin-top: 8px;
    }

    .btn-danger-action {
      width: 100%;
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.4);
    }

    .btn-danger-action:hover {
      background: #fee2e2;
      border-color: #ef4444;
    }

    /* Modal Styling */
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
      max-width: 580px;
      box-shadow: var(--shadow-hover);
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-ui);
      padding-bottom: 12px;
    }

    .modal-title-with-icon {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--brand-blue);
    }

    .modal-title-with-icon h3 {
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .close-btn {
      font-size: 1.2rem;
      color: var(--text-muted);
    }

    .modal-intro {
      font-size: 0.85rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .presets-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 8px 0 14px;
    }

    .preset-card {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-sm);
      padding: 10px 8px;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s;
    }

    .preset-card.selected {
      border-color: var(--brand-blue);
      background: var(--brand-blue-light);
    }

    .preset-name {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .preset-card small {
      font-size: 0.68rem;
      color: var(--text-muted);
      display: block;
      margin-top: 3px;
    }

    .file-upload-dropzone {
      border: 2px dashed var(--border-ui);
      border-radius: var(--radius-md);
      padding: 24px;
      text-align: center;
      position: relative;
      background: var(--bg-input);
      overflow: hidden;
      cursor: pointer;
    }

    .file-input-hidden {
      display: none;
    }

    .dropzone-label {
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: var(--text-muted);
    }

    .dropzone-label strong {
      color: var(--text-main);
      font-size: 0.9rem;
    }

    .dropzone-label small {
      font-size: 0.75rem;
    }

    /* Laser Scanner HUD Effect */
    .scanner-laser-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: #0284c7;
      box-shadow: 0 0 14px #38bdf8, 0 0 28px #0284c7;
      animation: laserScan 1.6s infinite ease-in-out alternate;
    }

    @keyframes laserScan {
      0% { top: 5%; }
      100% { top: 92%; }
    }

    .scanning-feedback-box {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .scan-step-text {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--brand-blue);
    }

    .progress-track {
      height: 6px;
      background: var(--border-ui);
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #0284c7, #10b981);
      transition: width 0.3s ease;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .form-group label {
      font-size: 0.82rem;
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

    /* PDF Print Sheet */
    .pdf-export-modal {
      max-width: 760px;
    }

    .pdf-print-sheet {
      background: #ffffff;
      color: #0f172a;
      border: 1px solid #cbd5e1;
      padding: 24px;
      border-radius: var(--radius-sm);
    }

    .sheet-top-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
    }

    .sheet-top-header h1 {
      font-size: 1.4rem;
      font-weight: 900;
      margin: 4px 0;
    }

    .metric-block {
      text-align: center;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 6px 14px;
      border-radius: 4px;
      display: inline-block;
      margin-left: 8px;
    }

    .metric-block .num {
      display: block;
      font-size: 1.3rem;
      font-weight: 900;
    }

    .metric-block small {
      font-size: 0.65rem;
      font-weight: 800;
      color: #64748b;
    }

    .sheet-summary-banner {
      background: #0f172a;
      color: #ffffff;
      padding: 6px 12px;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 1px;
      text-align: center;
      margin-bottom: 14px;
    }

    .tables-summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .t-summary-cell {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .t-summary-cell strong {
      font-size: 0.8rem;
      color: #0f172a;
    }

    .t-summary-cell span {
      font-size: 0.72rem;
      color: #64748b;
    }

    @media (max-width: 1024px) {
      .croquis-main-grid {
        grid-template-columns: 1fr;
      }
      .presets-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CroquisComponent {
  zoomScale = signal<number>(1.0);
  selectedTable = signal<SalonTable | null>(null);

  // Real-time reactive selected table synchronized with currentSalon
  activeSelectedTable = computed<SalonTable | null>(() => {
    const sel = this.selectedTable();
    if (!sel) return null;
    const curSalon = this.eventService.currentSalon();
    return curSalon?.tables.find(t => t.id === sel.id) || sel;
  });
  lastAssignmentResult = signal<any | null>(null);
  guestToSeatId: number | null = null;

  // Drag and Drop state
  isDragging = signal(false);
  draggedTable: SalonTable | null = null;
  dragStartPointerX = 0;
  dragStartPointerY = 0;
  dragStartTableX = 0;
  dragStartTableY = 0;
  hasMoved = false;

  // Modals state
  showPdfExportModal = signal(false);
  showAiModal = signal(false);
  showNewSalonModal = signal(false);
  showNewTableModal = signal(false);
  showReassignModal = signal(false);
  showEditTableModal = signal(false);
  showEditSalonModal = signal(false);

  guestToReassign = signal<Guest | null>(null);

  // AI Scanner state
  isScanning = signal(false);
  scanningProgress = signal(0);
  scanningStepText = signal('Iniciando calibración...');
  aiSelectedPreset = signal<SalonType>('WHITE_POLE_TENT');
  aiSalonName: string = 'Carpa Real Imperial 40x60';

  // Forms
  newSalonForm: Partial<Salon> = {
    name: '',
    type: 'BANQUET_IMPERIAL',
    totalCapacity: 150,
    widthMeters: 30,
    lengthMeters: 20,
    description: ''
  };

  newTableForm: Partial<SalonTable> = {
    tableName: '',
    shape: 'ROUND',
    capacity: 10
  };

  editTableForm: Partial<SalonTable> = {};
  editSalonForm: Partial<Salon> = {};

  constructor(
    public eventService: EventService,
    private notificationService: NotificationService
  ) {
    const tables = this.eventService.currentSalon()?.tables || [];
    if (tables.length > 0) {
      this.selectedTable.set(tables[0]);
    }
  }

  onSelectSalon(salonId: number): void {
    this.eventService.selectSalon(salonId);
    const tables = this.eventService.currentSalon()?.tables || [];
    this.selectedTable.set(tables.length > 0 ? tables[0] : null);
  }

  zoomIn(): void {
    this.zoomScale.update(z => Math.min(1.8, z + 0.15));
  }

  zoomOut(): void {
    this.zoomScale.update(z => Math.max(0.6, z - 0.15));
  }

  resetZoom(): void {
    this.zoomScale.set(1.0);
  }

  selectTable(table: SalonTable): void {
    this.selectedTable.set(table);
  }

  isRectTable(t: SalonTable | null | undefined): boolean {
    if (!t) return false;
    const s = String(t.shape || '').toUpperCase();
    return s.includes('RECT') || s.includes('IMPERIAL');
  }

  // FIXED RELIABLE GUEST LOOKUP FOR SELECTED TABLE (Purely reactive from eventGuests signal)
  getGuestsForSelectedTable(): Guest[] {
    const t = this.activeSelectedTable();
    if (!t) return [];
    return this.eventService.eventGuests().filter(g => 
      (g.assignedTableId != null && Number(g.assignedTableId) === Number(t.id)) ||
      (g.assignedTableName && g.assignedTableName.toLowerCase().trim() === t.tableName.toLowerCase().trim()) ||
      (g.assignedTableName && new RegExp(`\\b(mesa|table)\\s*0*${t.tableNumber}\\b`, 'i').test(g.assignedTableName))
    );
  }

  getSeatedGuestsPassesCount(): number {
    return this.getTableOccupiedSeats(this.activeSelectedTable());
  }

  getUnassignedGuests(): Guest[] {
    return this.eventService.eventGuests().filter(g => !g.assignedTableId && g.status !== 'DECLINED');
  }

  handleManualSeatGuest(): void {
    const t = this.selectedTable();
    if (!t || !this.guestToSeatId) return;

    this.eventService.assignTableToGuest(this.guestToSeatId, t.id);
    this.guestToSeatId = null;
  }

  unassignGuest(guestId: number): void {
    this.eventService.unassignGuestTable(guestId);
  }

  runAutoAssign(): void {
    const res = this.eventService.autoAssignTables();
    this.lastAssignmentResult.set(res);
  }

  handleDeleteCurrentTable(): void {
    const t = this.selectedTable();
    if (!t) return;
    this.eventService.deleteTableFromCurrentSalon(t.id);
    const tables = this.eventService.currentSalon()?.tables || [];
    this.selectedTable.set(tables.length > 0 ? tables[0] : null);
  }

  // --- AI DETECTOR METHODS ---
  openAiDetectorModal(): void {
    this.isScanning.set(false);
    this.scanningProgress.set(0);
    this.showAiModal.set(true);
  }

  selectAiPreset(type: SalonType): void {
    this.aiSelectedPreset.set(type);
    if (type === 'WHITE_POLE_TENT') {
      this.aiSalonName = 'Carpa Real 40x60 White Pole Tent';
    } else if (type === 'ZAFIRO_ROOM') {
      this.aiSalonName = 'Salón Zafiro Banquet Room';
    } else {
      this.aiSalonName = 'Salón Real Imperial';
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.aiSalonName = `Plano Detectado - ${file.name.replace(/\.[^/.]+$/, "")}`;
      this.notificationService.show('info', 'Archivo Cargado', `Listo para procesar "${file.name}"`);
    }
  }

  runAiDetection(): void {
    this.isScanning.set(true);
    this.scanningProgress.set(10);
    this.scanningStepText.set('Calibrando escala métrica y vectores del plano...');

    setTimeout(() => {
      this.scanningProgress.set(40);
      this.scanningStepText.set('Analizando geometría: detectando mesas redondas y pistas...');
    }, 700);

    setTimeout(() => {
      this.scanningProgress.set(75);
      this.scanningStepText.set('Vectorizando coordenadas de sillas y zonas de servicio...');
    }, 1400);

    setTimeout(() => {
      this.scanningProgress.set(100);
      this.scanningStepText.set('¡Detección completada con éxito!');

      const preset = this.aiSelectedPreset();
      const tableCount = preset === 'WHITE_POLE_TENT' ? 15 : (preset === 'ZAFIRO_ROOM' ? 6 : 16);
      
      const imported = this.eventService.importCroquisWithAiDetection(
        this.aiSalonName || 'Recinto Importado CAD',
        preset,
        tableCount
      );

      this.isScanning.set(false);
      this.showAiModal.set(false);
      this.selectedTable.set(imported.tables[0] || null);
    }, 2100);
  }

  // --- MANUAL CREATION METHODS ---
  handleCreateSalon(): void {
    if (!this.newSalonForm.name) return;
    const s = this.eventService.registerSalon(this.newSalonForm);
    this.showNewSalonModal.set(false);
    this.selectedTable.set(s.tables[0] || null);
    this.newSalonForm = {
      name: '',
      type: 'BANQUET_IMPERIAL',
      totalCapacity: 150,
      widthMeters: 30,
      lengthMeters: 20
    };
  }

  handleCreateTable(): void {
    if (!this.newTableForm.tableName) return;
    const created = this.eventService.addTableToCurrentSalon(this.newTableForm);
    this.showNewTableModal.set(false);
    if (created) {
      this.selectedTable.set(created);
    }
    this.newTableForm = {
      tableName: '',
      shape: 'ROUND',
      capacity: 10
    };
  }

  // --- DRAG AND DROP & FINE TUNING POSITIONING ---
  onTablePointerDown(event: PointerEvent, table: SalonTable): void {
    event.stopPropagation();
    this.selectedTable.set(table);
    if (this.eventService.isEventLocked()) {
      return; // Locked event mode
    }
    this.draggedTable = table;
    this.dragStartPointerX = event.clientX;
    this.dragStartPointerY = event.clientY;
    this.dragStartTableX = table.posX;
    this.dragStartTableY = table.posY;
    this.isDragging.set(true);
    this.hasMoved = false;
  }

  @HostListener('window:pointermove', ['$event'])
  onWindowPointerMove(event: PointerEvent): void {
    if (!this.isDragging() || !this.draggedTable) return;

    const dx = (event.clientX - this.dragStartPointerX) / this.zoomScale();
    const dy = (event.clientY - this.dragStartPointerY) / this.zoomScale();

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      this.hasMoved = true;
    }

    const newX = Math.max(30, Math.min(570, Math.round(this.dragStartTableX + dx)));
    const newY = Math.max(30, Math.min(830, Math.round(this.dragStartTableY + dy)));

    this.eventService.updateTableInCurrentSalon(this.draggedTable.id, { posX: newX, posY: newY }, true);
    this.selectedTable.set({ ...this.draggedTable, posX: newX, posY: newY });
  }

  @HostListener('window:pointerup', ['$event'])
  onWindowPointerUp(event: PointerEvent): void {
    if (!this.isDragging() || !this.draggedTable) return;

    if (this.hasMoved) {
      this.notificationService.show('success', 'Mesa Reubicada', `Se guardó la nueva posición de ${this.draggedTable.tableName}.`);
    }
    this.isDragging.set(false);
    this.draggedTable = null;
    this.hasMoved = false;
  }

  nudgeTable(dx: number, dy: number): void {
    const t = this.selectedTable();
    if (!t) return;
    const newX = Math.max(20, Math.min(580, t.posX + dx));
    const newY = Math.max(20, Math.min(840, t.posY + dy));
    this.eventService.updateTableInCurrentSalon(t.id, { posX: newX, posY: newY });
    this.selectedTable.set({ ...t, posX: newX, posY: newY });
  }

  setTableCoord(axis: 'posX' | 'posY', value: number): void {
    const t = this.selectedTable();
    if (!t || isNaN(value)) return;
    const num = Math.max(20, Math.min(axis === 'posX' ? 580 : 840, Number(value)));
    this.eventService.updateTableInCurrentSalon(t.id, { [axis]: num });
    this.selectedTable.set({ ...t, [axis]: num });
  }

  // --- PLAN RESTRICTION & UPGRADE ---
  isCroquisIncluded(): boolean {
    const ev = this.eventService.selectedEvent();
    if (!ev) return false;
    // Only available in Plan Premium CAD or when explicitly hasCroquis === true and not BASIC
    return ev.tierPlan === 'PREMIUM' && ev.hasCroquis !== false;
  }

  canUpgrade() {
    return this.eventService.canUpgradePlan(this.eventService.selectedEvent());
  }

  getTableOccupiedSeats(table: SalonTable | null | undefined): number {
    if (!table) return 0;
    const curTable = this.eventService.currentSalon()?.tables.find(t => t.id === table.id) || table;
    return curTable.occupiedSeats ?? 0;
  }

  getTableRawOccupiedSeats(table: SalonTable | null | undefined): number {
    if (!table) return 0;
    const curTable = this.eventService.currentSalon()?.tables.find(t => t.id === table.id) || table;
    return curTable.occupiedSeats ?? 0;
  }

  isOvercapacity(table: SalonTable | null): boolean {
    if (!table) return false;
    const curTable = this.eventService.currentSalon()?.tables.find(t => t.id === table.id) || table;
    return (curTable.occupiedSeats ?? 0) > curTable.capacity;
  }

  resolveOvercapacity(table: SalonTable): void {
    const healed = this.eventService.enforceSalonCapacityAndBalance();
    if (healed) {
      this.notificationService.show(
        'success',
        'Sobrecupo Resuelto',
        'Se reubicaron los comensales excedentes automáticamente a mesas con cupo disponible o nuevas mesas.'
      );
    } else {
      this.notificationService.show('info', 'Aforo Correcto', 'La mesa ya respeta el aforo de comensales.');
    }
  }

  openReassignModal(guest: Guest): void {
    this.guestToReassign.set(guest);
    this.showReassignModal.set(true);
  }

  confirmReassign(targetTableId: number): void {
    const g = this.guestToReassign();
    if (!g) return;
    const ok = this.eventService.reassignGuestToTable(g.id, targetTableId);
    if (ok) {
      this.showReassignModal.set(false);
      this.guestToReassign.set(null);
      const target = this.eventService.currentSalon()?.tables.find(t => t.id === targetTableId);
      if (target) {
        this.selectedTable.set(target);
      }
    }
  }

  createTableAndReassign(guest: Guest): void {
    const cur = this.eventService.currentSalon();
    const nextNum = (cur && cur.tables.length > 0) ? Math.max(...cur.tables.map(t => t.tableNumber)) + 1 : 1;
    const newT = this.eventService.addTableToCurrentSalon({
      tableName: `Mesa ${nextNum < 10 ? '0' + nextNum : nextNum} (Nueva)`,
      shape: 'ROUND',
      capacity: 10
    });
    if (newT) {
      this.confirmReassign(newT.id);
    }
  }

  getTableOccupantsNames(tableId: number): string[] {
    return this.eventService.eventGuests()
      .filter(g => g.assignedTableId === tableId)
      .map(g => `${g.fullName} (${g.totalPasses}p)`);
  }

  openEditTableModal(): void {
    const t = this.selectedTable();
    if (!t) return;
    this.editTableForm = {
      tableName: t.tableName,
      shape: t.shape,
      capacity: t.capacity
    };
    this.showEditTableModal.set(true);
  }

  saveTableEdit(): void {
    const t = this.selectedTable();
    if (!t || !this.editTableForm.tableName) return;
    const newCap = Number(this.editTableForm.capacity) || 10;
    const rawShape = String(this.editTableForm.shape || 'ROUND').toUpperCase();
    const newShape: 'ROUND' | 'RECTANGULAR' = (rawShape.includes('RECT') || rawShape.includes('IMPERIAL')) ? 'RECTANGULAR' : 'ROUND';
    const newName = this.editTableForm.tableName;

    this.eventService.updateTableInCurrentSalon(t.id, {
      tableName: newName,
      shape: newShape,
      capacity: newCap
    });

    this.selectedTable.set({
      ...t,
      tableName: newName,
      shape: newShape,
      capacity: newCap
    });

    this.showEditTableModal.set(false);
    this.notificationService.show('success', 'Mesa Modificada', `Se guardaron los cambios para ${newName}.`);
  }

  openEditSalonModal(): void {
    const s = this.eventService.currentSalon();
    if (!s) return;
    this.editSalonForm = {
      name: s.name,
      totalCapacity: s.totalCapacity,
      widthMeters: s.widthMeters,
      lengthMeters: s.lengthMeters,
      description: s.description
    };
    this.showEditSalonModal.set(true);
  }

  saveSalonEdit(): void {
    const s = this.eventService.currentSalon();
    if (!s || !this.editSalonForm.name) return;

    this.eventService.updateSalonDetails(s.id, {
      name: this.editSalonForm.name,
      totalCapacity: Number(this.editSalonForm.totalCapacity) || 150,
      widthMeters: Number(this.editSalonForm.widthMeters) || 30,
      lengthMeters: Number(this.editSalonForm.lengthMeters) || 20,
      description: this.editSalonForm.description
    });

    this.showEditSalonModal.set(false);
  }

  upgradeCurrentEventToPremium(): void {
    const ev = this.eventService.selectedEvent();
    if (ev) {
      ev.tierPlan = 'PREMIUM';
      ev.hasCroquis = true;
      this.notificationService.show(
        'success',
        '¡Plan Actualizado a Premium CAD!',
        `Se desbloqueó el módulo de Croquis arquitectónico y asignación de mesas para "${ev.name}".`
      );
    }
  }

  downloadCroquisPdf(): void {
    this.showPdfExportModal.set(false);
    const ev = this.eventService.selectedEvent();
    const salon = this.eventService.currentSalon();
    const tables = salon?.tables || [];
    const guests = this.eventService.eventGuests();

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // 1. Header Bar
    doc.setFillColor(2, 132, 199);
    doc.rect(0, 0, 297, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('EVENPASS ENTERPRISE CAD OS', 14, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('HOJA TÉCNICA DE MONTAJE ARQUITECTÓNICO & DISTRIBUCIÓN DE MESAS', 14, 18);

    doc.setFontSize(8);
    doc.text(`EMISIÓN: ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX')}`, 283, 15, { align: 'right' });

    // 2. Event & Salon Meta
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(ev?.name || 'Evento Oficial', 14, 35);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Anfitrión: ', 14, 42);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(ev?.hostName || 'Cliente', 32, 42);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Recinto: ', 95, 42);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${salon?.name} (${salon?.widthMeters}m × ${salon?.lengthMeters}m)`, 110, 42);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Aforo Total: ', 190, 42);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${salon?.totalCapacity} personas (${tables.length} mesas)`, 210, 42);

    // 3. Table Grid Header
    let tableY = 48;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, tableY, 269, 7.5, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('MESA', 16, tableY + 5);
    doc.text('GEOMETRÍA', 42, tableY + 5);
    doc.text('CAPACIDAD', 75, tableY + 5);
    doc.text('OCUPADOS', 105, tableY + 5);
    doc.text('LIBRES', 132, tableY + 5);
    doc.text('COMENSALES ASIGNADOS (PASES CONFIRMADOS)', 158, tableY + 5);

    tableY += 7.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    tables.forEach((t, index) => {
      if (tableY > 185) {
        doc.addPage();
        tableY = 18;
        doc.setFillColor(241, 245, 249);
        doc.rect(14, tableY, 269, 7.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text('MESA', 16, tableY + 5);
        doc.text('GEOMETRÍA', 42, tableY + 5);
        doc.text('CAPACIDAD', 75, tableY + 5);
        doc.text('OCUPADOS', 105, tableY + 5);
        doc.text('LIBRES', 132, tableY + 5);
        doc.text('COMENSALES ASIGNADOS (PASES CONFIRMADOS)', 158, tableY + 5);
        tableY += 7.5;
      }

      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, tableY, 269, 6.5, 'F');
      }

      const seated = guests.filter(g =>
        (g.assignedTableId != null && Number(g.assignedTableId) === Number(t.id)) ||
        (g.assignedTableName && g.assignedTableName.toLowerCase().trim() === t.tableName.toLowerCase().trim()) ||
        (g.assignedTableName && new RegExp(`\\b(mesa|table)\\s*0*${t.tableNumber}\\b`, 'i').test(g.assignedTableName))
      );
      const names = seated.map(g => `${g.fullName} (${g.totalPasses}p)`).join(', ') || 'Sin comensales asignados';

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(t.tableName, 16, tableY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(t.shape === 'ROUND' ? 'Redonda (10p)' : 'Imperial / Honor', 42, tableY + 4.5);
      doc.text(`${t.capacity} asientos`, 75, tableY + 4.5);
      doc.text(`${t.occupiedSeats || 0} pases`, 105, tableY + 4.5);
      doc.text(`${Math.max(0, t.capacity - (t.occupiedSeats || 0))} cupos`, 132, tableY + 4.5);

      doc.setTextColor(15, 23, 42);
      doc.text(names.slice(0, 75), 158, tableY + 4.5);

      tableY += 6.5;
    });

    // 4. Footer
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 195, 283, 195);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('EvenPass Architectural CAD Engine · Hoja Oficial de Montaje para Jefes de Piso y Banqueteros', 14, 200);
    doc.text('Documento PDF Generado Digitalmente', 283, 200, { align: 'right' });

    const safeName = (ev?.name || 'Evento').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    doc.save(`EvenPass_Dossier_Montaje_${safeName}.pdf`);
    this.notificationService.show('success', 'PDF Descargado', 'El Dossier Oficial de Montaje se descargó directamente en tu dispositivo.');
  }

  downloadTablesCsv(): void {
    this.showPdfExportModal.set(false);
    const ev = this.eventService.selectedEvent();
    const salon = this.eventService.currentSalon();
    const tables = salon?.tables || [];
    const guests = this.eventService.eventGuests();

    let csvContent = '\uFEFFMesa,Geometría,Capacidad,Pases Ocupados,Asientos Libres,Comensales Asignados\n';
    tables.forEach(t => {
      const seated = guests.filter(g => 
        (g.assignedTableId != null && Number(g.assignedTableId) === Number(t.id)) ||
        (g.assignedTableName && g.assignedTableName.toLowerCase().trim() === t.tableName.toLowerCase().trim()) ||
        (g.assignedTableName && new RegExp(`\\b(mesa|table)\\s*0*${t.tableNumber}\\b`, 'i').test(g.assignedTableName))
      );
      const names = seated.map(g => `${g.fullName} (${g.totalPasses}p)`).join('; ') || 'Ninguno';
      const row = [
        `"${t.tableName}"`,
        `"${t.shape === 'ROUND' ? 'Redonda' : 'Imperial'}"`,
        t.capacity,
        t.occupiedSeats || 0,
        Math.max(0, t.capacity - (t.occupiedSeats || 0)),
        `"${names}"`
      ].join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EvenPass_Distribucion_Mesas_${(ev?.name || 'Evento').replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.notificationService.show('success', 'CSV Descargado', 'El archivo de distribución de mesas se guardó en tu equipo.');
  }
}
