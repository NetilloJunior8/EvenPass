import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../services/event.service';
import { ThemeService } from '../../services/theme.service';
import { NotificationService } from '../../services/notification.service';
import { IconComponent } from '../icon.component';
import { SystemConfig } from '../../models/models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="settings-page-container">

      <!-- Header Card with High Contrast Button -->
      <div class="settings-header-card">
        <div class="title-with-icon">
          <div class="icon-wrap-badge">
            <app-icon name="settings" [size]="24"></app-icon>
          </div>
          <div>
            <h2>Configuración del Sistema &amp; Parámetros Operativos</h2>
            <p>Ajustes globales de seguridad anti-fraude, motor de mesas CAD, mensajería WhatsApp y respaldo de base de datos.</p>
          </div>
        </div>

        <button class="btn-action btn-save-contrast" (click)="saveSettings()">
          <app-icon name="check" [size]="16"></app-icon>
          <span>Guardar Cambios</span>
        </button>
      </div>

      <!-- Settings Layout (Two Columns) -->
      <div class="settings-grid">

        <!-- Column 1: Core System & Security -->
        <div class="settings-column">
          
          <!-- Card 1: General SaaS Branding -->
          <div class="settings-card">
            <div class="card-section-title">
              <app-icon name="shield" [size]="18"></app-icon>
              <h3>Identidad &amp; Plataforma SaaS</h3>
            </div>

            <div class="form-group">
              <label>Nombre de la Plataforma / Tenant</label>
              <input 
                type="text" 
                [(ngModel)]="configForm.platformName" 
                placeholder="EvenPass Enterprise Event OS"
              >
              <small class="field-hint">Se mostrará en la barra superior y encabezados de pases digitales.</small>
            </div>

            <div class="theme-preference-block">
              <div class="pref-text">
                <strong>Tema Visual Predeterminado</strong>
                <p>Alterna entre modo oscuro minimalista y modo claro de alto contraste.</p>
              </div>
              <button 
                type="button" 
                class="theme-toggle-btn" 
                (click)="themeService.toggleTheme()"
              >
                <app-icon [name]="themeService.isDarkMode() ? 'sun' : 'moon'" [size]="16"></app-icon>
                <span>{{ themeService.isDarkMode() ? 'Modo Oscuro Activo' : 'Modo Claro Activo' }}</span>
              </button>
            </div>
          </div>

          <!-- Card 2: QR Access & Security Rules -->
          <div class="settings-card">
            <div class="card-section-title">
              <app-icon name="camera" [size]="18"></app-icon>
              <h3>Seguridad en Puerta &amp; Anti-Fraude</h3>
            </div>

            <div class="toggle-row">
              <div class="toggle-info">
                <strong>Protección Anti-Replay QR (Código Único Intransferible)</strong>
                <p>Bloquea automáticamente cualquier intento posterior de usar un código QR ya validado.</p>
              </div>
              <label class="switch">
                <input type="checkbox" [(ngModel)]="configForm.enableQrAntiReplay">
                <span class="slider"></span>
              </label>
            </div>

            <div class="toggle-row">
              <div class="toggle-info">
                <strong>Permitir Búsqueda Manual en Puerta</strong>
                <p>Permite a los operadores buscar por nombre o teléfono si el invitado olvidó su código QR.</p>
              </div>
              <label class="switch">
                <input type="checkbox" [(ngModel)]="configForm.allowManualCheckIn">
                <span class="slider"></span>
              </label>
            </div>

            <div class="toggle-row">
              <div class="toggle-info">
                <strong>Requerir Aprobación de Registro RSVP</strong>
                <p>Las confirmaciones de invitados requerirán validación previa del anfitrión antes de emitir pase.</p>
              </div>
              <label class="switch">
                <input type="checkbox" [(ngModel)]="configForm.requireApproval">
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <!-- Card 3: Database & Local Backups -->
          <div class="settings-card">
            <div class="card-section-title">
              <app-icon name="download" [size]="18"></app-icon>
              <h3>Base de Datos &amp; Exportación de Respaldos</h3>
            </div>

            <p class="field-hint">
              Genera copias completas de seguridad en formato JSON estructurado con todos los eventos, mesas, salones e invitados.
            </p>

            <div class="backup-actions-row">
              <button class="btn-outline btn-backup" (click)="exportFullJsonBackup()">
                <app-icon name="download" [size]="14"></app-icon>
                <span>Descargar Respaldo JSON</span>
              </button>
              <span class="btn-outline" style="cursor: default; color: #059669; border-color: rgba(16, 185, 129, 0.35); background: rgba(16, 185, 129, 0.08);">
                <app-icon name="check-circle" [size]="14"></app-icon>
                <span>Respaldo &amp; Nube en Vivo Activa</span>
              </span>
            </div>
          </div>

        </div>

        <!-- Column 2: Seating Engine & WhatsApp Notifications -->
        <div class="settings-column">
          
          <!-- Card 4: Seating Engine -->
          <div class="settings-card">
            <div class="card-section-title">
              <app-icon name="croquis" [size]="18"></app-icon>
              <h3>Motor Algorítmico de Salones &amp; Mesas</h3>
            </div>

            <div class="toggle-row">
              <div class="toggle-info">
                <strong>Algoritmo Automático de Mesas Inteligente</strong>
                <p>Reacomoda automáticamente a comensales preservando núcleos familiares y acompañantes juntos.</p>
              </div>
              <label class="switch">
                <input type="checkbox" [(ngModel)]="configForm.autoTableAssignment">
                <span class="slider"></span>
              </label>
            </div>

            <div class="universal-venues-box">
              <div class="card-section-title" style="margin-top: 10px;">
                <app-icon name="sparkles" [size]="16"></app-icon>
                <h4>Compatibilidad Universal de Espacios &amp; Salones</h4>
              </div>
              <p class="field-hint">
                EvenPass modela y calcula croquis para cualquier tipología de recinto sin límite de aforo ni geometrías fijas:
              </p>
              <div class="venues-tags-grid">
                <span class="venue-pill"><b>Salones Cerrados &amp; Ballrooms</b> (Mesas redondas 10-12 pax y pista central)</span>
                <span class="venue-pill"><b>Jardines &amp; Quintas al Aire Libre</b> (Distribuciones abiertas y carpas)</span>
                <span class="venue-pill"><b>Haciendas Coloniales &amp; Patios</b> (Mesas imperiales rectangulares 8-24 pax)</span>
                <span class="venue-pill"><b>Terrazas, Playas &amp; Rooftops</b> (Mobiliario lounge, periqueras y zonas VIP)</span>
                <span class="venue-pill"><b>Centros de Convenciones &amp; Auditorios</b> (Disposición banquete, herradura y gala)</span>
              </div>
            </div>
          </div>

          <!-- Card 5: WhatsApp Notification Template -->
          <div class="settings-card">
            <div class="card-section-title">
              <app-icon name="message" [size]="18"></app-icon>
              <h3>Plantilla de Mensajería WhatsApp</h3>
            </div>

            <div class="form-group">
              <label>Plantilla de Invitación y Enlace de Pase</label>
              <textarea 
                rows="4" 
                [(ngModel)]="configForm.whatsappMessageTemplate" 
                placeholder="Hola {nombre}! Te compartimos tu pase oficial para {evento}. Mesa: {mesa}. Ver pase: {url}"
              ></textarea>
              <small class="field-hint">Variables dinámicas: <code>&#123;nombre&#125;</code>, <code>&#123;evento&#125;</code>, <code>&#123;mesa&#125;</code>, <code>&#123;url&#125;</code>, <code>&#123;folio&#125;</code>.</small>
            </div>

            <div class="preview-msg-box">
              <span class="preview-label">VISTA PREVIA DEL MENSAJE DE WHATSAPP:</span>
              <p class="preview-text">{{ getPreviewMessage() }}</p>
            </div>
          </div>

        </div>

      </div>

    </div>
  `,
  styles: [`
    .settings-page-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .settings-header-card {
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
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      background: var(--brand-blue-light);
      color: var(--brand-blue);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .settings-header-card h2 {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0;
    }

    .settings-header-card p {
      font-size: 0.88rem;
      color: var(--text-muted);
      margin: 4px 0 0;
    }

    /* High Contrast Save Button */
    .btn-save-contrast {
      background-color: #0284c7 !important;
      color: #ffffff !important;
      font-weight: 800 !important;
      border: 1px solid #0369a1 !important;
      padding: 11px 24px !important;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35) !important;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border-radius: var(--radius-full);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-save-contrast:hover {
      background-color: #0369a1 !important;
      transform: translateY(-1px);
    }

    [data-theme="dark"] .btn-save-contrast {
      background-color: #0284c7 !important;
      color: #ffffff !important;
      border-color: #38bdf8 !important;
    }

    /* Grid */
    .settings-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .settings-column {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .settings-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: var(--shadow-sm);
    }

    .card-section-title {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--brand-blue);
      border-bottom: 1px solid var(--border-ui);
      padding-bottom: 12px;
    }

    .card-section-title h3 {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .form-group input,
    .form-group textarea {
      padding: 10px 14px;
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-sm);
      color: var(--text-main);
      font-size: 0.88rem;
      outline: none;
      font-family: inherit;
    }

    .form-group input:focus,
    .form-group textarea:focus {
      border-color: var(--brand-blue);
    }

    .field-hint {
      font-size: 0.76rem;
      color: var(--text-muted);
    }

    .field-hint code {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      padding: 2px 5px;
      border-radius: 4px;
      font-family: monospace;
      color: var(--brand-blue);
    }

    .theme-preference-block {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px;
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-md);
      gap: 12px;
    }

    .pref-text strong {
      font-size: 0.85rem;
      color: var(--text-main);
      display: block;
    }

    .pref-text p {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin: 2px 0 0;
    }

    .theme-toggle-btn {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      color: var(--text-main);
      padding: 8px 14px;
      border-radius: var(--radius-md);
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
      transition: all 0.2s;
    }

    .theme-toggle-btn:hover {
      border-color: var(--brand-blue);
      color: var(--brand-blue);
    }

    /* Toggles */
    .toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-ui);
    }

    .toggle-row:last-child {
      border-bottom: none;
    }

    .toggle-info strong {
      font-size: 0.86rem;
      color: var(--text-main);
      display: block;
    }

    .toggle-info p {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin: 2px 0 0;
    }

    /* Switch Component */
    .switch {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 28px;
      flex-shrink: 0;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background-color: #cbd5e1;
      border: 2px solid #94a3b8;
      border-radius: 28px;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: #ffffff;
      border: 1px solid #94a3b8;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: #0284c7;
      border-color: #0369a1;
    }

    input:checked + .slider:before {
      transform: translateX(22px);
      border-color: #ffffff;
    }

    [data-theme="dark"] .slider {
      background-color: #1e293b;
      border-color: #475569;
    }

    [data-theme="dark"] .slider:before {
      background-color: #f8fafc;
      border-color: #64748b;
    }

    [data-theme="dark"] input:checked + .slider {
      background-color: #0284c7;
      border-color: #38bdf8;
    }

    .info-alert-box {
      background: var(--brand-blue-light);
      border: 1px solid rgba(2, 132, 199, 0.25);
      border-radius: var(--radius-md);
      padding: 12px 14px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      color: var(--brand-blue);
    }

    .alert-content strong {
      font-size: 0.84rem;
      color: var(--text-main);
      display: block;
    }

    .alert-content p {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin: 2px 0 0;
    }

    .preview-msg-box {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-left: 3px solid #10b981;
      border-radius: var(--radius-md);
      padding: 12px 14px;
    }

    .preview-label {
      font-size: 0.68rem;
      font-weight: 800;
      color: #047857;
      letter-spacing: 0.04em;
      display: block;
      margin-bottom: 4px;
    }

    .preview-text {
      font-size: 0.84rem;
      color: var(--text-main);
      line-height: 1.4;
      margin: 0;
    }

    .backup-actions-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .universal-venues-box {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 4px;
    }

    .venues-tags-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .venue-pill {
      font-size: 0.78rem;
      padding: 8px 12px;
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-sm);
      color: var(--text-main);
      line-height: 1.4;
    }

    .venue-pill b {
      color: var(--brand-blue);
    }

    @media (max-width: 900px) {
      .settings-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SettingsComponent {
  configForm: SystemConfig;

  constructor(
    public eventService: EventService,
    public themeService: ThemeService,
    private notificationService: NotificationService
  ) {
    this.configForm = { ...this.eventService.systemConfig() };
  }

  saveSettings(): void {
    this.eventService.updateSystemConfig(this.configForm);
  }

  getPreviewMessage(): string {
    const tmpl = this.configForm.whatsappMessageTemplate;
    const activeEv = this.eventService.selectedEvent();
    return tmpl
      .replace('{nombre}', 'Ana Valentina Ruiz')
      .replace('{evento}', activeEv ? activeEv.name : 'Boda de Sofía & Mateo')
      .replace('{mesa}', 'Mesa 01 (Redonda)')
      .replace('{url}', 'https://evenpass.io/p/EP-9901')
      .replace('{folio}', 'EP-9901');
  }

  exportFullJsonBackup(): void {
    const fullBackup = {
      exportedAt: new Date().toISOString(),
      platform: this.configForm.platformName,
      events: this.eventService.events(),
      salons: this.eventService.salons(),
      guests: this.eventService.allGuests(),
      logs: this.eventService.allLogs(),
      systemConfig: this.configForm
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `EvenPass_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    this.notificationService.show('success', 'Respaldo Generado', 'Archivo JSON descargado exitosamente.');
  }
}
