/**
 * EvenPass Landing Page Interactive Features
 * Modern Minimalist Architecture · Executive SaaS Standard
 */

// Executive Luxury Toast Notification Helper (Zero browser alert popups)
window.showLandingNotice = function(title, message, type = 'info') {
  let container = document.getElementById('landing-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'landing-toast-container';
    container.className = 'landing-toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `landing-toast toast-${type}`;

  const iconSvg = type === 'success' 
    ? `<svg class="landing-toast-icon" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
    : (type === 'warning'
      ? `<svg class="landing-toast-icon" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
      : `<svg class="landing-toast-icon" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`);

  toast.innerHTML = `
    ${iconSvg}
    <div class="landing-toast-body">
      <div class="landing-toast-title">${title}</div>
      <div class="landing-toast-msg">${message}</div>
    </div>
    <button type="button" class="landing-toast-close" aria-label="Cerrar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;

  const closeBtn = toast.querySelector('.landing-toast-close');
  const dismiss = () => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  };

  if (closeBtn) closeBtn.addEventListener('click', dismiss);
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(dismiss, 4500);
};

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initScannerDemo();
  initCroquisDemo();
  initTemplateModals();
  initClientEventSimulator();
  initClientSupport();
});

// 1. THEME TOGGLE (Dark / Light Mode with SVG Icons)
function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const themeSvgIcon = document.getElementById('theme-svg-icon');
  
  // Check preference
  const savedTheme = localStorage.getItem('evenpass-theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  
  applyTheme(savedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('evenpass-theme', theme);
    if (themeSvgIcon) {
      if (theme === 'dark') {
        // Sun SVG
        themeSvgIcon.innerHTML = `
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        `;
      } else {
        // Moon SVG
        themeSvgIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
      }
    }
  }
}

// 2. HERO PHONE SCANNER SIMULATION
function initScannerDemo() {
  const scanBtn = document.getElementById('hero-scan-btn');
  const countEl = document.getElementById('hero-scan-count');
  const statusEl = document.getElementById('hero-scan-status');
  
  const demoGuests = [
    { name: "Sofía Martínez & Acompañante", table: "Mesa 04 (Salón Principal)", passes: 2, status: "OK", msg: "Acceso Autorizado" },
    { name: "Carlos Eduardo Mendoza", table: "Mesa 08 (Jardín)", passes: 1, status: "OK", msg: "Acceso Autorizado" },
    { name: "Valeria Gómez", table: "Mesa 02 (VIP)", passes: 3, status: "OK", msg: "Acceso Autorizado" },
    { name: "Pase Duplicado #EP-994", table: "--", passes: 0, status: "DUPLICATE", msg: "Alerta: Pase ya utilizado a las 20:14 hrs" }
  ];

  let guestIdx = 0;
  let count = 95;

  if (scanBtn) {
    scanBtn.addEventListener('click', () => {
      const guest = demoGuests[guestIdx % demoGuests.length];
      guestIdx++;

      if (guest.status === "OK") {
        count++;
        if (countEl) countEl.textContent = count;
        if (statusEl) {
          statusEl.innerHTML = `
            <div style="background:#065f46; color:#a7f3d0; border-radius:12px; padding:12px; margin-top:10px; animation:fadeIn 0.3s ease;">
              <div style="font-weight:700; font-size:0.95rem;">[OK] ${guest.msg}</div>
              <div style="font-size:0.85rem; margin-top:4px;"><b>${guest.name}</b> · ${guest.table}</div>
              <div style="font-size:0.75rem; opacity:0.85; margin-top:2px;">Pases validados: ${guest.passes}</div>
            </div>
          `;
        }
      } else {
        if (statusEl) {
          statusEl.innerHTML = `
            <div style="background:#7f1d1d; color:#fecaca; border-radius:12px; padding:12px; margin-top:10px; animation:shake 0.4s ease;">
              <div style="font-weight:700; font-size:0.95rem;">[DENEGADO] ${guest.msg}</div>
              <div style="font-size:0.8rem; margin-top:4px;">Intento de re-ingreso bloqueado por seguridad anti-captura.</div>
            </div>
          `;
        }
      }
    });
  }
}

// 3. INTERACTIVE CROQUIS DE SALÓN & AUTO-ASSIGN DEMO
function initCroquisDemo() {
  const autoAssignBtn = document.getElementById('btn-auto-assign-demo');
  const croquisStatusText = document.getElementById('croquis-status-text');
  const tables = document.querySelectorAll('.table-node');
  
  // Inspector elements
  const inspectorName = document.getElementById('inspector-table-name');
  const inspectorCap = document.getElementById('inspector-table-cap');
  const inspectorGuests = document.getElementById('inspector-guests-list');
  const requestTableBtn = document.getElementById('btn-request-table-setup');

  const TABLE_DATA = {
    'Mesa 01': {
      title: 'Mesa 01 · Zona Frontal Escenario',
      cap: '4 / 10 Ocupados · 6 Lugares Disponibles',
      guests: [
        { label: 'Familia Garza (3 pases)', type: 'chip-seated' },
        { label: 'Lic. Roberto Gómez (1 pase)', type: 'chip-seated' },
        { label: '6 lugares disponibles para asignar', type: 'chip-free' }
      ]
    },
    'Mesa 02': {
      title: 'Mesa 02 · Ala Izquierda Salón',
      cap: '2 / 10 Ocupados · 8 Lugares Disponibles',
      guests: [
        { label: 'Padrinos de Velación (2 pases)', type: 'chip-seated' },
        { label: '8 lugares disponibles para asignar', type: 'chip-free' }
      ]
    },
    'Mesa 03': {
      title: 'Mesa 03 · Lateral Pista de Baile',
      cap: '4 / 8 Ocupados · 4 Lugares Disponibles',
      guests: [
        { label: 'Grupo Jóvenes Universitarios (4 pases)', type: 'chip-seated' },
        { label: '4 lugares disponibles para asignar', type: 'chip-free' }
      ]
    },
    'Mesa 04': {
      title: 'Mesa 04 · Ala Derecha Salón',
      cap: '4 / 10 Ocupados · 6 Lugares Disponibles',
      guests: [
        { label: 'Familia Domínguez & Abuelos (4 pases)', type: 'chip-seated' },
        { label: '6 lugares disponibles para asignar', type: 'chip-free' }
      ]
    },
    'Mesa 05': {
      title: 'Mesa 05 · Centro Lateral',
      cap: '2 / 10 Ocupados · 8 Lugares Disponibles',
      guests: [
        { label: 'Invitados Foráneos (2 pases)', type: 'chip-seated' },
        { label: '8 lugares disponibles para asignar', type: 'chip-free' }
      ]
    },
    'Mesa 06': {
      title: 'Mesa 06 · Zona Jardín Posterior',
      cap: '2 / 8 Ocupados · 6 Lugares Disponibles',
      guests: [
        { label: 'Familia Valenzuela (2 pases)', type: 'chip-seated' },
        { label: '6 lugares disponibles para asignar', type: 'chip-free' }
      ]
    }
  };

  let isAssigned = false;

  // Auto-Assign Demo Button
  if (autoAssignBtn) {
    autoAssignBtn.addEventListener('click', () => {
      isAssigned = !isAssigned;
      
      if (isAssigned) {
        autoAssignBtn.innerHTML = `<span>Calculando Distribución Inteligente...</span>`;
        autoAssignBtn.disabled = true;

        setTimeout(() => {
          tables.forEach((t) => {
            const max = t.getAttribute('data-max') || '10';
            const capSpan = t.querySelector('.t-cap');
            const seats = t.querySelector('.seats-dots');
            
            t.classList.add('status-full');
            if (capSpan) capSpan.textContent = `${max} / ${max} asignados`;
            
            if (seats) {
              seats.innerHTML = '';
              for (let i = 0; i < parseInt(max); i++) {
                const dot = document.createElement('span');
                dot.className = 'seat-dot';
                seats.appendChild(dot);
              }
            }
          });

          if (croquisStatusText) {
            croquisStatusText.innerHTML = `<b>Distribución 100% Optimizada:</b> 54 comensales ubicados automáticamente por afinidad familiar sin sillas huérfanas.`;
          }

          if (inspectorCap) inspectorCap.textContent = 'Mesa al 100% de Aforo (Cupo Completo)';
          if (inspectorGuests) {
            inspectorGuests.innerHTML = `
              <span class="guest-chip chip-seated">Familia Garza (3 pases)</span>
              <span class="guest-chip chip-seated">Lic. Roberto Gómez (1 pase)</span>
              <span class="guest-chip chip-seated">Acompañantes Afines (6 pases asignados)</span>
            `;
          }

          autoAssignBtn.innerHTML = `<span>Restablecer Croquis</span>`;
          autoAssignBtn.disabled = false;
        }, 600);
      } else {
        tables.forEach((t, idx) => {
          t.classList.remove('status-full');
          const max = t.getAttribute('data-max') || '10';
          const capSpan = t.querySelector('.t-cap');
          const seats = t.querySelector('.seats-dots');
          
          const initial = idx % 2 === 0 ? '4' : '2';
          if (capSpan) capSpan.textContent = `${initial} / ${max} ocupados`;
          if (seats) {
            seats.innerHTML = '';
            for (let i = 0; i < parseInt(initial); i++) {
              const dot = document.createElement('span');
              dot.className = 'seat-dot';
              seats.appendChild(dot);
            }
          }
        });

        if (croquisStatusText) {
          croquisStatusText.innerHTML = `Toca cualquiera de las mesas para inspeccionar su aforo y distribución o activa la asignación automática inteligente.`;
        }

        // Reset to Table 1 preview
        selectTable('Mesa 01');
        autoAssignBtn.innerHTML = `<span>Asignar Mesas Automáticamente</span>`;
      }
    });
  }

  // Interactive Table Selection
  tables.forEach(table => {
    table.addEventListener('click', () => {
      const name = table.querySelector('.t-name')?.textContent.trim() || 'Mesa 01';
      selectTable(name, table);
    });
  });

  function selectTable(tableName, tableElement) {
    // Remove active state from all
    tables.forEach(t => t.classList.remove('is-active-table'));

    if (tableElement) {
      tableElement.classList.add('is-active-table');
    } else {
      tables.forEach(t => {
        if (t.querySelector('.t-name')?.textContent.trim() === tableName) {
          t.classList.add('is-active-table');
        }
      });
    }

    const data = TABLE_DATA[tableName] || TABLE_DATA['Mesa 01'];

    if (inspectorName) inspectorName.textContent = data.title;
    if (inspectorCap) inspectorCap.textContent = data.cap;

    if (inspectorGuests) {
      inspectorGuests.innerHTML = '';
      data.guests.forEach(g => {
        const chip = document.createElement('span');
        chip.className = `guest-chip ${g.type}`;
        chip.textContent = g.label;
        inspectorGuests.appendChild(chip);
      });
    }

    if (croquisStatusText) {
      croquisStatusText.innerHTML = `Mostrando <b>${data.title}</b>. Cada invitado recibe en su pase QR el croquis de su mesa.`;
    }

    if (requestTableBtn) {
      const msg = `Hola EvenPass! Me interesa solicitar para mi evento una distribución con croquis inteligente similar a ${data.title}.`;
      requestTableBtn.href = `https://wa.me/526671234567?text=${encodeURIComponent(msg)}`;
    }
  }

  // Initial highlight on Table 1
  selectTable('Mesa 01');
}

// 4. TEMPLATE MODALS PREVIEW
function initTemplateModals() {
  const modal = document.getElementById('preview-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalFrame = document.getElementById('modal-frame-container');
  const closeBtn = document.getElementById('modal-close-btn');

  const previewButtons = document.querySelectorAll('[data-preview-template]');

  previewButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const templateType = btn.getAttribute('data-preview-template');
      openTemplatePreview(templateType);
    });
  });

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      if (modalFrame) modalFrame.innerHTML = '';
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        if (modalFrame) modalFrame.innerHTML = '';
      }
    });
  }

  function openTemplatePreview(type) {
    if (!modal || !modalFrame) return;

    if (type === 'gold-wedding') {
      if (modalTitle) modalTitle.textContent = "Plantilla: Miriam & Isidro (Gold Luxury Wedding)";
      modalFrame.innerHTML = `
        <div style="background:#050505; color:#fff; border-radius:16px; padding:32px 24px; text-align:center; font-family:'Cormorant Garamond', Georgia, serif; border:1px solid #d4af37;">
          <div style="font-size:0.85rem; letter-spacing:4px; text-transform:uppercase; color:#d4af37; margin-bottom:12px;">Nuestra Boda</div>
          <h2 style="font-size:2.8rem; color:#d4af37; margin-bottom:8px; font-weight:400;">Miriam & Isidro</h2>
          <p style="font-family:'Plus Jakarta Sans', sans-serif; font-size:0.9rem; color:#d1d5db; max-width:400px; margin:0 auto 24px;">
            Con la bendición de Dios y nuestros padres, tenemos el honor de invitarte a celebrar nuestra unión matrimonial.
          </p>
          <div style="display:flex; justify-content:center; gap:16px; margin-bottom:28px; font-family:'Plus Jakarta Sans', sans-serif;">
            <div style="background:rgba(212,175,55,0.15); border:1px solid #d4af37; padding:10px 16px; border-radius:10px;">
              <span style="font-size:1.6rem; font-weight:700; color:#d4af37;">24</span>
              <small style="display:block; font-size:0.75rem;">OCTUBRE 2026</small>
            </div>
            <div style="background:rgba(212,175,55,0.15); border:1px solid #d4af37; padding:10px 16px; border-radius:10px;">
              <span style="font-size:1.6rem; font-weight:700; color:#d4af37;">17:00</span>
              <small style="display:block; font-size:0.75rem;">HORAS</small>
            </div>
          </div>
          <div style="background:rgba(255,255,255,0.05); border-radius:12px; padding:20px; max-width:420px; margin:0 auto 24px; text-align:left; font-family:'Plus Jakarta Sans', sans-serif;">
            <div style="font-weight:700; color:#d4af37; font-size:0.95rem; margin-bottom:6px;">Ceremonia &amp; Recepción</div>
            <div style="font-size:0.88rem; color:#e2e8f0;">Hacienda Los Olivos · Salón Real Imperial</div>
            <div style="font-size:0.8rem; color:#94a3b8; margin-top:4px;">Código de vestimenta: Rigurosa Etiqueta / Adultos</div>
          </div>
          <div style="padding:16px; background:#14224f; border-radius:12px; max-width:420px; margin:0 auto;">
            <div style="font-size:0.85rem; color:#93c5fd; font-family:'Plus Jakarta Sans', sans-serif; margin-bottom:10px;">
              Pase Digital EvenPass: <b>Mesa 01 · 2 Lugares</b>
            </div>
            <button class="btn btn-teal btn-sm" onclick="window.showLandingNotice('Confirmación RSVP', '¡Asistencia confirmada con éxito! Tu pase digital ha sido asignado.', 'success')">Confirmar Asistencia (RSVP)</button>
          </div>
        </div>
      `;
    } else if (type === 'neon-party') {
      if (modalTitle) modalTitle.textContent = "Plantilla: Mis 18 & Fiesta Neón Glow (Estilo VIP Night)";
      modalFrame.innerHTML = `
        <div style="background:#0a0a0c; color:#fff; border-radius:16px; padding:36px 24px; text-align:center; font-family:'Plus Jakarta Sans', sans-serif; border:1px solid #ff2a85; box-shadow:0 0 30px rgba(255,42,133,0.3);">
          <div style="font-size:0.8rem; letter-spacing:4px; text-transform:uppercase; color:#ff2a85; margin-bottom:10px;">Exclusive VIP Event</div>
          <h2 style="font-size:3.5rem; color:#ffffff; text-shadow:0 0 15px #ff2a85, 0 0 30px #ff2a85; font-weight:800; line-height:1; margin-bottom:12px;">
            MIS 18
          </h2>
          <div style="font-size:1.8rem; color:#ff80bf; font-family:cursive; margin-bottom:20px;">Ivonne &amp; Friends</div>
          <p style="font-size:0.9rem; color:#cbd5e1; max-width:380px; margin:0 auto 20px;">
            La mejor noche del año: show de luces, DJ estelar y control de acceso VIP.
          </p>
          <div style="display:inline-block; border:1px solid #ff2a85; background:rgba(255,42,133,0.12); padding:10px 24px; border-radius:30px; font-weight:700; margin-bottom:24px;">
            Dress Code: Total Black con Toques Neón
          </div>
          <div style="background:rgba(255,255,255,0.04); border-radius:14px; padding:20px; max-width:380px; margin:0 auto 20px;">
            <div style="font-size:0.82rem; color:#94a3b8; margin-bottom:6px;">LUGAR DEL EVENTO</div>
            <div style="font-weight:700; font-size:1rem;">Sky Lounge Terrace, Culiacán</div>
            <button class="btn btn-sm btn-secondary" style="margin-top:12px; width:100%;" onclick="window.showLandingNotice('Ubicación del Recinto', 'Redirigiendo a Google Maps con coordenadas del evento.', 'info')">Ver Ubicación en Maps</button>
          </div>
          <button class="btn btn-primary" style="background:linear-gradient(135deg,#ff2a85,#9333ea);" onclick="window.showLandingNotice('Acceso VIP Confirmado', 'Tu pase VIP con código QR intransferible ha sido generado.', 'success')">
            Confirmar Asistencia VIP
          </button>
        </div>
      `;
    } else {
      if (modalTitle) modalTitle.textContent = "Plantilla: Editorial Gala & Corporativo";
      modalFrame.innerHTML = `
        <div style="background:#ffffff; color:#0f172a; border-radius:16px; padding:36px 24px; text-align:center; font-family:'Plus Jakarta Sans', sans-serif; border:1px solid #e2e8f0;">
          <div style="font-size:0.8rem; letter-spacing:3px; text-transform:uppercase; color:#2563eb; font-weight:700; margin-bottom:10px;">Gala Anual 2026</div>
          <h2 style="font-size:2.4rem; font-weight:800; margin-bottom:12px;">Tech &amp; Leadership Summit</h2>
          <p style="font-size:0.95rem; color:#475569; max-width:420px; margin:0 auto 24px;">
            Noche de premiación, networking de alto nivel y cena de gala.
          </p>
          <div style="display:flex; justify-content:center; gap:20px; margin-bottom:24px;">
            <div style="border-left:3px solid #2563eb; text-align:left; padding-left:10px;">
              <small style="color:#64748b; font-size:0.75rem;">FECHA</small>
              <div style="font-weight:700;">12 Noviembre 2026</div>
            </div>
            <div style="border-left:3px solid #10b981; text-align:left; padding-left:10px;">
              <small style="color:#64748b; font-size:0.75rem;">SEDE</small>
              <div style="font-weight:700;">Centro de Convenciones</div>
            </div>
          </div>
          <button class="btn btn-primary" onclick="window.showLandingNotice('Pase Digital Emitido', 'Invitación confirmada y pase QR listo para descargar.', 'success')">Descargar Pase QR</button>
        </div>
      `;
    }

    modal.classList.add('active');
  }
}

// 5. CLIENT EVENT SIMULATOR & QUOTATION BUILDER
function initClientEventSimulator() {
  const eventTypeChips = document.querySelectorAll('#sim-event-types .sim-chip-btn');
  const venueTypeChips = document.querySelectorAll('#sim-venue-types .sim-chip-btn');
  const slider = document.getElementById('sim-capacity-slider');
  const capacityVal = document.getElementById('sim-capacity-val');
  const tablesVal = document.getElementById('sim-tables-val');
  const planTitle = document.getElementById('sim-plan-title');
  const planDesc = document.getElementById('sim-plan-desc');
  const priceVal = document.getElementById('sim-price-val');
  const waBtn = document.getElementById('btn-whatsapp-quote-client');

  if (!slider) return;

  let selectedType = 'Boda';
  let selectedVenue = 'Salón Cerrado Climatizado';

  // Event Type Selection
  eventTypeChips.forEach(btn => {
    btn.addEventListener('click', () => {
      eventTypeChips.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedType = btn.getAttribute('data-type') || btn.textContent.trim();
      updateSimulation();
    });
  });

  // Venue Type Selection
  venueTypeChips.forEach(btn => {
    btn.addEventListener('click', () => {
      venueTypeChips.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedVenue = btn.getAttribute('data-venue') || btn.textContent.trim();
      updateSimulation();
    });
  });

  // Slider change
  slider.addEventListener('input', () => {
    updateSimulation();
  });

  function updateSimulation() {
    const capacity = parseInt(slider.value, 10) || 200;
    const tables = Math.ceil(capacity / 10);

    if (capacityVal) capacityVal.textContent = capacity;
    if (tablesVal) tablesVal.textContent = `~${tables} mesas estimadas (10 pax/mesa)`;

    let planName = 'Plan Premium CAD & Croquis';
    let planInfo = 'Solución integral para bodas y galas con croquis de salón interactivo, asignación personalizada de mesas y control de accesos por escáner de alta velocidad.';
    let price = '$2,490';

    if (capacity <= 120 && tables <= 12) {
      planName = 'Plan Esencial';
      planInfo = 'Ideal para celebraciones íntimas: Invitación digital de gala, confirmación RSVP en tiempo real y pases digitales con QR personal.';
      price = '$990';
    } else if (capacity <= 200) {
      planName = 'Plan Estándar';
      planInfo = 'Perfecto para fiestas medianas: RSVP digital, control de asistencia en puerta por escáner de alta velocidad y monitoreo en vivo para anfitriones.';
      price = '$1,890';
    }

    if (planTitle) planTitle.textContent = planName;
    if (planDesc) planDesc.textContent = planInfo;
    if (priceVal) priceVal.textContent = price;

    if (waBtn) {
      const msg = `Hola EvenPass! Estuve en su simulador web y deseo cotizar mi evento:
- Tipo de Evento: ${selectedType}
- Invitados Estimados: ${capacity} personas (~${tables} mesas)
- Estilo de Recinto: ${selectedVenue}
- Propuesta Sugerida: ${planName} (${price} MXN)

¿Me podrían brindar información de disponibilidad para mi fecha y paquetes de atención?`;

      waBtn.href = `https://wa.me/526671234567?text=${encodeURIComponent(msg)}`;
    }
  }

  if (waBtn) {
    waBtn.addEventListener('click', () => {
      if (window.showLandingNotice) {
        window.showLandingNotice('Enlace de WhatsApp', 'Abriendo chat directo con un coordinador de EvenPass para apartar tu fecha.', 'success');
      }
    });
  }

  // Initial calculation
  updateSimulation();
}

// 6. CLIENT SUPPORT & INCIDENT RESOLUTION DESK
function initClientSupport() {
  const form = document.getElementById('support-ticket-form');
  const nameInput = document.getElementById('supp-name');
  const eventInput = document.getElementById('supp-event');
  const typeSelect = document.getElementById('supp-type');
  const phoneInput = document.getElementById('supp-phone');
  const descInput = document.getElementById('supp-desc');
  const feedback = document.getElementById('supp-feedback');

  const waQuickInput = document.getElementById('wa-quick-msg');
  const waUrgentBtn = document.getElementById('btn-wa-urgent-direct');

  // Dynamic WhatsApp quick message link with incident keyword detection
  if (waQuickInput && waUrgentBtn) {
    waQuickInput.addEventListener('input', () => {
      const val = waQuickInput.value.trim();
      const lower = val.toLowerCase();
      const hasIssue = /problema|error|falla|inconveniente|urgente|ayuda|no\s*entra|duplicad/i.test(lower);

      let msg = '';
      if (hasIssue) {
        msg = `[SOPORTE URGENTE - PROBLEMA DETECTADO]\n${val || 'Requiero asistencia técnica de emergencia para mi evento.'}`;
      } else {
        msg = `Hola EvenPass, tengo una duda sobre mi evento:\n${val || '¿Podrían brindarme información?'}`;
      }
      waUrgentBtn.href = `https://wa.me/526671234567?text=${encodeURIComponent(msg)}`;
    });
  }

  // Form submission handler
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = nameInput ? nameInput.value.trim() : '';
      const eventName = eventInput ? eventInput.value.trim() : '';
      const type = typeSelect ? typeSelect.value : 'OTRO';
      const phone = phoneInput ? phoneInput.value.trim() : '';
      const desc = descInput ? descInput.value.trim() : '';

      if (!name || !eventName || !desc) {
        window.showLandingNotice('Datos Incompletos', 'Por favor completa todos los campos requeridos para enviar tu reporte.', 'warning');
        return;
      }

      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const folio = `#INC-${randomNum}`;
      const timestamp = new Date().toLocaleDateString('es-MX') + ' ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

      const newTicket = {
        id: Date.now(),
        folio: folio,
        clientName: name,
        eventName: eventName,
        type: type,
        phone: phone,
        issue: desc,
        status: 'ABIERTO',
        date: timestamp
      };

      // Persist to localStorage for EvenPass SaaS Support Center & NotificationService
      try {
        let existing = [];
        const raw = localStorage.getItem('evenpass_incoming_tickets');
        if (raw) existing = JSON.parse(raw);
        existing.unshift(newTicket);
        localStorage.setItem('evenpass_incoming_tickets', JSON.stringify(existing));
        localStorage.setItem('evenpass_latest_client_incident', JSON.stringify(newTicket));

        // Trigger storage event for live tab updates
        window.dispatchEvent(new Event('storage'));
      } catch (err) {
        console.error('Error saving ticket:', err);
      }

      if (feedback) {
        feedback.style.display = 'block';
        feedback.style.background = '#ecfdf5';
        feedback.style.color = '#047857';
        feedback.style.border = '1px solid #10b981';
        feedback.innerHTML = `
          <div style="font-size:0.95rem; font-weight:700;">¡Reporte ${folio} Enviado con Éxito!</div>
          <div style="font-size:0.82rem; margin-top:4px;">Tu solicitud fue transferida al panel de soporte técnico.</div>
          <div style="margin-top:10px;">
            <a href="https://wa.me/526671234567?text=${encodeURIComponent(`[REPORTE ${folio}] Hola EvenPass, registré una solicitud de soporte para el evento "${eventName}":\n\nDetalle: ${desc}\n\nContacto: ${name} (${phone})`)}" target="_blank" class="btn btn-whatsapp btn-sm" style="display:inline-flex;">
              Confirmar por WhatsApp con Folio ${folio}
            </a>
          </div>
        `;
      }

      form.reset();
    });
  }
}
