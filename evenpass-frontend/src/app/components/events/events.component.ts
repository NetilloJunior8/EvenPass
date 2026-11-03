import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EventService } from '../../services/event.service';
import { EventItem, EventStatus, ExternalAuditEntry } from '../../models/models';
import { NotificationService } from '../../services/notification.service';
import { IconComponent } from '../icon.component';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="events-catalog-container">

      <!-- Catalog Header -->
      <div class="catalog-header-card">
        <div>
          <h2>Catálogo de Eventos</h2>
          <p>Selecciona un evento para ingresar a su panel operativo, plano arquitectónico, invitados e itinerario.</p>
        </div>

        <button class="btn-action" (click)="showCreateModal.set(true)">
          <app-icon name="plus" [size]="16"></app-icon>
          <span>Crear Nuevo Evento</span>
        </button>
      </div>

      <!-- Filters Toolbar -->
      <div class="catalog-filters-bar">
        <div class="status-filter-pills">
          <button class="filter-pill" [class.active]="selectedStatus() === 'ALL'" (click)="selectedStatus.set('ALL')">
            Todos ({{ eventService.events().length }})
          </button>
          <button class="filter-pill" [class.active]="selectedStatus() === 'EN_PROGRESO'" (click)="selectedStatus.set('EN_PROGRESO')">
            En Progreso
          </button>
          <button class="filter-pill" [class.active]="selectedStatus() === 'PENDIENTE'" (click)="selectedStatus.set('PENDIENTE')">
            Pendientes
          </button>
          <button class="filter-pill" [class.active]="selectedStatus() === 'FINALIZADO'" (click)="selectedStatus.set('FINALIZADO')">
            Finalizados
          </button>
        </div>

        <div class="search-box">
          <app-icon name="search" [size]="16"></app-icon>
          <input type="text" [(ngModel)]="searchQuery" placeholder="Buscar por evento, anfitrión o salón...">
        </div>
      </div>

      <!-- Event Cards Grid -->
      <div class="events-grid">
        <div *ngFor="let ev of filteredEvents()" class="event-card-box" [class.active-selected]="eventService.activeEventId() === ev.id">
          
          <!-- Card Top Bar: Type & External Status -->
          <div class="card-status-row">
            <div class="card-status-left">
              <span class="event-type-tag">{{ ev.eventType }}</span>
              <span class="plan-pill" [ngClass]="'plan-' + (ev.tierPlan || 'PREMIUM').toLowerCase()">
                {{ ev.tierPlan === 'BASIC' ? 'Básico' : (ev.tierPlan === 'STANDARD' ? 'Estándar' : 'Premium CAD') }}
              </span>
            </div>
            
            <span class="badge" [ngClass]="{
              'badge-in-progress': ev.status === 'EN_PROGRESO',
              'badge-pending': ev.status === 'PENDIENTE',
              'badge-completed': ev.status === 'FINALIZADO'
            }">
              {{ ev.status === 'EN_PROGRESO' ? 'En Progreso' : (ev.status === 'PENDIENTE' ? 'Pendiente' : 'Finalizado') }}
            </span>
          </div>

          <!-- Main Info: Title & Host Name -->
          <div class="event-title-block">
            <h3 class="ev-name">{{ ev.name }}</h3>
            <div class="host-pill">
              <app-icon name="user" [size]="13"></app-icon>
              <span>Anfitrión: <b>{{ ev.hostName }}</b></span>
            </div>
          </div>

          <!-- Venue & Date Meta -->
          <div class="ev-meta-list">
            <div class="meta-item">
              <app-icon name="calendar" [size]="14"></app-icon>
              <span>{{ ev.eventDate | date:'mediumDate' }} · {{ ev.eventDate | date:'shortTime' }}</span>
            </div>
            <div class="meta-item">
              <app-icon name="map-pin" [size]="14"></app-icon>
              <span class="venue-truncate">{{ ev.venueName }}</span>
            </div>
          </div>

          <!-- Capacity & Attendance Progress -->
          <div class="ev-progress-section">
            <div class="prog-labels">
              <span>Asistencia &amp; Confirmación</span>
              <b>{{ ev.confirmedGuests }} / {{ ev.maxCapacity }} personas</b>
            </div>
            <div class="prog-bar-track">
              <div class="prog-bar-fill" [style.width.%]="(ev.confirmedGuests / ev.maxCapacity) * 100"></div>
            </div>
          </div>

          <!-- Card Actions: Enter into Event's specific management -->
          <div class="card-footer-actions">
            <div class="features-micro-row">
              <span *ngIf="ev.hasCroquis" class="badge-micro"><app-icon name="croquis" [size]="12"></app-icon> Croquis</span>
              <span *ngIf="ev.hasScanner" class="badge-micro"><app-icon name="camera" [size]="12"></app-icon> Escáner</span>
              <span *ngIf="ev.numTables" class="badge-micro">{{ ev.numTables }} Mesas</span>
            </div>
            <div class="card-btns-row">
              <button class="btn-action-outline btn-sm" (click)="quickSyncEvent(ev)" title="Sincronizar confirmaciones en tiempo real">
                <app-icon name="refresh" [size]="13"></app-icon>
                <span>Sincronizar</span>
              </button>
              <button class="btn-action btn-sm btn-enter-event" (click)="enterEventWorkspace(ev)">
                <span>Entrar</span>
                <app-icon name="arrow-right" [size]="14"></app-icon>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Event Modal -->
      <div *ngIf="showCreateModal()" class="modal-backdrop">
        <div class="modal-box modal-wide">
          <div class="modal-header">
            <div>
              <h3>Registrar Nuevo Evento</h3>
              <p class="modal-subtitle">Configura datos generales, modalidad de invitación, croquis arquitectónico y personal de acceso.</p>
            </div>
            <button class="close-btn" (click)="showCreateModal.set(false)">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <!-- Smart Autocomplete & NLP Ingestion Component -->
          <div class="smart-ingestion-container">
            <div class="ingestion-header-bar" (click)="showImportDrawer.set(!showImportDrawer())">
              <div class="ingestion-header-left">
                <div class="nlp-icon-badge">
                  <app-icon name="sparkles" [size]="16"></app-icon>
                </div>
                <div>
                  <div class="ingestion-title">
                    <span>Motor de Autocompletado Inteligente</span>
                    <span class="badge-nlp-tag">NLP &amp; WhatsApp</span>
                  </div>
                  <p class="ingestion-subtext">Carga cotizaciones de clientes, mensajes de WhatsApp o archivos .txt en 1 clic</p>
                </div>
              </div>

              <div class="ingestion-header-right">
                <button type="button" class="btn-toggle-drawer">
                  <span>{{ showImportDrawer() ? 'Minimizar' : 'Desplegar' }}</span>
                  <app-icon [name]="showImportDrawer() ? 'x' : 'arrow-right'" [size]="14"></app-icon>
                </button>
              </div>
            </div>

            <!-- Ingestion Body Content -->
            <div *ngIf="showImportDrawer()" class="ingestion-body">
              
              <!-- Tabs / Source Options -->
              <div class="ingestion-tabs">
                <button type="button" class="tab-btn" [class.active]="importTab() === 'TEXT'" (click)="importTab.set('TEXT')">
                  <app-icon name="edit" [size]="13"></app-icon>
                  <span>Pegar Texto o WhatsApp</span>
                </button>
                <button type="button" class="tab-btn" [class.active]="importTab() === 'FILE'" (click)="importTab.set('FILE'); txtFileInput.click()">
                  <app-icon name="upload" [size]="13"></app-icon>
                  <span>Subir Archivo .txt / Cotización</span>
                </button>
                <button type="button" class="tab-btn" [class.active]="importTab() === 'SAMPLE'" (click)="importTab.set('SAMPLE')">
                  <app-icon name="sparkles" [size]="13"></app-icon>
                  <span>Cargar Ejemplo de Prueba</span>
                </button>
              </div>

              <!-- Sample Presets Row (if SAMPLE tab) -->
              <div *ngIf="importTab() === 'SAMPLE'" class="sample-pills-row">
                <span class="sample-label">Prueba con 1 clic:</span>
                <button type="button" class="sample-pill-btn" (click)="loadSampleWhatsAppText('boda')">
                  💍 Boda Mariana &amp; Roberto (220 pax)
                </button>
                <button type="button" class="sample-pill-btn" (click)="loadSampleWhatsAppText('xv')">
                  👑 XV Años Valeria (160 pax)
                </button>
                <button type="button" class="sample-pill-btn" (click)="loadSampleWhatsAppText('bautizo')">
                  🕊️ Bautizo Santiago (35 pax)
                </button>
              </div>

              <!-- Dropzone & Text Area -->
              <div 
                class="ingestion-input-zone" 
                [class.drag-over]="isDraggingFile()"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDropFile($event)"
              >
                <textarea 
                  [(ngModel)]="importRawText" 
                  name="rawImportText" 
                  rows="3" 
                  placeholder="Pega aquí el mensaje del cliente de WhatsApp o cotización... (ej. Hola soy Mariana Garza López, queremos cotizar Boda para 220 personas en Salón Zafiro con 22 mesas...)"
                ></textarea>
                
                <input type="file" accept=".txt,.json,.csv" #txtFileInput style="display:none" (change)="onImportTxtFile($event)">
              </div>

              <!-- Live Entity Detection HUD -->
              <div *ngIf="getDetectedPreview() as prev" class="detection-hud-strip">
                <div class="hud-status-badge">
                  <span class="pulse-dot-green"></span>
                  <span>Datos Identificados en Vivo:</span>
                </div>
                <div class="hud-tags-row">
                  <span class="hud-chip"><b>Evento:</b> {{ prev.type }}</span>
                  <span class="hud-chip"><b>Anfitrión:</b> {{ prev.host }}</span>
                  <span class="hud-chip"><b>Recinto:</b> {{ prev.venue }}</span>
                  <span class="hud-chip"><b>Aforo:</b> {{ prev.capacity }}</span>
                  <span class="hud-chip"><b>Mesas:</b> {{ prev.tables }}</span>
                  <span class="hud-chip chip-plan"><b>Plan Sugerido:</b> {{ prev.plan }}</span>
                </div>
              </div>

              <!-- Ingestion Action Footer -->
              <div class="ingestion-action-bar">
                <button type="button" *ngIf="importRawText" class="btn-clear-raw" (click)="importRawText = ''">
                  <app-icon name="x" [size]="12"></app-icon>
                  <span>Limpiar Texto</span>
                </button>

                <div class="action-buttons-right">
                  <button type="button" class="btn-outline btn-sm" (click)="txtFileInput.click()">
                    <app-icon name="upload" [size]="13"></app-icon>
                    <span>Seleccionar .txt</span>
                  </button>

                  <button 
                    type="button" 
                    class="btn-execute-ingestion" 
                    (click)="parseAndFillFromText(importRawText)"
                    [disabled]="!importRawText.trim()"
                  >
                    <app-icon name="sparkles" [size]="14"></app-icon>
                    <span>⚡ Aplicar Datos al Formulario</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          <form (ngSubmit)="handleCreateEvent()">
            <div class="form-row">
              <div class="form-field">
                <label>Nombre del Evento</label>
                <input type="text" [(ngModel)]="newEvent.name" name="name" placeholder="Ej. Boda Camila &amp; Javier" required>
              </div>

              <div class="form-field">
                <label>Nombre del Anfitrión / Responsable</label>
                <input type="text" [(ngModel)]="newEvent.hostName" name="hostName" placeholder="Ej. Familia Garza López" required>
              </div>
            </div>

            <div class="form-row">
              <!-- Dynamic Event Type Catalog + Custom Option -->
              <div class="form-field">
                <label>Tipo de Evento</label>
                <select [(ngModel)]="selectedTypeChoice" name="typeChoice" (change)="onTypeChoiceChange()">
                  <option *ngFor="let t of eventService.eventTypes()" [value]="t">{{ t }}</option>
                  <option value="CUSTOM_TYPE">+ Escribir Otro Tipo Personalizado...</option>
                </select>
                <div *ngIf="selectedTypeChoice === 'CUSTOM_TYPE'" class="custom-type-input-wrap">
                  <input 
                    type="text" 
                    [(ngModel)]="customTypeInput" 
                    name="customTypeInput" 
                    placeholder="Escribe la categoría (ej. Fiesta Temática, Jubilación...)"
                    (keyup.enter)="saveCustomType()"
                  >
                  <button type="button" class="btn-action btn-xs" (click)="saveCustomType()">Guardar</button>
                </div>
              </div>

              <div class="form-field">
                <label>Estado del Evento</label>
                <select [(ngModel)]="newEvent.status" name="status">
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="EN_PROGRESO">En Progreso</option>
                  <option value="FINALIZADO">Finalizado</option>
                </select>
              </div>
            </div>

            <!-- Modalidad de Invitación (Internal Template, External URL, None) -->
            <div class="form-field">
              <label>Modalidad de Invitación</label>
              <div class="invitation-modes-grid">
                <label class="inv-mode-card" [class.selected]="newEvent.invitationMode === 'TEMPLATE'">
                  <input type="radio" [(ngModel)]="newEvent.invitationMode" name="invMode" value="TEMPLATE">
                  <div class="inv-mode-info">
                    <strong>Plantilla Digital EvenPass</strong>
                    <small>Diseño predeterminado con RSVP y pase QR</small>
                  </div>
                </label>

                <label class="inv-mode-card" [class.selected]="newEvent.invitationMode === 'EXTERNAL_URL'">
                  <input type="radio" [(ngModel)]="newEvent.invitationMode" name="invMode" value="EXTERNAL_URL">
                  <div class="inv-mode-info">
                    <strong>Vincular Invitación Externa (URL Web Propia)</strong>
                    <small>Enlace web personalizado + Webhook de sincronización</small>
                  </div>
                </label>

                <label class="inv-mode-card" [class.selected]="newEvent.invitationMode === 'NONE'">
                  <input type="radio" [(ngModel)]="newEvent.invitationMode" name="invMode" value="NONE">
                  <div class="inv-mode-info">
                    <strong>Sin Invitación Digital</strong>
                    <small>Solo control de salón y escáner de pases en puerta</small>
                  </div>
                </label>
              </div>
            </div>

            <!-- If TEMPLATE, show Template Picker -->
            <div *ngIf="newEvent.invitationMode === 'TEMPLATE'" class="form-field">
              <label>Plantilla de Invitación EvenPass</label>
              <select [(ngModel)]="newEvent.templateSlug" name="templateSlug">
                <option *ngFor="let tpl of eventService.templates()" [value]="tpl.slug">
                  {{ tpl.name }} ({{ tpl.category }})
                </option>
                <option value="CUSTOM_NEW">✨ + Otra Plantilla / Nueva Personalizada</option>
              </select>
            </div>

            <!-- If CUSTOM_NEW, show custom template fields -->
            <div *ngIf="newEvent.invitationMode === 'TEMPLATE' && newEvent.templateSlug === 'CUSTOM_NEW'" class="custom-template-box">
              <div class="form-row">
                <div class="form-field">
                  <label>Nombre del Nuevo Diseño</label>
                  <input type="text" [(ngModel)]="customTemplateForm.name" name="customTplName" placeholder="Ej. Boda Rústica Boho Chic" required>
                </div>
                <div class="form-field">
                  <label>Categoría / Estilo</label>
                  <input type="text" [(ngModel)]="customTemplateForm.category" name="customTplCat" placeholder="Ej. Boda / Jardín">
                </div>
              </div>
              <div class="form-field">
                <label>Descripción / Observaciones Visuales</label>
                <input type="text" [(ngModel)]="customTemplateForm.description" name="customTplDesc" placeholder="Paleta de colores, tipografía especial o música de fondo recomendada">
              </div>
              <div class="save-catalog-checkbox-row">
                <label class="chk-label">
                  <input type="checkbox" [(ngModel)]="saveCustomTemplateToCatalog" name="saveToCatalog">
                  <span><b>Guardar esta plantilla en el catálogo de ejemplos</b> para futuros eventos</span>
                </label>
              </div>
            </div>

            <!-- If EXTERNAL_URL, show URL & Sync Webhook Key -->
            <div *ngIf="newEvent.invitationMode === 'EXTERNAL_URL'" class="external-inv-box">
              <div class="form-field">
                <label>URL de la Invitación Web Externa</label>
                <input 
                  type="url" 
                  [(ngModel)]="newEvent.externalInvitationUrl" 
                  name="externalUrl" 
                  placeholder="https://bodacamila.com o enlace de Canva / Notion"
                >
              </div>
              <div class="form-field">
                <label>Clave Webhook de Sincronización RSVP (Para recibir confirmaciones externas)</label>
                <div class="webhook-key-row">
                  <input type="text" [(ngModel)]="newEvent.webhookSyncKey" name="webhookKey" readonly>
                  <button type="button" class="btn-outline btn-xs" (click)="regenerateWebhookKey()">Regenerar Clave</button>
                </div>
                <small class="text-muted">Los invitados que confirmen en tu sitio web externo se sincronizarán en EvenPass usando este token.</small>
              </div>
            </div>

            <!-- Tier Plan Selector -->
            <div class="form-field">
              <label>Nivel de Plan Contratado</label>
              <div class="tier-plans-grid">
                <label class="tier-plan-card" [class.selected]="newEvent.tierPlan === 'PREMIUM'">
                  <input type="radio" [(ngModel)]="newEvent.tierPlan" name="tierPlan" value="PREMIUM" (change)="onTierChange('PREMIUM')">
                  <div class="plan-info">
                    <strong>Plan Premium CAD</strong>
                    <small>RSVP + Escáner + Croquis Mesas</small>
                  </div>
                </label>
                <label class="tier-plan-card" [class.selected]="newEvent.tierPlan === 'STANDARD'">
                  <input type="radio" [(ngModel)]="newEvent.tierPlan" name="tierPlan" value="STANDARD" (change)="onTierChange('STANDARD')">
                  <div class="plan-info">
                    <strong>Plan Estándar</strong>
                    <small>RSVP + Escáner Puerta (Sin Croquis)</small>
                  </div>
                </label>
                <label class="tier-plan-card" [class.selected]="newEvent.tierPlan === 'BASIC'">
                  <input type="radio" [(ngModel)]="newEvent.tierPlan" name="tierPlan" value="BASIC" (change)="onTierChange('BASIC')">
                  <div class="plan-info">
                    <strong>Plan Básico</strong>
                    <small>RSVP Digital &amp; Pases (Sin Escáner)</small>
                  </div>
                </label>
              </div>
            </div>

            <!-- Optional Salon & Croquis Configuration -->
            <div *ngIf="newEvent.hasCroquis" class="croquis-plan-config-box">
              <div class="form-row">
                <div class="form-field">
                  <label>Recinto o Salón del Evento</label>
                  <select [(ngModel)]="selectedSalonMode" name="salonMode">
                    <option *ngFor="let s of eventService.salons()" [value]="s.id">
                      {{ s.name }} ({{ s.tables.length }} mesas · {{ s.totalCapacity }} aforo)
                    </option>
                    <option value="NEW_SALON">+ Registrar Nuevo Salón Personalizado</option>
                  </select>
                </div>

                <div class="form-field">
                  <label>Número Estimado de Mesas</label>
                  <input type="number" [(ngModel)]="newEvent.numTables" name="numTables" min="1" max="150">
                </div>
              </div>

              <!-- New Salon Custom Fields -->
              <div *ngIf="selectedSalonMode === 'NEW_SALON'" class="custom-salon-box">
                <div class="form-field">
                  <label>Nombre del Nuevo Recinto / Salón / Terraza</label>
                  <input type="text" [(ngModel)]="customSalonName" name="customSalonName" placeholder="Ej. Jardín Las Palmas / Salón Diamante" required>
                </div>
                <div class="form-field">
                  <label>Plano CAD o Croquis en PDF / Imagen (Opcional)</label>
                  <input type="file" (change)="onCroquisFileSelected($event)" accept="image/*,application/pdf" class="file-picker-input">
                  <small *ngIf="customCroquisFileName" class="text-success font-bold">✓ Archivo cargado: {{ customCroquisFileName }}</small>
                  <small *ngIf="!customCroquisFileName" class="text-muted">Si subes un boceto arquitectónico en PDF o imagen, el sistema lo vectorizará para manipular las mesas.</small>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label>Capacidad Máxima (Aforo)</label>
                <input type="number" [(ngModel)]="newEvent.maxCapacity" name="maxCapacity" value="250">
              </div>

              <div class="form-field">
                <label>Fecha y Hora del Evento</label>
                <input type="datetime-local" [(ngModel)]="newEvent.eventDate" name="eventDate">
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-outline" (click)="showCreateModal.set(false)">Cancelar</button>
              <button type="submit" class="btn-action">Crear y Abrir Evento</button>
            </div>
          </form>
        </div>
      </div>



    </div>
  `,
  styles: [`
    .events-catalog-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .catalog-header-card {
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

    .catalog-header-card h2 {
      font-size: 1.3rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .catalog-header-card p {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 3px;
    }

    .catalog-filters-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
    }

    .status-filter-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .filter-pill {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      padding: 7px 16px;
      border-radius: var(--radius-full);
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-secondary);
      transition: all 0.15s;
    }

    .filter-pill:hover, .filter-pill.active {
      background: var(--brand-blue-light);
      color: var(--brand-blue);
      border-color: var(--brand-blue);
    }

    .search-box {
      position: relative;
      width: min(300px, 100%);
      display: flex;
      align-items: center;
    }

    .search-box app-icon {
      position: absolute;
      left: 14px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .search-box input {
      padding-left: 38px;
      height: 38px;
      border-radius: var(--radius-full);
      font-size: 0.85rem;
    }

    /* Cards Grid */
    .events-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 20px;
    }

    .event-card-box {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 22px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      transition: all 0.2s;
      position: relative;
    }

    .event-card-box:hover {
      box-shadow: var(--shadow-hover);
      transform: translateY(-2px);
    }

    .event-card-box.active-selected {
      border-color: #0284c7;
      box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.2);
    }

    .card-status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .event-type-tag {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .badge-in-progress { background: #e0f2fe; color: #0284c7; }
    .badge-pending { background: #fef3c7; color: #b45309; }
    .badge-completed { background: #ecfdf5; color: #059669; }

    .ev-name {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text-main);
      margin-bottom: 4px;
    }

    .host-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 0.78rem;
      color: var(--text-secondary);
      margin-bottom: 14px;
    }

    .ev-meta-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 12px 0;
      border-top: 1px solid var(--border-ui);
      border-bottom: 1px solid var(--border-ui);
      margin-bottom: 16px;
      font-size: 0.82rem;
      color: var(--text-muted);
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .venue-truncate {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 280px;
    }

    .ev-progress-section {
      margin-bottom: 18px;
    }

    .prog-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 5px;
    }

    .prog-bar-track {
      height: 6px;
      background: var(--border-ui);
      border-radius: 10px;
      overflow: hidden;
    }

    .prog-bar-fill {
      height: 100%;
      background: #0284c7;
      border-radius: 10px;
    }

    .card-footer-actions {
      display: flex;
      justify-content: flex-end;
    }

    .btn-enter-event {
      width: 100%;
      gap: 8px;
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
      width: min(520px, 100%);
      padding: 26px;
      box-shadow: var(--shadow-hover);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }

    .modal-header h3 {
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .close-btn { font-size: 1.2rem; color: var(--text-muted); cursor: pointer; }
    .card-status-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .plan-pill {
      font-size: 0.68rem;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .plan-premium {
      background: rgba(14, 165, 233, 0.15);
      color: #0284c7;
      border: 1px solid rgba(2, 132, 199, 0.3);
    }

    .plan-standard {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .plan-basic {
      background: rgba(148, 163, 184, 0.15);
      color: #64748b;
      border: 1px solid rgba(148, 163, 184, 0.3);
    }

    .features-micro-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .badge-micro {
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--text-muted);
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .tier-plans-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .tier-plan-card {
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-sm);
      padding: 10px 8px;
      cursor: pointer;
      display: flex;
      gap: 8px;
      align-items: flex-start;
      background: var(--bg-input);
      transition: all 0.2s;
    }

    .tier-plan-card.selected {
      border-color: var(--brand-blue);
      background: var(--brand-blue-light);
    }

    .tier-plan-card input {
      margin-top: 3px;
    }

    .plan-info {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .plan-info strong {
      font-size: 0.78rem;
      color: var(--text-main);
    }

    .plan-info small {
      font-size: 0.68rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .modal-wide {
      max-width: 680px;
      width: 95%;
    }

    .modal-subtitle {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    /* Smart Ingestion & NLP Component */
    .smart-ingestion-container {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      margin-bottom: 20px;
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      transition: all 0.25s ease;
    }

    .smart-ingestion-container:hover {
      border-color: var(--brand-blue);
      box-shadow: 0 4px 18px rgba(2, 132, 199, 0.12);
    }

    .ingestion-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: var(--bg-input);
      cursor: pointer;
      user-select: none;
      transition: background 0.15s;
    }

    .ingestion-header-bar:hover {
      background: rgba(14, 165, 233, 0.08);
    }

    .ingestion-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .nlp-icon-badge {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.3);
    }

    .ingestion-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ingestion-title span {
      font-size: 0.86rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .badge-nlp-tag {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 9999px;
      background: rgba(14, 165, 233, 0.15);
      color: #0284c7;
      border: 1px solid rgba(14, 165, 233, 0.3);
    }

    .ingestion-subtext {
      font-size: 0.74rem;
      color: var(--text-muted);
      margin: 2px 0 0 0;
    }

    .btn-toggle-drawer {
      background: transparent;
      border: 1px solid var(--border-ui);
      padding: 5px 12px;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-main);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-toggle-drawer:hover {
      border-color: var(--brand-blue);
      color: var(--brand-blue);
    }

    .ingestion-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      border-top: 1px solid var(--border-ui);
    }

    .ingestion-tabs {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .tab-btn {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      font-size: 0.76rem;
      font-weight: 600;
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .tab-btn:hover {
      color: var(--text-main);
      border-color: var(--text-muted);
    }

    .tab-btn.active {
      background: var(--brand-blue-light);
      border-color: var(--brand-blue);
      color: var(--brand-blue);
    }

    .sample-pills-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      background: var(--bg-input);
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      border: 1px dashed var(--border-ui);
    }

    .sample-label {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .sample-pill-btn {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--text-main);
      cursor: pointer;
      transition: all 0.15s;
    }

    .sample-pill-btn:hover {
      background: var(--brand-blue);
      color: #fff;
      border-color: var(--brand-blue);
    }

    .ingestion-input-zone {
      position: relative;
      border-radius: var(--radius-md);
      transition: all 0.2s;
    }

    .ingestion-input-zone.drag-over {
      outline: 2px dashed var(--brand-blue);
      outline-offset: 4px;
    }

    .ingestion-input-zone textarea {
      width: 100%;
      font-size: 0.82rem;
      line-height: 1.5;
      padding: 10px 12px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-ui);
      background: var(--bg-input);
      color: var(--text-main);
      resize: vertical;
      font-family: inherit;
      transition: border-color 0.2s;
    }

    .ingestion-input-zone textarea:focus {
      border-color: var(--brand-blue);
      outline: none;
    }

    .detection-hud-strip {
      background: rgba(15, 23, 42, 0.04);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    :host-context([data-theme='dark']) .detection-hud-strip {
      background: rgba(2, 6, 23, 0.6);
      border-color: rgba(255, 255, 255, 0.08);
    }

    .hud-status-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .pulse-dot-green {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      display: inline-block;
    }

    .hud-tags-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .hud-chip {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 0.74rem;
      color: var(--text-main);
    }

    .hud-chip b {
      color: var(--text-muted);
      font-weight: 600;
      margin-right: 4px;
    }

    .hud-chip.chip-plan {
      background: rgba(2, 132, 199, 0.12);
      border-color: rgba(2, 132, 199, 0.4);
      color: #0284c7;
      font-weight: 700;
    }

    .ingestion-action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-top: 4px;
    }

    .btn-clear-raw {
      background: transparent;
      border: none;
      font-size: 0.74rem;
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      padding: 4px 6px;
    }

    .btn-clear-raw:hover {
      color: #ef4444;
    }

    .action-buttons-right {
      display: flex;
      gap: 8px;
      margin-left: auto;
    }

    .btn-execute-ingestion {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #fff;
      border: none;
      border-radius: var(--radius-md);
      padding: 8px 16px;
      font-size: 0.8rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(2, 132, 199, 0.35);
      transition: all 0.2s;
    }

    .btn-execute-ingestion:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.45);
    }

    .btn-execute-ingestion:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }

    .btn-xs {
      padding: 5px 12px;
      font-size: 0.75rem;
    }

    .custom-type-input-wrap {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }

    .custom-type-input-wrap input {
      flex: 1;
    }

    .invitation-modes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
    }

    .inv-mode-card {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      padding: 10px 12px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .inv-mode-card.selected {
      border-color: var(--brand-blue);
      background: rgba(14, 165, 233, 0.06);
    }

    .inv-mode-info strong {
      display: block;
      font-size: 0.78rem;
      color: var(--text-main);
    }

    .inv-mode-info small {
      font-size: 0.68rem;
      color: var(--text-muted);
      line-height: 1.2;
      display: block;
      margin-top: 2px;
    }

    .external-inv-box {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      padding: 12px;
      margin-bottom: 14px;
    }

    .custom-template-box {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      padding: 14px;
      margin-bottom: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .save-catalog-checkbox-row {
      margin-top: 4px;
      padding-top: 8px;
      border-top: 1px dashed var(--border-ui);
    }

    .chk-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      cursor: pointer;
      color: var(--text-main);
    }

    .webhook-key-row {
      display: flex;
      gap: 8px;
    }

    .plan-info small {
      font-size: 0.68rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .croquis-plan-config-box {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      padding: 12px;
      margin-bottom: 14px;
    }

    .custom-salon-box {
      border-top: 1px dashed var(--border-ui);
      padding-top: 12px;
      margin-top: 10px;
    }

    .file-picker-input {
      padding: 6px;
      font-size: 0.8rem;
      border: 1px dashed var(--border-ui);
      border-radius: var(--radius-sm);
      background: var(--bg-card);
      cursor: pointer;
    }

    .form-field { margin-bottom: 14px; }
    .form-field label { display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-bottom: 5px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .card-btns-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .btn-action-outline {
      background: transparent;
      border: 1px solid var(--border-ui);
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-main);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }

    .btn-action-outline:hover {
      border-color: var(--brand-blue);
      color: var(--brand-blue);
      background: rgba(14, 165, 233, 0.08);
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

    @media (max-width: 600px) {
      .tier-plans-grid, .form-row, .invitation-modes-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class EventsComponent implements OnInit {
  searchQuery = '';
  selectedStatus = signal<string>('ALL');
  showCreateModal = signal(false);
  showImportDrawer = signal(false);
  showLinkAuditModal = signal(false);
  selectedAuditEvent = signal<EventItem | null>(null);
  tabLinkAudit = signal<'CONNECT' | 'AUDIT'>('CONNECT');
  auditSearchQuery = '';
  importRawText = '';
  importTab = signal<'TEXT' | 'FILE' | 'SAMPLE'>('TEXT');
  isDraggingFile = signal(false);

  selectedTypeChoice = 'Boda';
  customTypeInput = '';

  newEvent: Partial<EventItem> = {
    name: '',
    hostName: '',
    eventType: 'Boda',
    invitationMode: 'TEMPLATE',
    externalInvitationUrl: '',
    webhookSyncKey: 'EP-HOOK-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
    status: 'PENDIENTE',
    maxCapacity: 250,
    venueName: 'Salón Real Imperial',
    templateSlug: 'miriam-isidro',
    tierPlan: 'PREMIUM',
    hasCroquis: true,
    hasScanner: true,
    numTables: 12
  };

  selectedSalonMode: string = '1';
  customSalonName: string = '';
  customCroquisFileName: string = '';

  customTemplateForm = {
    name: '',
    category: '',
    description: ''
  };
  saveCustomTemplateToCatalog: boolean = true;

  constructor(
    public eventService: EventService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    try {
      const pendingJson = localStorage.getItem('evenpass_pending_import_event');
      if (pendingJson) {
        const data = JSON.parse(pendingJson);
        localStorage.removeItem('evenpass_pending_import_event');

        this.newEvent.name = data.name || 'Nuevo Evento Detectado';
        this.newEvent.hostName = data.hostName || 'Cliente';
        this.newEvent.eventType = data.eventType || 'Boda';
        this.selectedTypeChoice = this.newEvent.eventType || 'Boda';
        this.newEvent.venueName = data.venueName || 'Salón Principal';
        this.newEvent.maxCapacity = data.maxCapacity || 200;
        this.newEvent.numTables = data.numTables || 12;
        this.newEvent.tierPlan = data.tierPlan || 'PREMIUM';
        this.newEvent.hasCroquis = data.hasCroquis !== false;
        this.newEvent.hasScanner = data.hasScanner !== false;

        if (data.venueName && !this.eventService.salons().some(s => s.name.toLowerCase() === data.venueName.toLowerCase())) {
          this.selectedSalonMode = 'NEW_SALON';
          this.customSalonName = data.venueName;
        }

        this.showCreateModal.set(true);
        this.notificationService.show(
          'success',
          'Evento Importado de WhatsApp',
          `Se precargaron los datos de "${data.name}" listos para registrar.`
        );
      }
    } catch (err) {
      console.warn('No se pudo procesar evento pendiente:', err);
    }
  }

  onTypeChoiceChange(): void {
    if (this.selectedTypeChoice !== 'CUSTOM_TYPE') {
      this.newEvent.eventType = this.selectedTypeChoice;
    }
  }

  saveCustomType(): void {
    const clean = this.customTypeInput.trim();
    if (!clean) return;
    this.eventService.addCustomEventType(clean);
    this.selectedTypeChoice = clean;
    this.newEvent.eventType = clean;
    this.customTypeInput = '';
  }

  regenerateWebhookKey(): void {
    this.newEvent.webhookSyncKey = 'EP-HOOK-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    this.notificationService.show('info', 'Clave Regenerada', 'Nueva clave webhook asignada.');
  }

  getDetectedPreview() {
    const text = this.importRawText || '';
    if (!text.trim()) return null;

    let detectedType = 'Boda';
    if (/\b(xv|quince|quinceañera|15 años|mis 15|mis 18)\b/i.test(text)) detectedType = 'XV Años';
    else if (/\b(graduaci[oó]n|graduados|titulaci[oó]n|universidad)\b/i.test(text)) detectedType = 'Graduación';
    else if (/\b(cumplea[ñn]os|aniversario)\b/i.test(text)) detectedType = 'Cumpleaños';
    else if (/\b(bautizo|primera comuni[oó]n|comuni[oó]n)\b/i.test(text)) detectedType = 'Bautizo';
    else if (/\b(posada|navidad|navideña|fin de año)\b/i.test(text)) detectedType = 'Posada / Fiesta Navideña';
    else if (/\b(baby shower)\b/i.test(text)) detectedType = 'Baby Shower';
    else if (/\b(corporativo|conferencia|congreso|summit|gala)\b/i.test(text)) detectedType = 'Gala Corporativa / Conferencia';
    else if (/\b(boda|matrimonio|nupcial)\b/i.test(text)) detectedType = 'Boda';

    const hostRegex = /(?:soy|me llamo|a nombre de|anfitri[oó]n(?:a)?(?::)?|cliente(?::)?|habla)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+){1,3})/i;
    const hostMatch = text.match(hostRegex);
    let hostName = hostMatch ? hostMatch[1].trim() : '';
    if (!hostName) {
      const lineHost = /anfitri[oó]n:\s*([^\n\r]+)/i.exec(text);
      if (lineHost) hostName = lineHost[1].trim();
    }

    const lineVenue = /(?:sal[oó]n|sede|lugar|recinto):\s*([^\n\r]+)/i.exec(text);
    let venue = lineVenue ? lineVenue[1].trim() : '';
    if (!venue) {
      const matchVenue = /(?:en\s+|sal[oó]n\s+|hacienda\s+|jard[ií]n\s+|hotel\s+|terraza\s+)([A-ZÁÉÍÓÚÑa-záéíóúñ0-9]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ0-9]+){1,3})/i.exec(text);
      if (matchVenue) venue = matchVenue[0].trim();
    }

    const capMatch = /(?:(\d{2,4})\s*(?:invitados|personas|asistentes|aforo|lugares)|aforo:\s*(\d{2,4}))/i.exec(text);
    let capacity = capMatch ? parseInt(capMatch[1] || capMatch[2], 10) : 0;

    let tables = Math.ceil(capacity / 10);
    const tabMatch = /(\d{1,3})\s*mesas/i.exec(text);
    if (tabMatch) tables = parseInt(tabMatch[1], 10);

    let plan = 'PREMIUM CAD';
    if (capacity && capacity <= 40) plan = 'BÁSICO';
    else if (capacity && capacity <= 120) plan = 'ESTÁNDAR';

    return {
      type: detectedType,
      host: hostName || 'Por detectar',
      venue: venue || 'Por definir',
      capacity: capacity ? `${capacity} personas` : 'Por definir',
      tables: tables > 0 ? `${tables} mesas` : 'Por calcular',
      plan: plan
    };
  }

  loadSampleWhatsAppText(type: 'boda' | 'xv' | 'bautizo'): void {
    if (type === 'boda') {
      this.importRawText = `Hola EvenPass, soy Mariana Garza López. Queremos cotizar la Boda de Mariana & Roberto para el 14 de Noviembre 2026. Esperamos 220 invitados en Salón Zafiro con 22 mesas redondas. Queremos que incluya croquis y pases QR en puerta.`;
    } else if (type === 'xv') {
      this.importRawText = `Buenas tardes, habla Lucía Domínguez. Me gustaría registrar los XV Años de Valeria para 160 personas en Jardín Las Palmas con 16 mesas y control de accesos con escáner.`;
    } else {
      this.importRawText = `Hola, soy Claudia Navarro. Me interesa el paquete para el Bautizo de Santiago en Restaurante Los Cedros, seremos 35 personas familiares.`;
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingFile.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingFile.set(false);
  }

  onDropFile(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingFile.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.importRawText = e.target.result || '';
      };
      reader.readAsText(file);
    }
  }

  onImportTxtFile(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const content = e.target.result || '';
      this.importRawText = content;
      this.parseAndFillFromText(content);
    };
    reader.readAsText(file);
  }

  parseAndFillFromText(rawText: string): void {
    if (!rawText.trim()) {
      this.notificationService.show('warning', 'Texto Vacío', 'Pega el mensaje o sube un archivo .txt con información del evento.');
      return;
    }

    const text = rawText.replace(/\r/g, ' ');

    // 1. Detect Event Type
    let detectedType = 'Boda';
    if (/\b(xv|quince|quinceañera|15 años|mis 15|mis 18)\b/i.test(text)) detectedType = 'XV Años';
    else if (/\b(graduaci[oó]n|graduados|titulaci[oó]n|universidad)\b/i.test(text)) detectedType = 'Graduación';
    else if (/\b(cumplea[ñn]os|aniversario)\b/i.test(text)) detectedType = 'Cumpleaños';
    else if (/\b(bautizo|primera comuni[oó]n|comuni[oó]n)\b/i.test(text)) detectedType = 'Bautizo';
    else if (/\b(posada|navidad|navideña|fin de año)\b/i.test(text)) detectedType = 'Posada / Fiesta Navideña';
    else if (/\b(baby shower)\b/i.test(text)) detectedType = 'Baby Shower';
    else if (/\b(corporativo|conferencia|congreso|summit|gala)\b/i.test(text)) detectedType = 'Gala Corporativa / Conferencia';
    else if (/\b(boda|matrimonio|nupcial)\b/i.test(text)) detectedType = 'Boda';

    this.eventService.addCustomEventType(detectedType);
    this.selectedTypeChoice = detectedType;
    this.newEvent.eventType = detectedType;

    // 2. Detect Host Name
    const hostRegex = /(?:soy|me llamo|a nombre de|anfitri[oó]n(?:a)?(?::)?|cliente(?::)?|habla)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+){1,3})/i;
    const hostMatch = text.match(hostRegex);
    if (hostMatch) {
      this.newEvent.hostName = hostMatch[1].trim();
    } else {
      const lineHost = /anfitri[oó]n:\s*([^\n\r]+)/i.exec(text);
      if (lineHost) this.newEvent.hostName = lineHost[1].trim();
    }

    // 3. Detect Event Name
    const lineEvent = /(?:evento|nombre):\s*([^\n\r]+)/i.exec(text);
    if (lineEvent) {
      this.newEvent.name = lineEvent[1].trim();
    } else if (this.newEvent.hostName) {
      this.newEvent.name = `${detectedType} de ${this.newEvent.hostName}`;
    }

    // 4. Detect Venue
    const lineVenue = /(?:sal[oó]n|sede|lugar|recinto):\s*([^\n\r]+)/i.exec(text);
    if (lineVenue) {
      this.newEvent.venueName = lineVenue[1].trim();
    } else {
      const matchVenue = /(?:en\s+|sal[oó]n\s+|hacienda\s+|jard[ií]n\s+|hotel\s+|terraza\s+)([A-ZÁÉÍÓÚÑa-záéíóúñ0-9]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ0-9]+){1,3})/i.exec(text);
      if (matchVenue) this.newEvent.venueName = matchVenue[0].trim();
    }

    // 5. Detect Capacity
    const capMatch = /(?:(\d{2,4})\s*(?:invitados|personas|asistentes|aforo|lugares)|aforo:\s*(\d{2,4}))/i.exec(text);
    if (capMatch) {
      const val = parseInt(capMatch[1] || capMatch[2], 10);
      if (val > 0) {
        this.newEvent.maxCapacity = val;
        this.newEvent.numTables = Math.ceil(val / 10);
      }
    }

    // 6. Detect Tables
    const tabMatch = /(\d{1,3})\s*mesas/i.exec(text);
    if (tabMatch) {
      this.newEvent.numTables = parseInt(tabMatch[1], 10);
    }

    // Suggest plan based on capacity
    if (this.newEvent.maxCapacity && this.newEvent.maxCapacity > 120) {
      this.onTierChange('PREMIUM');
    } else if (this.newEvent.maxCapacity && this.newEvent.maxCapacity > 40) {
      this.onTierChange('STANDARD');
    } else {
      this.onTierChange('BASIC');
    }

    this.showImportDrawer.set(false);
    this.notificationService.show('success', 'Campos Autocompletados', `Datos de "${this.newEvent.name}" cargados en el formulario.`);
  }

  onTierChange(plan: 'BASIC' | 'STANDARD' | 'PREMIUM'): void {
    this.newEvent.tierPlan = plan;
    if (plan === 'BASIC') {
      this.newEvent.hasCroquis = false;
      this.newEvent.hasScanner = false;
    } else if (plan === 'STANDARD') {
      this.newEvent.hasCroquis = false;
      this.newEvent.hasScanner = true;
    } else {
      this.newEvent.hasCroquis = true;
      this.newEvent.hasScanner = true;
    }
  }

  onCroquisFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.customCroquisFileName = file.name;
      if (!this.customSalonName) {
        this.customSalonName = file.name.replace(/\.[^/.]+$/, "");
      }
      this.notificationService.show('info', 'Plano Adjuntado', `Archivo "${file.name}" cargado para calibración.`);
    }
  }

  filteredEvents(): EventItem[] {
    let list = this.eventService.events();
    const st = this.selectedStatus();
    if (st !== 'ALL') {
      list = list.filter(e => e.status === st);
    }
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.hostName.toLowerCase().includes(q) ||
        e.venueName.toLowerCase().includes(q)
      );
    }
    return list;
  }

  enterEventWorkspace(ev: EventItem): void {
    this.eventService.selectEvent(ev.id);
    this.router.navigate(['/dashboard']);
  }

  handleCreateEvent(): void {
    if (!this.newEvent.name || !this.newEvent.hostName) {
      this.notificationService.show('warning', 'Campos Requeridos', 'Completa el nombre y anfitrión del evento.');
      return;
    }

    let salonId: number | undefined = undefined;
    let venueName = this.newEvent.venueName || 'Salón Principal';
    let capacity = this.newEvent.maxCapacity || 250;

    // Check if registering a new custom salon
    if (this.newEvent.hasCroquis) {
      if (this.selectedSalonMode === 'NEW_SALON') {
        const customName = this.customSalonName.trim() || `${this.newEvent.name} - Salón Principal`;
        const numTables = this.newEvent.numTables || 12;
        const newSalon = this.eventService.importCroquisWithAiDetection(
          customName,
          'CUSTOM',
          numTables
        );
        salonId = newSalon.id;
        venueName = newSalon.name;
        capacity = newSalon.totalCapacity;
      } else {
        const s = this.eventService.salons().find(item => item.id === Number(this.selectedSalonMode)) || this.eventService.salons()[0];
        if (s) {
          salonId = s.id;
          venueName = s.name;
          capacity = this.newEvent.maxCapacity || s.totalCapacity;
        }
      }
    }

    // Check if registering a custom template
    let finalTemplateSlug = this.newEvent.templateSlug || 'miriam-isidro';
    if (this.newEvent.invitationMode === 'TEMPLATE' && this.newEvent.templateSlug === 'CUSTOM_NEW') {
      const customName = this.customTemplateForm.name.trim() || `${this.newEvent.name} - Estilo Personalizado`;
      const customCat = this.customTemplateForm.category.trim() || this.newEvent.eventType || 'Personalizada';
      const customDesc = this.customTemplateForm.description.trim() || 'Diseño exclusivo creado para este evento.';
      finalTemplateSlug = 'custom-' + Math.random().toString(36).substring(2, 8);

      if (this.saveCustomTemplateToCatalog) {
        this.eventService.addCustomTemplate({
          name: customName,
          category: customCat,
          description: customDesc,
          slug: finalTemplateSlug
        });
      }
    }

    const created = this.eventService.addEvent({
      name: this.newEvent.name,
      hostName: this.newEvent.hostName,
      eventType: this.newEvent.eventType || this.selectedTypeChoice || 'Boda',
      invitationMode: this.newEvent.invitationMode || 'TEMPLATE',
      externalInvitationUrl: this.newEvent.externalInvitationUrl,
      webhookSyncKey: this.newEvent.webhookSyncKey,
      venueName: venueName,
      salonId: salonId,
      maxCapacity: capacity,
      status: (this.newEvent.status as EventStatus) || 'PENDIENTE',
      templateSlug: finalTemplateSlug,
      tierPlan: this.newEvent.tierPlan || 'PREMIUM',
      hasCroquis: this.newEvent.hasCroquis !== undefined ? this.newEvent.hasCroquis : true,
      hasScanner: this.newEvent.hasScanner !== undefined ? this.newEvent.hasScanner : true,
      numTables: this.newEvent.numTables || 10
    });

    this.showCreateModal.set(false);
    this.router.navigate(['/dashboard']);
  }

  // --- QUICK 1-CLICK SYNC METHOD ---
  quickSyncEvent(ev: EventItem): void {
    this.eventService.syncWithSupabase(ev.id);
  }

  openLinkAuditModal(ev: EventItem): void {
    this.quickSyncEvent(ev);
  }

  getPublicRsvpUrl(): string {
    const ev = this.selectedAuditEvent() || this.eventService.selectedEvent();
    if (!ev) return 'https://evenpass.io/rsvp/evento';
    const key = ev.webhookSyncKey || 'EP-HOOK';
    return `https://evenpass.io/rsvp/${ev.id}?key=${key}`;
  }

  getEmbedScriptCode(): string {
    const ev = this.selectedAuditEvent() || this.eventService.selectedEvent();
    const key = ev?.webhookSyncKey || 'EP-HOOK';
    return `<script src="https://evenpass.io/embed.js" data-event-key="${key}"></script>`;
  }

  getApiEndpointSample(): string {
    const ev = this.selectedAuditEvent() || this.eventService.selectedEvent();
    const id = ev?.id || 1;
    const key = ev?.webhookSyncKey || 'EP-HOOK-SECRET';
    return `curl -X POST https://api.evenpass.io/v1/events/${id}/sync-rsvp \\\n  -H "Authorization: Bearer ${key}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"guestName": "Carlos Mendoza", "totalPasses": 2, "phone": "6671234567"}'`;
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

  googleSheetInputUrl: string = '';

  syncSupabaseNow(): void {
    const ev = this.selectedAuditEvent() || this.eventService.selectedEvent();
    if (ev) {
      this.eventService.syncWithSupabase(ev.id);
      this.tabLinkAudit.set('AUDIT');
    }
  }

  async syncGoogleSheetNow(): Promise<void> {
    const ev = this.selectedAuditEvent() || this.eventService.selectedEvent();
    if (ev) {
      await this.eventService.syncWithGoogleSheet(ev.id, this.googleSheetInputUrl);
      this.tabLinkAudit.set('AUDIT');
    }
  }

  getSupabaseSampleCode(): string {
    const ev = this.selectedAuditEvent() || this.eventService.selectedEvent();
    const id = ev?.id || 1;
    return `// Inserción de confirmación RSVP en tu invitación web:\nconst { data, error } = await supabase\n  .from('guests')\n  .insert([{\n    event_id: ${id},\n    full_name: nombreInvitado,\n    total_passes: numeroDePases,\n    phone: telefonoInvitado,\n    status: 'CONFIRMED'\n  }]);`;
  }

  getSqlSchemaCode(): string {
    return `-- Esquema oficial para tabla de invitados en Supabase (PostgreSQL)\nCREATE TABLE IF NOT EXISTS public.guests (\n  id BIGSERIAL PRIMARY KEY,\n  event_id BIGINT NOT NULL,\n  full_name TEXT NOT NULL,\n  total_passes INT NOT NULL DEFAULT 1,\n  phone TEXT,\n  status TEXT NOT NULL DEFAULT 'CONFIRMED',\n  assigned_table TEXT,\n  qr_code TEXT,\n  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n);\n\n-- Índice para consultas en tiempo real filtradas por evento\nCREATE INDEX IF NOT EXISTS idx_guests_event_id ON public.guests(event_id);`;
  }

  triggerSimulatedRsvp(source: 'SUPABASE' | 'GOOGLE_SHEETS' | 'CANVA_QR' | 'WEBHOOK_API' | 'EMBED_WIDGET'): void {
    const ev = this.selectedAuditEvent() || this.eventService.selectedEvent();
    if (ev) {
      this.eventService.simulateExternalRsvp(ev.id, source);
      this.tabLinkAudit.set('AUDIT');
    }
  }

  filteredAuditEntries(): ExternalAuditEntry[] {
    const ev = this.selectedAuditEvent() || this.eventService.selectedEvent();
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
    const ev = this.selectedAuditEvent() || this.eventService.selectedEvent();
    if (!ev) return 0;
    const list = this.eventService.allAuditEntries().filter(a => a.eventId === ev.id);
    if (type === 'ALL') return list.length;
    if (type === 'CHECKED_IN') return list.filter(a => a.status === 'CHECKED_IN').length;
    return list.filter(a => a.source === type).length;
  }
}
