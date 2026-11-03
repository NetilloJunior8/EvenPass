import { Component, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../services/event.service';
import { InvitationTemplate } from '../../models/models';
import { NotificationService } from '../../services/notification.service';
import { IconComponent } from '../icon.component';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="templates-page-container">

      <!-- Header -->
      <div class="templates-header-box">
        <div>
          <h2>Plantillas de Invitaciones Digitales</h2>
          <p>Catálogo de diseños para tus eventos. Personaliza colores, música de fondo y activa RSVP con pases QR.</p>
        </div>
        <button class="btn-action" (click)="showNewTemplateModal.set(true)">
          <app-icon name="plus" [size]="15"></app-icon>
          <span>+ Registrar Nueva Plantilla</span>
        </button>
      </div>

      <!-- Templates Showcase Grid -->
      <div class="templates-showcase-grid">

        <!-- Template 1: Miriam & Isidro -->
        <div class="template-box">
          <div class="template-cover gold-style">
            <span class="tpl-badge gold">Boda Luxury Gold</span>
            <div class="gold-inner-preview">
              <span class="gold-sub">NUESTRA BODA</span>
              <h2 class="gold-title">Miriam &amp; Isidro</h2>
              <span class="gold-date">24 OCTUBRE 2026 · HACIENDA LOS OLIVOS</span>
            </div>
          </div>
          <div class="template-content">
            <h3>Miriam &amp; Isidro · Gold Elegance</h3>
            <p>Diseño de gala nupcial con bosquejo de templo, cuenta regresiva, código de vestimenta y pase digital con mesa asignada.</p>
            <div class="features-tags">
              <span>Música Clásica</span>
              <span>Sketch Iglesia</span>
              <span>RSVP + Mesa</span>
              <span>Reglas No Niños</span>
            </div>
            <div class="template-actions">
              <button class="btn-outline btn-sm" (click)="openPreviewModal('miriam-isidro')">Previsualizar</button>
              <button class="btn-action btn-sm" (click)="selectTemplate('miriam-isidro')">Usar en Evento</button>
            </div>
          </div>
        </div>

        <!-- Template 2: Mis 18 / Ernesto & Nataly (Neon Party) -->
        <div class="template-box">
          <div class="template-cover neon-style">
            <span class="tpl-badge neon">Fiesta Neón &amp; XV</span>
            <div class="neon-inner-preview">
              <div class="neon-glow-18">MIS 18</div>
              <div class="neon-script-name">Ivonne · VIP Night</div>
              <span class="neon-date">15 DICIEMBRE · SKY LOUNGE</span>
            </div>
          </div>
          <div class="template-content">
            <h3>Mis 18 &amp; Fiesta Neón Glow</h3>
            <p>Diseño oscuro moderno con tipografía fluorescente, animación de bienvenida VIP, mapa interactivo y pase QR con foto.</p>
            <div class="features-tags">
              <span>Efecto Glow</span>
              <span>Intro VIP</span>
              <span>Google Maps</span>
              <span>Audio DJ</span>
            </div>
            <div class="template-actions">
              <button class="btn-outline btn-sm" (click)="openPreviewModal('neon-party')">Previsualizar</button>
              <button class="btn-action btn-sm" (click)="selectTemplate('neon-party')">Usar en Evento</button>
            </div>
          </div>
        </div>

        <!-- Template 3: Editorial Minimalist -->
        <div class="template-box">
          <div class="template-cover minimal-style">
            <span class="tpl-badge minimal">Gala &amp; Corporativo</span>
            <div class="minimal-inner-preview">
              <span class="min-sub">LEADERSHIP SUMMIT</span>
              <h2 class="min-title">Tech &amp; Innovation</h2>
              <span class="min-date">12 NOVIEMBRE 2026</span>
            </div>
          </div>
          <div class="template-content">
            <h3>Editorial Minimalista Clásico</h3>
            <p>Estilo suizo con tipografía limpia, botón para agendar en Google Calendar, confirmación y código QR de acceso.</p>
            <div class="features-tags">
              <span>Google Calendar</span>
              <span>Acreditación QR</span>
              <span>Clean Design</span>
            </div>
            <div class="template-actions">
              <button class="btn-outline btn-sm" (click)="openPreviewModal('editorial-clean')">Previsualizar</button>
              <button class="btn-action btn-sm" (click)="selectTemplate('editorial-clean')">Usar en Evento</button>
            </div>
          </div>
        </div>

        <!-- Template 4: Posada Velvet & Gold -->
        <div class="template-box">
          <div class="template-cover velvet-style">
            <span class="tpl-badge velvet">Posada / Fin de Año</span>
            <div class="velvet-inner-preview">
              <span class="velvet-sub">GRAN CELEBRACIÓN NAVIDEÑA</span>
              <h2 class="velvet-title">Posada &amp; Gala Tech</h2>
              <span class="velvet-date">18 DICIEMBRE · SALÓN BELLAVISTA</span>
            </div>
          </div>
          <div class="template-content">
            <h3>Posada Velvet &amp; Gold Celebration</h3>
            <p>Atmósfera cálida de temporada decembrina con destellos oro, countdown a las doce, programa de rifas y cóctel.</p>
            <div class="features-tags">
              <span>Fondo Velvet</span>
              <span>Rifa de Regalos</span>
              <span>Audio Navideño</span>
              <span>Mesa Asignada</span>
            </div>
            <div class="template-actions">
              <button class="btn-outline btn-sm" (click)="openPreviewModal('posada-velvet')">Previsualizar</button>
              <button class="btn-action btn-sm" (click)="selectTemplate('posada-velvet')">Usar en Evento</button>
            </div>
          </div>
        </div>

        <!-- Template 5: Bautizo Celestial Pastel -->
        <div class="template-box">
          <div class="template-cover celestial-style">
            <span class="tpl-badge celestial">Bautizo &amp; Comunión</span>
            <div class="celestial-inner-preview">
              <span class="cel-sub">MI BAUTIZO</span>
              <h2 class="cel-title">Santiago López</h2>
              <span class="cel-date">29 NOVIEMBRE · PARROQUIA SANTA INÉS</span>
            </div>
          </div>
          <div class="template-content">
            <h3>Bautizo Celestial &amp; Querubín Pastel</h3>
            <p>Diseño delicado en tonalidades marfil y azul cielo, bosquejo de cruz, versículo bíblico y nombres de padrinos.</p>
            <div class="features-tags">
              <span>Tonos Pastel</span>
              <span>Cita Bíblica</span>
              <span>Mesa de Honor</span>
              <span>Pase Familiar</span>
            </div>
            <div class="template-actions">
              <button class="btn-outline btn-sm" (click)="openPreviewModal('bautizo-celestial')">Previsualizar</button>
              <button class="btn-action btn-sm" (click)="selectTemplate('bautizo-celestial')">Usar en Evento</button>
            </div>
          </div>
        </div>

        <!-- Template 6: Cumpleaños VIP Sunset Chic -->
        <div class="template-box">
          <div class="template-cover sunset-style">
            <span class="tpl-badge sunset">Cumpleaños &amp; VIP</span>
            <div class="sunset-inner-preview">
              <span class="sun-sub">EXCLUSIVE BIRTHDAY</span>
              <h2 class="sun-title">Happy Birthday VIP</h2>
              <span class="sun-date">08 ENERO 2027 · ROOFTOP SKY</span>
            </div>
          </div>
          <div class="template-content">
            <h3>Cumpleaños VIP &amp; Sunset Chic</h3>
            <p>Estilo atardecer moderno con gradiente sunset, contador de días regresivo, dress code visual y confirmación con 1 tap.</p>
            <div class="features-tags">
              <span>Sunset Gradient</span>
              <span>Countdown</span>
              <span>Spotify Playlist</span>
              <span>Acceso VIP</span>
            </div>
            <div class="template-actions">
              <button class="btn-outline btn-sm" (click)="openPreviewModal('cumple-vip')">Previsualizar</button>
              <button class="btn-action btn-sm" (click)="selectTemplate('cumple-vip')">Usar en Evento</button>
            </div>
          </div>
        </div>

        <!-- Dynamic Custom Templates from Catalog -->
        <div *ngFor="let tpl of getCustomCatalogTemplates()" class="template-box">
          <div class="template-cover custom-tpl-style">
            <span class="tpl-badge gold">{{ tpl.category }}</span>
            <div class="custom-inner-preview">
              <span class="custom-sub">PLANTILLA CATÁLOGO EVENPASS</span>
              <h2 class="custom-title">{{ tpl.name }}</h2>
              <span class="custom-date">{{ tpl.description }}</span>
            </div>
          </div>
          <div class="template-content">
            <h3>{{ tpl.name }}</h3>
            <p>{{ tpl.description }}</p>
            <div class="features-tags">
              <span>{{ tpl.category }}</span>
              <span>RSVP + QR</span>
              <span>Mesa Asignada</span>
              <span>Música de Fondo</span>
            </div>
            <div class="template-actions">
              <button class="btn-outline btn-sm" (click)="openPreviewModal(tpl.slug)">Previsualizar</button>
              <button class="btn-action btn-sm" (click)="selectTemplate(tpl.slug)">Usar en Evento</button>
            </div>
          </div>
        </div>

      </div>

      <!-- Live Interactive Preview Modal with Viewport Simulator -->
      <div *ngIf="previewSlug()" class="modal-backdrop">
        <div class="modal-box preview-modal-size">
          <div class="modal-header">
            <div class="preview-header-meta">
              <h3>Previsualización en Vivo de Invitación Digital</h3>
              <div class="viewport-toggle-row">
                <button 
                  class="btn-viewport" 
                  [class.active]="previewViewport() === 'mobile'" 
                  (click)="previewViewport.set('mobile')"
                >
                  <app-icon name="smartphone" [size]="14"></app-icon>
                  <span>Vista Celular</span>
                </button>
                <button 
                  class="btn-viewport" 
                  [class.active]="previewViewport() === 'desktop'" 
                  (click)="previewViewport.set('desktop')"
                >
                  <app-icon name="monitor" [size]="14"></app-icon>
                  <span>Vista Escritorio</span>
                </button>
              </div>
            </div>

            <button class="close-btn" (click)="closePreviewModal()">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <!-- Simulated Music Player Bar -->
          <div class="music-player-bar">
            <button class="btn-music-play" (click)="toggleMusic()">
              <app-icon [name]="isMusicPlaying() ? 'pause' : 'play'" [size]="13"></app-icon>
              <span>{{ isMusicPlaying() ? 'Pausar Melodía de Fondo' : 'Reproducir Música de Fondo' }}</span>
            </button>
            <div class="sound-wave-bars" *ngIf="isMusicPlaying()">
              <span class="bar b1"></span>
              <span class="bar b2"></span>
              <span class="bar b3"></span>
              <span class="bar b4"></span>
              <span class="bar b5"></span>
            </div>
            <span class="music-title-text">{{ getMusicTitle() }}</span>
          </div>

          <!-- Preview Frame Body -->
          <div class="preview-frame-wrapper" [class.mode-mobile]="previewViewport() === 'mobile'">
            <div class="preview-device-screen">

              <!-- Template 1: Miriam & Isidro (Gold Wedding) -->
              <div *ngIf="previewSlug() === 'miriam-isidro'" class="gold-live-render">
                <div class="gold-ring-decor">
                  <app-icon name="sparkles" [size]="24"></app-icon>
                </div>
                <small class="gold-caps">NUESTRA BODA</small>
                <h1 class="serif-names">Miriam &amp; Isidro</h1>
                <p class="gold-verse">
                  “El amor todo lo sufre, todo lo cree, todo lo espera, todo lo soporta.”
                </p>
                <div class="gold-datetime-box">
                  <div class="dt-block">
                    <span class="dt-num">24</span>
                    <small>OCTUBRE 2026</small>
                  </div>
                  <div class="dt-block">
                    <span class="dt-num">17:00</span>
                    <small>HORAS</small>
                  </div>
                </div>
                <div class="gold-venue-card">
                  <b>Recepción de Gala:</b> Hacienda Los Olivos · Salón Real Imperial
                  <br><small style="color:#94a3b8;">Código de vestimenta: Rigurosa Etiqueta · Evento sin niños</small>
                </div>

                <!-- Interactive RSVP Form / Result Simulator -->
                <div class="sim-rsvp-container" *ngIf="!simRsvpDone()">
                  <label class="sim-label">CONFIRMA TU ASISTENCIA (SIMULADOR EN VIVO)</label>
                  <input type="text" [(ngModel)]="simGuestName" placeholder="Tu nombre completo" class="sim-input">
                  <div class="sim-passes-selector">
                    <span>Pases requeridos:</span>
                    <div class="stepper-box">
                      <button type="button" (click)="simPasses = Math.max(1, simPasses - 1)">-</button>
                      <b>{{ simPasses }}</b>
                      <button type="button" (click)="simPasses = simPasses + 1">+</button>
                    </div>
                  </div>
                  <button class="btn-action btn-gold-rsvp" (click)="simulateRsvp()">
                    Confirmar Asistencia (RSVP)
                  </button>
                </div>

                <!-- Simulated Digital Pass Card after confirmation -->
                <div class="sim-pass-card" *ngIf="simRsvpDone()">
                  <div class="pass-badge-top">PASE OFICIAL VALIDADO</div>
                  <h3>{{ simGuestName || 'Invitado de Honor' }}</h3>
                  <div class="pass-seats-highlight">{{ simPasses }} Pases Reservados · Mesa 01</div>
                  <div class="sim-qr-box">
                    <div class="sim-qr-code"></div>
                    <small>EP-9902 · Escanear en Puerta</small>
                  </div>
                  <button class="btn-outline btn-xs" (click)="resetRsvpSim()" style="margin-top:10px;">
                    Volver al Formulario
                  </button>
                </div>
              </div>

              <!-- Template 2: Mis 18 & Fiesta Neón -->
              <div *ngIf="previewSlug() === 'neon-party'" class="neon-live-render">
                <div class="neon-glow-big">MIS 18</div>
                <div class="neon-cursive-sub">Ivonne · Exclusive Party</div>
                <p style="color:#cbd5e1; font-size:0.9rem; margin:16px 0;">
                  ¡Acompáñame a festejar en grande! Pistas neón, DJ en vivo y la mejor vibra.
                </p>
                <div class="neon-tag-pill">
                  <app-icon name="zap" [size]="14"></app-icon>
                  <span>Dress Code: Total Black con Toques Neón</span>
                </div>
                <div class="neon-venue-card">
                  <b>Lugar:</b> Sky Lounge Terrace · Blvd. Pedro Infante
                </div>

                <div class="sim-rsvp-container" *ngIf="!simRsvpDone()">
                  <input type="text" [(ngModel)]="simGuestName" placeholder="Tu nombre completo" class="sim-input-neon">
                  <button class="btn-action btn-neon-rsvp" (click)="simulateRsvp()">
                    Confirmar Asistencia VIP
                  </button>
                </div>

                <div class="sim-pass-card neon-pass" *ngIf="simRsvpDone()">
                  <div class="pass-badge-top neon">PASE VIP ACTIVADO</div>
                  <h3>{{ simGuestName || 'Invitado VIP' }}</h3>
                  <div class="pass-seats-highlight">{{ simPasses }} Pases · Mesa de Honor</div>
                  <div class="sim-qr-box neon">
                    <div class="sim-qr-code neon"></div>
                    <small>EP-8801 · Entrada VIP</small>
                  </div>
                  <button class="btn-outline btn-xs" (click)="resetRsvpSim()" style="margin-top:10px;">Volver</button>
                </div>
              </div>

              <!-- Template 3: Editorial Minimalist -->
              <div *ngIf="previewSlug() === 'editorial-clean'" class="minimal-live-render">
                <small style="letter-spacing:2px; font-weight:700; color:#0284c7;">SUMMIT ANUAL</small>
                <h2 style="font-size:1.8rem; margin:8px 0; color:#0f172a;">Leadership &amp; Tech Summit</h2>
                <p style="color:#475569; font-size:0.9rem; margin-bottom:16px;">
                  Conferencias magistrales, cena ejecutiva y networking de alto impacto.
                </p>
                <button class="btn-action" style="width:100%; margin-bottom:12px;">Registrar Asistencia</button>
              </div>

              <!-- Template 4: Posada Velvet & Gold -->
              <div *ngIf="previewSlug() === 'posada-velvet'" class="velvet-live-render">
                <div class="velvet-star-icon">
                  <app-icon name="sparkles" [size]="28"></app-icon>
                </div>
                <small class="velvet-sub-text">CELEBRACIÓN CORPORATIVA</small>
                <h1 class="velvet-main-title">Gran Posada Navideña</h1>
                <p class="velvet-desc-text">
                  Acompáñanos a brindar por otro año de éxitos con cena de gala, música en vivo y la gran rifa de fin de año.
                </p>
                <div class="velvet-date-badge">
                  <span>18 DE DICIEMBRE · 20:00 HRS</span>
                  <small>Salón Bellavista &amp; Terraza Panorámica</small>
                </div>
                <button class="btn-action btn-velvet-action" (click)="simulateRsvp()">
                  Confirmar Asistencia &amp; Obtener Boleto de Rifa
                </button>
              </div>

              <!-- Template 5: Bautizo Celestial Pastel -->
              <div *ngIf="previewSlug() === 'bautizo-celestial'" class="celestial-live-render">
                <div class="celestial-cross-icon">✝</div>
                <small class="celestial-sub-label">MI BAUTIZO</small>
                <h1 class="celestial-main-name">Santiago López</h1>
                <p class="celestial-quote">
                  “Dejad que los niños vengan a mí, porque de ellos es el reino de los cielos.”
                </p>
                <div class="celestial-details-box">
                  <div><b>Misa Solemne:</b> Parroquia Santa Inés · 12:00 hrs</div>
                  <div><b>Comida Familiar:</b> Restaurante Los Arcos · 13:30 hrs</div>
                  <small style="color:#64748b; margin-top:4px; display:block;">Padrinos: Laura Méndez &amp; Carlos Mendoza</small>
                </div>
                <button class="btn-action btn-celestial-action" (click)="simulateRsvp()">
                  Confirmar Asistencia Familiar
                </button>
              </div>

              <!-- Template 6: Cumpleaños VIP Sunset Chic -->
              <div *ngIf="previewSlug() === 'cumple-vip'" class="sunset-live-render">
                <small class="sunset-top-tag">CELEBRACIÓN EXCLUSIVA</small>
                <h1 class="sunset-main-title">Nataly's Birthday Gala</h1>
                <p class="sunset-sub-text">
                  Una tarde mágica para despedir el atardecer con buena música, drinks de autor y grandes amigos.
                </p>
                <div class="sunset-countdown-card">
                  <div class="cnt-item"><b>14</b><small>DÍAS</small></div>
                  <div class="cnt-item"><b>08</b><small>HORAS</small></div>
                  <div class="cnt-item"><b>45</b><small>MIN</small></div>
                </div>
                <button class="btn-action btn-sunset-action" (click)="simulateRsvp()">
                  Confirmar Asistencia VIP
                </button>
              </div>

              <!-- Dynamic Custom Template Preview -->
              <div *ngIf="isCustomSlug(previewSlug())" class="custom-live-render">
                <small class="sunset-top-tag">DISEÑO EXCLUSIVO PERSONALIZADO</small>
                <h1 class="sunset-main-title">{{ getCustomTemplateName(previewSlug()) }}</h1>
                <p class="sunset-sub-text">
                  {{ getCustomTemplateDesc(previewSlug()) }}
                </p>
                <div class="sunset-countdown-card">
                  <div class="cnt-item"><b>RSVP</b><small>ACTIVO</small></div>
                  <div class="cnt-item"><b>QR</b><small>INCLUIDO</small></div>
                  <div class="cnt-item"><b>MESAS</b><small>INTEGRADO</small></div>
                </div>
                <button class="btn-action" style="margin-top: 16px; width: 100%;" (click)="simulateRsvp()">
                  Confirmar Asistencia
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      <!-- Modal: Registrar Nueva Plantilla en Catálogo -->
      <div *ngIf="showNewTemplateModal()" class="modal-backdrop">
        <div class="modal-box modal-template-card">
          <div class="modal-header">
            <div class="modal-header-badge-title">
              <div class="modal-icon-badge">
                <app-icon name="sparkles" [size]="20"></app-icon>
              </div>
              <div>
                <h3>Registrar Nueva Plantilla en Catálogo</h3>
                <p class="modal-subtitle">Agrega diseños a la medida y temas visuales para tus eventos</p>
              </div>
            </div>
            <button class="close-btn" (click)="showNewTemplateModal.set(false)">✕</button>
          </div>

          <form (ngSubmit)="handleRegisterNewTemplate()" class="template-create-form">
            <div class="form-field">
              <label>Nombre de la Plantilla</label>
              <input type="text" class="input-lux" [(ngModel)]="newTemplateForm.name" name="name" placeholder="Ej. Boda Floral Boho Chic & Gold" required>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label>Categoría</label>
                <select class="select-lux" [(ngModel)]="newTemplateForm.category" name="category" required>
                  <option value="Boda">Boda Luxury</option>
                  <option value="XV Años">XV Años / Fiesta</option>
                  <option value="Cumpleaños">Cumpleaños VIP</option>
                  <option value="Bautizo">Bautizo / Primera Comunión</option>
                  <option value="Posada">Posada / Fiesta Navideña</option>
                  <option value="Gala / Corporativo">Gala / Corporativo</option>
                  <option value="Graduación">Graduación</option>
                  <option value="Aniversario">Aniversario</option>
                  <option value="Personalizada">Diseño Personalizado</option>
                </select>
              </div>

              <div class="form-field">
                <label>Identificador (Slug URL)</label>
                <input type="text" class="input-lux" [(ngModel)]="newTemplateForm.slug" name="slug" placeholder="ej. boda-boho-chic">
              </div>
            </div>

            <div class="form-field">
              <label>Descripción / Estilo Visual</label>
              <textarea class="textarea-lux" [(ngModel)]="newTemplateForm.description" name="description" rows="3" placeholder="Detalles de la estética, tipografía, paleta de colores y amenidades." required></textarea>
            </div>

            <!-- Visual Theme Live Preview Mini Card -->
            <div class="theme-preview-box">
              <div class="preview-mini-header">
                <span class="preview-tag-mini">{{ newTemplateForm.category || 'Boda' }}</span>
                <span class="badge-accent">RSVP + QR</span>
              </div>
              <h4 class="preview-mini-title">{{ newTemplateForm.name || 'Título de Muestra de Plantilla' }}</h4>
              <p class="preview-mini-desc">{{ newTemplateForm.description || 'Vista previa del diseño dentro del catálogo interactivo de EvenPass.' }}</p>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-outline" (click)="showNewTemplateModal.set(false)">Cancelar</button>
              <button type="submit" class="btn-action">
                <app-icon name="plus" [size]="14"></app-icon>
                <span>Guardar en Catálogo</span>
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .templates-page-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .templates-header-box {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 24px 28px;
      box-shadow: var(--shadow-sm);
    }

    .templates-header-box h2 {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .templates-header-box p {
      font-size: 0.88rem;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .templates-showcase-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 24px;
    }

    .template-box {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      transition: all 0.2s;
    }

    .template-box:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-hover);
    }

    .template-cover {
      height: 240px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 20px;
    }

    .tpl-badge {
      position: absolute;
      top: 14px;
      left: 14px;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .tpl-badge.gold { background: #d4af37; color: #000; }
    .tpl-badge.neon { background: #ff2a85; color: #fff; }
    .tpl-badge.minimal { background: #0f172a; color: #fff; }

    /* Covers */
    .gold-style {
      background: #050505;
      border-bottom: 2px solid #d4af37;
      color: #fff;
    }

    .gold-sub {
      display: block;
      font-size: 0.75rem;
      letter-spacing: 3px;
      color: #d4af37;
      margin-bottom: 6px;
    }

    .gold-title {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 2.2rem;
      color: #d4af37;
      font-weight: 600;
      line-height: 1;
      margin-bottom: 8px;
    }

    .gold-date {
      font-size: 0.75rem;
      color: #cbd5e1;
      letter-spacing: 1px;
    }

    .custom-tpl-style {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
      border-bottom: 2px solid #818cf8;
      color: #fff;
    }

    .custom-sub {
      display: block;
      font-size: 0.72rem;
      letter-spacing: 2px;
      color: #818cf8;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .custom-title {
      font-size: 1.8rem;
      font-weight: 800;
      color: #fff;
      line-height: 1.1;
      margin-bottom: 6px;
    }

    .custom-date {
      font-size: 0.74rem;
      color: #c7d2fe;
    }

    .custom-live-render {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      border: 1px solid #6366f1;
      border-radius: 14px;
      padding: 36px 24px;
      text-align: center;
      color: #fff;
    }

    .neon-style {
      background: #08080a;
      border-bottom: 2px solid #ff2a85;
      color: #fff;
    }

    .neon-glow-18 {
      font-size: 3.5rem;
      font-weight: 800;
      color: #fff;
      text-shadow: 0 0 10px #ff2a85, 0 0 25px #ff2a85;
      line-height: 1;
    }

    .neon-script-name {
      font-size: 1.4rem;
      color: #ff80bf;
      font-family: cursive;
      margin-top: 4px;
    }

    .neon-date {
      font-size: 0.75rem;
      color: #94a3b8;
      display: block;
      margin-top: 6px;
    }

    .minimal-style {
      background: #f1f5f9;
      border-bottom: 2px solid #0284c7;
      color: #0f172a;
    }

    .min-sub {
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 2px;
      color: #0284c7;
    }

    .min-title {
      font-size: 1.6rem;
      font-weight: 800;
      color: #0f172a;
      margin: 4px 0;
    }

    .min-date {
      font-size: 0.78rem;
      color: #64748b;
    }

    /* Content */
    .template-content {
      padding: 22px;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }

    .template-content h3 {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text-main);
      margin-bottom: 6px;
    }

    .template-content p {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 16px;
      flex-grow: 1;
    }

    .features-tags {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 18px;
    }

    .features-tags span {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .template-actions {
      display: flex;
      gap: 10px;
    }

    /* Preview Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(6px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .preview-modal-size {
      width: min(520px, 100%);
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      padding: 24px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }

    .close-btn {
      font-size: 1.2rem;
      color: var(--text-muted);
      cursor: pointer;
    }

    .gold-live-render {
      background: #050505;
      color: #ffffff;
      border: 1px solid #d4af37;
      border-radius: 14px;
      padding: 32px 24px;
      text-align: center;
    }

    .gold-ring-decor { font-size: 2rem; margin-bottom: 8px; }
    .gold-caps { letter-spacing: 4px; color: #d4af37; font-size: 0.75rem; text-transform: uppercase; }
    .serif-names { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 2.5rem; color: #d4af37; margin: 8px 0; }
    .gold-verse { font-size: 0.85rem; color: #cbd5e1; font-style: italic; margin-bottom: 20px; }

    .gold-datetime-box {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .dt-block {
      background: rgba(212, 175, 55, 0.15);
      border: 1px solid #d4af37;
      border-radius: 10px;
      padding: 8px 16px;
    }

    .dt-num { font-size: 1.4rem; font-weight: 800; color: #d4af37; display: block; }
    .dt-block small { font-size: 0.7rem; color: #cbd5e1; }

    .gold-venue-card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 12px;
      font-size: 0.85rem;
      color: #e2e8f0;
      text-align: left;
    }

    .neon-live-render {
      background: #09090b;
      color: #fff;
      border: 1px solid #ff2a85;
      box-shadow: 0 0 25px rgba(255, 42, 133, 0.25);
      border-radius: 14px;
      padding: 36px 24px;
      text-align: center;
    }

    .neon-glow-big {
      font-size: 3.8rem;
      font-weight: 900;
      color: #fff;
      text-shadow: 0 0 15px #ff2a85, 0 0 35px #ff2a85;
      line-height: 1;
    }

    .neon-cursive-sub {
      font-size: 1.6rem;
      color: #ff80bf;
      font-family: cursive;
      margin-top: 6px;
    }

    .minimal-live-render {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 32px 24px;
      text-align: center;
    }

    /* Template 4 Velvet Styles */
    .velvet-style {
      background: linear-gradient(135deg, #450a0a, #1c0505);
      border-bottom: 2px solid #fbbf24;
      color: #fff;
    }
    .velvet-sub { font-size: 0.72rem; letter-spacing: 2px; color: #fbbf24; font-weight: 700; }
    .velvet-title { font-size: 1.8rem; font-weight: 800; color: #fff; margin: 6px 0; }
    .velvet-date { font-size: 0.75rem; color: #fecaca; }
    .tpl-badge.velvet { background: #b91c1c; color: #fff; }

    .velvet-live-render {
      background: linear-gradient(135deg, #450a0a, #1a0505);
      border: 1px solid #d97706;
      border-radius: 16px;
      padding: 36px 24px;
      color: #fff;
      text-align: center;
    }
    .velvet-star-icon { color: #fbbf24; margin-bottom: 10px; }
    .velvet-sub-text { font-size: 0.75rem; letter-spacing: 3px; color: #fbbf24; font-weight: 700; }
    .velvet-main-title { font-size: 2.2rem; font-weight: 800; margin: 8px 0; color: #fff; }
    .velvet-desc-text { font-size: 0.88rem; color: #fecaca; max-width: 400px; margin: 0 auto 16px; }
    .velvet-date-badge { background: rgba(251, 191, 36, 0.15); border: 1px solid #fbbf24; border-radius: 8px; padding: 10px; margin-bottom: 18px; }
    .velvet-date-badge span { display: block; font-weight: 800; color: #fbbf24; }
    .btn-velvet-action { background: #b91c1c; color: #fff; border: 1px solid #fbbf24; width: 100%; font-weight: 700; }

    /* Template 5 Celestial Styles */
    .celestial-style {
      background: linear-gradient(135deg, #e0f2fe, #f0fdf4);
      border-bottom: 2px solid #38bdf8;
      color: #0f172a;
    }
    .cel-sub { font-size: 0.75rem; letter-spacing: 2px; color: #0284c7; font-weight: 700; }
    .cel-title { font-size: 1.8rem; font-weight: 800; color: #0f172a; margin: 4px 0; font-family: 'Cormorant Garamond', Georgia, serif; }
    .cel-date { font-size: 0.75rem; color: #475569; }
    .tpl-badge.celestial { background: #38bdf8; color: #0f172a; font-weight: 800; }

    .celestial-live-render {
      background: #f8fafc;
      border: 1px solid #bae6fd;
      border-radius: 16px;
      padding: 36px 24px;
      color: #0f172a;
      text-align: center;
    }
    .celestial-cross-icon { font-size: 2rem; color: #0284c7; margin-bottom: 6px; }
    .celestial-sub-label { font-size: 0.75rem; letter-spacing: 2px; color: #0284c7; font-weight: 800; }
    .celestial-main-name { font-size: 2.4rem; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; color: #0f172a; margin: 6px 0; }
    .celestial-quote { font-style: italic; font-size: 0.88rem; color: #475569; max-width: 380px; margin: 0 auto 16px; }
    .celestial-details-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 18px; font-size: 0.85rem; text-align: left; }
    .btn-celestial-action { background: #0284c7; color: #fff; width: 100%; font-weight: 700; }

    /* Template 6 Sunset Chic Styles */
    .sunset-style {
      background: linear-gradient(135deg, #fdba74, #f43f5e);
      border-bottom: 2px solid #fff;
      color: #fff;
    }
    .sun-sub { font-size: 0.72rem; letter-spacing: 2px; color: #fff; font-weight: 800; }
    .sun-title { font-size: 1.8rem; font-weight: 800; color: #fff; margin: 6px 0; }
    .sun-date { font-size: 0.75rem; color: rgba(255, 255, 255, 0.9); }
    .tpl-badge.sunset { background: #f43f5e; color: #fff; }

    .sunset-live-render {
      background: linear-gradient(135deg, #fb923c, #f43f5e);
      border-radius: 16px;
      padding: 36px 24px;
      color: #fff;
      text-align: center;
    }
    .sunset-top-tag { font-size: 0.75rem; letter-spacing: 2px; font-weight: 800; opacity: 0.9; }
    .sunset-main-title { font-size: 2.2rem; font-weight: 900; margin: 8px 0; }
    .sunset-sub-text { font-size: 0.88rem; opacity: 0.95; max-width: 380px; margin: 0 auto 16px; }
    .sunset-countdown-card { display: flex; justify-content: center; gap: 14px; margin-bottom: 18px; }
    .cnt-item { background: rgba(255, 255, 255, 0.2); border-radius: 8px; padding: 8px 14px; min-width: 60px; }
    .cnt-item b { font-size: 1.4rem; display: block; font-weight: 900; }
    .cnt-item small { font-size: 0.68rem; opacity: 0.85; }
    .btn-sunset-action { background: #ffffff; color: #f43f5e; font-weight: 800; width: 100%; }

    /* Preview Modal Viewport & Music Controls */
    .preview-modal-size {
      max-width: 820px;
      width: 95%;
    }

    .preview-header-meta {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .preview-header-meta h3 {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0;
    }

    .viewport-toggle-row {
      display: flex;
      gap: 6px;
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      padding: 2px;
      border-radius: var(--radius-sm);
    }

    .btn-viewport {
      background: transparent;
      border: none;
      padding: 4px 10px;
      font-size: 0.74rem;
      font-weight: 700;
      color: var(--text-muted);
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }

    .btn-viewport.active {
      background: var(--bg-card);
      color: var(--text-main);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .music-player-bar {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      padding: 8px 14px;
      margin: 12px 0 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn-music-play {
      background: var(--brand-blue);
      color: #fff;
      border: none;
      padding: 5px 12px;
      border-radius: var(--radius-full);
      font-size: 0.74rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .sound-wave-bars {
      display: flex;
      align-items: center;
      gap: 3px;
      height: 16px;
    }

    .sound-wave-bars .bar {
      width: 3px;
      background: var(--brand-blue);
      border-radius: 2px;
      animation: wave 1s ease-in-out infinite alternate;
    }
    .b1 { height: 6px; animation-delay: 0.1s; }
    .b2 { height: 14px; animation-delay: 0.3s; }
    .b3 { height: 10px; animation-delay: 0.2s; }
    .b4 { height: 16px; animation-delay: 0.4s; }
    .b5 { height: 8px; animation-delay: 0.15s; }

    @keyframes wave {
      0% { height: 4px; }
      100% { height: 16px; }
    }

    .music-title-text {
      font-size: 0.76rem;
      color: var(--text-muted);
      font-style: italic;
    }

    /* Device Viewport Frames */
    .preview-frame-wrapper {
      display: flex;
      justify-content: center;
      padding: 10px 0;
      max-height: 70vh;
      overflow-y: auto;
    }

    .preview-device-screen {
      width: 100%;
      transition: all 0.25s ease;
    }

    .preview-frame-wrapper.mode-mobile .preview-device-screen {
      width: 390px;
      border: 6px solid #1e293b;
      border-radius: 28px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    /* RSVP Simulator inside invitation */
    .sim-rsvp-container {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px dashed rgba(255, 255, 255, 0.2);
      text-align: left;
    }

    .sim-label {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 1px;
      color: #d4af37;
      display: block;
      margin-bottom: 8px;
    }

    .sim-input {
      width: 100%;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid rgba(212, 175, 55, 0.4);
      background: rgba(0, 0, 0, 0.4);
      color: #fff;
      font-size: 0.85rem;
      margin-bottom: 10px;
    }

    .sim-input-neon {
      width: 100%;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #ff2a85;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      font-size: 0.85rem;
      margin-bottom: 10px;
    }

    .sim-passes-selector {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.82rem;
      color: #cbd5e1;
      margin-bottom: 12px;
    }

    .stepper-box {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 8px;
      border-radius: 6px;
    }

    .stepper-box button {
      background: transparent;
      border: none;
      color: #fff;
      font-weight: 800;
      font-size: 1rem;
      cursor: pointer;
    }

    .btn-gold-rsvp {
      background: #d4af37;
      color: #050505;
      font-weight: 800;
      width: 100%;
    }

    .btn-neon-rsvp {
      background: #ff2a85;
      color: #fff;
      font-weight: 800;
      width: 100%;
    }

    .neon-tag-pill {
      background: rgba(255, 42, 133, 0.15);
      border: 1px solid #ff2a85;
      padding: 8px 14px;
      border-radius: 30px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      font-weight: 700;
      margin-bottom: 12px;
    }

    .neon-venue-card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 10px;
      font-size: 0.85rem;
      color: #e2e8f0;
      margin-bottom: 14px;
    }

    .sim-pass-card {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid #d4af37;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      margin-top: 16px;
    }

    .sim-pass-card.neon-pass {
      border-color: #ff2a85;
      background: rgba(255, 42, 133, 0.08);
    }

    .pass-badge-top {
      font-size: 0.72rem;
      font-weight: 800;
      color: #d4af37;
      letter-spacing: 1px;
    }

    .pass-badge-top.neon {
      color: #ff2a85;
    }

    .sim-pass-card h3 {
      font-size: 1.2rem;
      margin: 6px 0;
      color: #fff;
    }

    .pass-seats-highlight {
      font-size: 0.82rem;
      color: #cbd5e1;
      margin-bottom: 10px;
    }

    .sim-qr-box {
      display: inline-block;
      background: #fff;
      padding: 10px;
      border-radius: 8px;
      color: #000;
      margin-top: 6px;
    }

    .sim-qr-code {
      width: 100px;
      height: 100px;
      background: repeating-linear-gradient(45deg, #000, #000 6px, #fff 6px, #fff 12px);
      margin: 0 auto 6px;
    }

    /* Modal: Registrar Nueva Plantilla en Catálogo */
    .modal-template-card {
      max-width: 540px;
      width: 100%;
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 26px;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.5);
      animation: modalFadeIn 0.2s ease-out;
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.97) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .modal-header-badge-title {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .modal-icon-badge {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: rgba(14, 165, 233, 0.12);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .modal-header-badge-title h3 {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0;
    }

    .modal-subtitle {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin: 3px 0 0;
    }

    .template-create-form {
      margin-top: 18px;
    }

    .form-field {
      margin-bottom: 16px;
    }

    .form-field label {
      display: block;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .input-lux, .select-lux, .textarea-lux {
      width: 100%;
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      padding: 10px 14px;
      color: var(--text-main);
      font-size: 0.88rem;
      font-family: inherit;
      outline: none;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .input-lux:focus, .select-lux:focus, .textarea-lux:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
    }

    .textarea-lux {
      resize: vertical;
      min-height: 70px;
    }

    .theme-preview-box {
      background: rgba(15, 23, 42, 0.45);
      border: 1px dashed var(--border-ui);
      border-radius: var(--radius-md);
      padding: 14px 16px;
      margin: 18px 0;
      position: relative;
    }

    .preview-mini-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .preview-tag-mini {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #38bdf8;
    }

    .badge-accent {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }

    .preview-mini-title {
      font-size: 0.96rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0 0 4px;
    }

    .preview-mini-desc {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.4;
    }
  `]
})
export class TemplatesComponent implements OnDestroy {
  previewSlug = signal<string | null>(null);
  previewViewport = signal<'mobile' | 'desktop'>('mobile');
  isMusicPlaying = signal(false);

  simGuestName = 'Carlos Mendoza';
  simPasses = 2;
  simRsvpDone = signal(false);
  Math = Math;

  showNewTemplateModal = signal(false);
  newTemplateForm: Partial<InvitationTemplate> = {
    name: '',
    category: 'Boda',
    slug: '',
    description: ''
  };

  private audioElem: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private synthInterval: any = null;

  getCustomCatalogTemplates(): InvitationTemplate[] {
    const fixedSlugs = ['miriam-isidro', 'neon-party', 'editorial-clean', 'posada-velvet', 'bautizo-celestial', 'cumple-vip'];
    return this.eventService.templates().filter(t => !fixedSlugs.includes(t.slug));
  }

  isCustomSlug(slug: string | null): boolean {
    if (!slug) return false;
    const fixedSlugs = ['miriam-isidro', 'neon-party', 'editorial-clean', 'posada-velvet', 'bautizo-celestial', 'cumple-vip'];
    return !fixedSlugs.includes(slug);
  }

  getCustomTemplateName(slug: string | null): string {
    if (!slug) return 'Diseño Personalizado';
    const found = this.eventService.templates().find(t => t.slug === slug);
    return found ? found.name : 'Invitación Digital Personalizada';
  }

  getCustomTemplateDesc(slug: string | null): string {
    if (!slug) return '';
    const found = this.eventService.templates().find(t => t.slug === slug);
    return found ? found.description : 'Diseño registrado en el catálogo de EvenPass con pases QR y RSVP en tiempo real.';
  }

  handleRegisterNewTemplate(): void {
    if (!this.newTemplateForm.name) return;
    const slug = this.newTemplateForm.slug?.trim() || ('custom-' + Math.random().toString(36).substring(2, 8));
    this.eventService.addCustomTemplate({
      name: this.newTemplateForm.name,
      category: this.newTemplateForm.category || 'Personalizada',
      description: this.newTemplateForm.description || 'Plantilla agregada al catálogo de EvenPass.',
      slug
    });
    this.showNewTemplateModal.set(false);
    this.newTemplateForm = { name: '', category: 'Boda', slug: '', description: '' };
  }

  constructor(
    public eventService: EventService,
    private notificationService: NotificationService
  ) {}

  openPreviewModal(slug: string): void {
    this.stopMusic();
    this.previewSlug.set(slug);
    this.simRsvpDone.set(false);
  }

  closePreviewModal(): void {
    this.stopMusic();
    this.previewSlug.set(null);
  }

  selectTemplate(slug: string): void {
    const ev = this.eventService.selectedEvent();
    if (ev) {
      ev.templateSlug = slug;
      this.notificationService.show('success', 'Plantilla Vinculada', `La plantilla ${slug} ahora está activa para ${ev.name}`);
    }
  }

  toggleMusic(): void {
    if (this.isMusicPlaying()) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
  }

  startMusic(): void {
    const slug = this.previewSlug();
    this.isMusicPlaying.set(true);

    if (slug === 'miriam-isidro') {
      try {
        if (!this.audioElem) {
          this.audioElem = new Audio('assets/templates/miriam-isidro/audio.mp3');
          this.audioElem.loop = true;
          this.audioElem.volume = 0.65;
        }
        const promise = this.audioElem.play();
        if (promise) {
          promise.catch(() => {
            this.playSynthesizedMelody(slug);
          });
        }
      } catch {
        this.playSynthesizedMelody(slug);
      }
    } else {
      this.playSynthesizedMelody(slug || 'default');
    }
  }

  stopMusic(): void {
    this.isMusicPlaying.set(false);
    if (this.audioElem) {
      this.audioElem.pause();
      this.audioElem.currentTime = 0;
    }
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }

  private playSynthesizedMelody(slug: string): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      let chordNotes: number[][] = [];
      if (slug === 'neon-party') {
        // Electronic Synth Arpeggios (Fm, Eb, Db, C)
        chordNotes = [
          [174.61, 261.63, 349.23, 440.00],
          [155.56, 233.08, 311.13, 466.16],
          [138.59, 207.65, 277.18, 415.30],
          [130.81, 196.00, 261.63, 392.00]
        ];
      } else if (slug === 'posada-velvet') {
        // Warm Velvet Chime & Holiday Jazz
        chordNotes = [
          [293.66, 369.99, 440.00, 587.33],
          [246.94, 329.63, 392.00, 493.88],
          [220.00, 277.18, 329.63, 440.00],
          [196.00, 246.94, 293.66, 392.00]
        ];
      } else if (slug === 'bautizo-celestial') {
        // Soft Angelic Harp Chords (C, G, Am, F)
        chordNotes = [
          [261.63, 329.63, 392.00, 523.25],
          [196.00, 246.94, 293.66, 392.00],
          [220.00, 261.63, 329.63, 440.00],
          [174.61, 220.00, 261.63, 349.23]
        ];
      } else {
        // Canon in D / Acoustic Wedding Piano (D, A, Bm, F#m, G, D, G, A)
        chordNotes = [
          [293.66, 369.99, 440.00, 587.33],
          [220.00, 277.18, 329.63, 440.00],
          [246.94, 293.66, 369.99, 493.88],
          [185.00, 220.00, 277.18, 369.99],
          [196.00, 246.94, 293.66, 392.00],
          [293.66, 369.99, 440.00, 587.33],
          [196.00, 246.94, 293.66, 392.00],
          [220.00, 277.18, 329.63, 440.00]
        ];
      }

      let step = 0;
      const playStep = () => {
        if (!this.isMusicPlaying() || !this.audioCtx) return;
        const chord = chordNotes[step % chordNotes.length];
        step++;

        chord.forEach((freq, i) => {
          if (!this.audioCtx) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = (slug === 'neon-party') ? 'sawtooth' : 'triangle';
          osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime + i * 0.12);

          const startTime = this.audioCtx.currentTime + i * 0.12;
          const duration = (slug === 'neon-party') ? 0.45 : 0.85;

          gain.gain.setValueAtTime(0.001, startTime);
          gain.gain.exponentialRampToValueAtTime((slug === 'neon-party') ? 0.06 : 0.10, startTime + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(startTime);
          osc.stop(startTime + duration);
        });
      };

      playStep();
      this.synthInterval = setInterval(playStep, (slug === 'neon-party') ? 600 : 950);
    } catch (err) {
      console.warn('Audio synthesis error:', err);
    }
  }

  getMusicTitle(): string {
    const slug = this.previewSlug();
    if (slug === 'miriam-isidro') return 'Canon in D - Pachelbel (Orquesta Sinfónica)';
    if (slug === 'neon-party') return 'Electronic Sunset VIP Remix (DJ Live Set)';
    if (slug === 'posada-velvet') return 'Carol of the Bells & Jazz Navideño';
    if (slug === 'bautizo-celestial') return 'Ave Maria & Cello Acústico';
    if (slug === 'cumple-vip') return 'Sunset Lounge Chillout Sessions';
    return 'Classical Piano Background';
  }

  simulateRsvp(): void {
    this.simRsvpDone.set(true);
    this.notificationService.show('success', 'RSVP Confirmado', `Simulación de confirmación para ${this.simGuestName} (${this.simPasses} pases).`);
  }

  resetRsvpSim(): void {
    this.simRsvpDone.set(false);
  }

  ngOnDestroy(): void {
    this.stopMusic();
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch {}
    }
  }
}
