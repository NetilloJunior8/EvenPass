import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon.component';

@Component({
  selector: 'app-guia',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="guia-page-container">

      <!-- Header Box -->
      <div class="guia-header-card">
        <div class="header-title-row">
          <div class="header-icon-badge">
            <app-icon name="help" [size]="24"></app-icon>
          </div>
          <div>
            <h2>Guía de Uso &amp; Manual Operativo de EvenPass</h2>
            <p>Documentación técnica y manual paso a paso de los módulos de arquitectura multi-salón, auto-detección IA, comandos rápidos y control de puertas.</p>
          </div>
        </div>
      </div>

      <!-- Steps Grid -->
      <div class="steps-guide-grid">

        <!-- Step 1: Multi-Salón Arquitectónico -->
        <div class="step-guide-card highlighted">
          <div class="step-badge auto">Novedad · Multi-Recinto</div>
          <h3>1. Arquitectura Multi-Salón &amp; Planos CAD Ilimitados</h3>
          <p>
            EvenPass no se limita a salones predeterminados. Los salones integrados son <b>ejemplos arquitectónicos y modelos base</b>, pero la plataforma permite crear, editar y dimensionar <b>cualquier tipo de recinto</b> (haciendas históricas, jardines al aire libre, playas, salones de banquete, terrazas o auditorios):
          </p>
          <ul class="step-bullets">
            <li><b>Ejemplo 1 - Salón Real Imperial:</b> 16 mesas simétricas (8 redondas de 10p + 8 imperiales de 8p), escenario estelar, DJ, barra y aforo de 250 personas.</li>
            <li><b>Ejemplo 2 - Carpa Real 40x60 White Pole Tent:</b> Carpa de poste 40x60 ft, pista 12x20, mesa de honor de 12 plazas, 14 mesas redondas, buffet y barra.</li>
            <li><b>Ejemplo 3 - Salón Zafiro Banquet Room:</b> Recinto íntimo 6.19m × 8.625m con chimenea arquitectónica, ventanales franceses y 5 mesas de banquete.</li>
            <li><b>Recintos Personalizados Infinitos:</b> Puedes agregar salones desde cero, definir sus medidas métricas exactas, añadir mesas redondas, rectangulares o imperiales y calibrar el aforo libremente.</li>
          </ul>
        </div>

        <!-- Step 2: Auto-Detección de Croquis con IA -->
        <div class="step-guide-card highlighted">
          <div class="step-badge auto">Tecnología IA</div>
          <h3>2. Auto-Detección Inteligente de Planos CAD</h3>
          <p>
            ¿Tienes el plano de un salón nuevo en imagen PNG, DWG o PDF? 
            En el módulo de <b>Croquis CAD &amp; Mesas</b> pulsa el botón <i>"Auto-Detectar con IA"</i>:
          </p>
          <ul class="step-bullets">
            <li>Sube el archivo o selecciona los presets arquitectónicos calibrados.</li>
            <li>El escáner láser analiza los perímetros, identifica mesas redondas e imperiales y calcula el aforo exacto.</li>
            <li>Genera y guarda automáticamente el salón en tu catálogo listo para asignar comensales.</li>
          </ul>
        </div>

        <!-- Step 3: Selector Inteligente Ctrl + K -->
        <div class="step-guide-card">
          <div class="step-badge">Productividad</div>
          <h3>3. Selector Rápido &amp; Paleta de Comandos (Ctrl + K)</h3>
          <p>
            Para gestionar miles de eventos de forma escalable sin perder tiempo en desplegables lentos:
          </p>
          <ul class="step-bullets">
            <li>Presiona <code>Ctrl + K</code> (o <code>Cmd + K</code> en Mac) o haz clic en el buscador de la barra superior.</li>
            <li>Filtra al instante por nombre, anfitrión, tipo de evento o recinto.</li>
            <li>Visualiza el avance de confirmaciones y estado (En Vivo, Pendiente, Finalizado) y cambia con 1 solo clic.</li>
          </ul>
        </div>

        <!-- Step 4: Control del Itinerario & Desfase en Bloque -->
        <div class="step-guide-card highlighted">
          <div class="step-badge auto">Operación en Vivo</div>
          <h3>4. Itinerario &amp; Ajuste de Desfase en Bloque</h3>
          <p>
            El cronograma está dividido en 3 fases visuales: <b>Lo que ya pasó</b>, <b>Lo que está pasando ahora</b> (con baliza luminosa en vivo) y <b>Lo que va a pasar</b>.
          </p>
          <div class="step-tip">
            <app-icon name="clock" [size]="16" class="tip-icon"></app-icon>
            <div>
              <b>Ajuste de Desfase:</b> Si la ceremonia o cena sufren retrasos de 15, 30 o 45 minutos, pulsa los botones de desfase en bloque (<code>+15 min</code>, <code>+30 min</code>) para mover toda la agenda futura automáticamente.
            </div>
          </div>
        </div>

        <!-- Step 5: Asignación Inteligente y Manual de Mesas -->
        <div class="step-guide-card">
          <div class="step-badge">Asignación</div>
          <h3>5. Ubicación de Invitados &amp; Familias</h3>
          <p>
            Puedes acomodar a los invitados mediante dos modalidades complementarias:
          </p>
          <ul class="step-bullets">
            <li><b>Automática con Algoritmo:</b> Presiona <i>"Asignar Automáticamente"</i> y el sistema sentará a los invitados confirmados garantizando que los grupos familiares y parejas nunca se separen.</li>
            <li><b>Manual desde el Inspector:</b> Haz clic en cualquier mesa del plano para ver su lista de comensales sentados, desasignar con 1 clic o seleccionar cualquier invitado no asignado.</li>
          </ul>
        </div>

        <!-- Step 6: Escáner QR Puerta & Anti-Replay -->
        <div class="step-guide-card">
          <div class="step-badge">Seguridad</div>
          <h3>6. Escaneo en Puerta con Anti-Fraude</h3>
          <p>
            El personal de recepción utiliza la cámara del dispositivo móvil o lector láser para validar los códigos QR.
          </p>
          <div class="step-tip">
            <app-icon name="shield" [size]="16" class="tip-icon"></app-icon>
            <div>
              <b>Protección Anti-Replay:</b> Si un invitado intenta usar un código duplicado o captura de pantalla ya autorizada previamente, el sistema lanza una alerta inmediata bloqueando el re-ingreso.
            </div>
          </div>
        </div>

        <!-- Step 7: Instalación PWA y Acceso Directo -->
        <div class="step-guide-card">
          <div class="step-badge">Móvil &amp; Desktop</div>
          <h3>7. Aplicación Web Progresiva (PWA)</h3>
          <p>
            EvenPass está diseñado bajo arquitectura PWA responsive. Puedes instalarlo en Windows, Mac, Android o iPhone:
          </p>
          <ul class="step-bullets">
            <li>Haz clic en el botón <b>"Instalar App"</b> situado en la barra superior.</li>
            <li>Se creará un acceso directo en tu escritorio o pantalla de inicio que funciona como una aplicación nativa sin barra de navegación.</li>
          </ul>
        </div>

        <!-- Step 8: Roles de Usuario & Control de Accesos -->
        <div class="step-guide-card highlighted">
          <div class="step-badge auto">Seguridad &amp; Permisos</div>
          <h3>8. Roles de Usuario &amp; Niveles de Acceso</h3>
          <p>
            El sistema opera con tres niveles jerárquicos de acceso basados en roles para garantizar la integridad operativa de cada evento:
          </p>
          <ul class="step-bullets">
            <li><b>Administrador General (<code>ROLE_ADMIN</code>):</b> Control absoluto de la plataforma, configuración global de la base de datos cloud, altas y bajas de recintos, catálogo de plantillas, gestión integral de usuarios y restablecimiento de contraseñas.</li>
            <li><b>Coordinador de Evento (<code>ROLE_ORGANIZER</code>):</b> Gestión operativa de eventos asignados, asignación de mesas en el croquis, consulta y sincronización de confirmaciones, descarga de listas de invitados y ajuste de tiempos en el itinerario.</li>
            <li><b>Staff de Puerta / Recepción (<code>ROLE_STAFF</code>):</b> Modo escáner QR de alta velocidad en puertas de entrada, verificación inmediata de boletos anti-fraude, búsqueda manual por nombre e indicación instantánea de la mesa asignada.</li>
          </ul>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .guia-page-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .guia-header-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 24px 28px;
      box-shadow: var(--shadow-sm);
    }

    .header-title-row {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon-badge {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      background: var(--brand-blue-light);
      color: var(--brand-blue);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .guia-header-card h2 {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0;
    }

    .guia-header-card p {
      font-size: 0.88rem;
      color: var(--text-muted);
      margin: 4px 0 0;
    }

    .steps-guide-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .step-guide-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: var(--shadow-sm);
    }

    .step-guide-card.highlighted {
      border-color: rgba(2, 132, 199, 0.4);
      background: linear-gradient(135deg, var(--bg-card) 0%, rgba(2, 132, 199, 0.03) 100%);
    }

    .step-badge {
      align-self: flex-start;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 3px 10px;
      border-radius: var(--radius-full);
      background: var(--bg-input);
      color: var(--text-muted);
      border: 1px solid var(--border-ui);
      text-transform: uppercase;
    }

    .step-badge.auto {
      background: var(--brand-blue-light);
      color: var(--brand-blue);
      border-color: rgba(2, 132, 199, 0.25);
    }

    .step-guide-card h3 {
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0;
    }

    .step-guide-card p {
      font-size: 0.86rem;
      color: var(--text-secondary);
      line-height: 1.5;
      margin: 0;
    }

    .step-bullets {
      padding-left: 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.84rem;
      color: var(--text-secondary);
      line-height: 1.45;
    }

    .step-bullets b {
      color: var(--text-main);
    }

    .step-tip {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-left: 3px solid var(--brand-blue);
      border-radius: var(--radius-md);
      padding: 12px 14px;
      display: flex;
      gap: 10px;
      align-items: flex-start;
      font-size: 0.82rem;
      color: var(--text-secondary);
      margin-top: 4px;
    }

    .tip-icon {
      color: var(--brand-blue);
      flex-shrink: 0;
      margin-top: 2px;
    }

    code {
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      padding: 1px 5px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.85em;
      color: var(--brand-blue);
    }

    @media (max-width: 900px) {
      .steps-guide-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class GuiaComponent {}
