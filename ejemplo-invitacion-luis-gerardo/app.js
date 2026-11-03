/**
 * INVITACIÓN VIP & PORTAL DEL ANFITRIÓN · LUIS GERARDO (10 AÑOS)
 * Lógica Completa: Countdown, Google Calendar, Asignación Automática de Mesas en Croquis,
 * Generación de Pase QR, Portal del Anfitrión y Sincronización en Tiempo Real.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL EVENTO Y SALÓN DE RECEPCIONES
// ============================================================================
const EVENT_CONFIG = {
  id: 6,
  title: 'Mis 10 Años · Luis Gerardo',
  boyName: 'Luis Gerardo',
  age: 10,
  targetDate: new Date('2026-11-14T16:00:00'),
  venue: 'Arena Laser Quest & Salón Neón VIP',
  venueAddress: 'Av. Paseo de los Héroes 450, Col. Las Quintas, Culiacán, Sin.',
  parentPhone: '526676118835', // Número oficial de atención y WhatsApp
  totalCapacity: 50,
  tables: [
    { id: 1, name: 'Mesa 01 - Familia Cercana', capacity: 10 },
    { id: 2, name: 'Mesa 02 - Amigos de Colegio', capacity: 10 },
    { id: 3, name: 'Mesa 03 - Padrinos & Tíos', capacity: 10 },
    { id: 4, name: 'Mesa 04 - Amigos Deportes & Laser', capacity: 10 },
    { id: 5, name: 'Mesa 05 - Invitados Especiales', capacity: 10 }
  ]
};

let currentView = 'guest';
let isAttending = true;
let passesCount = 2;

// ============================================================================
// 2. ENLACES A GOOGLE CALENDAR
// ============================================================================
function generateGoogleCalendarUrl(guestName = '', passes = 2, assignedTable = '') {
  const title = encodeURIComponent(`Mis 10 Años · Luis Gerardo`);
  // 14 de Noviembre de 2026 de 16:00 a 20:30 (Hora Culiacán / 22:00 a 02:30 UTC)
  const dates = '20261114T220000Z/20261115T023000Z';
  const location = encodeURIComponent(EVENT_CONFIG.venueAddress);
  const details = encodeURIComponent(
    `Celebración de los 10 años de Luis Gerardo en ${EVENT_CONFIG.venue}.\n\n` +
    (guestName ? `Pase reservado para: ${guestName} (${passes} pases)\n` : '') +
    (assignedTable ? `Mesa asignada: ${assignedTable}\n\n` : '') +
    `Presenta tu pase digital o código QR en puerta para el ingreso al torneo.\n` +
    `Contacto anfitriones: 667 611 8835.`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}

function initCalendarButtons() {
  const heroCalBtn = document.getElementById('btn-add-google-calendar-hero');
  if (heroCalBtn) {
    heroCalBtn.href = generateGoogleCalendarUrl();
  }
}

// ============================================================================
// 3. CUENTA REGRESIVA DINÁMICA
// ============================================================================
function initCountdown() {
  const daysEl = document.getElementById('timer-days');
  const hoursEl = document.getElementById('timer-hours');
  const minutesEl = document.getElementById('timer-minutes');
  const secondsEl = document.getElementById('timer-seconds');

  function update() {
    const now = new Date().getTime();
    const distance = EVENT_CONFIG.targetDate.getTime() - now;

    if (distance < 0) {
      if (daysEl) daysEl.innerText = '00';
      if (hoursEl) hoursEl.innerText = '00';
      if (minutesEl) minutesEl.innerText = '00';
      if (secondsEl) secondsEl.innerText = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    if (daysEl) daysEl.innerText = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.innerText = String(hours).padStart(2, '0');
    if (minutesEl) minutesEl.innerText = String(minutes).padStart(2, '0');
    if (secondsEl) secondsEl.innerText = String(seconds).padStart(2, '0');
  }

  update();
  setInterval(update, 1000);
}

// ============================================================================
// 4. CAMBIO DE MODO DE VISTA (INVITADO / ANFITRIÓN)
// ============================================================================
function switchView(mode) {
  currentView = mode;
  const guestView = document.getElementById('view-guest');
  const adminView = document.getElementById('view-admin');
  const tabGuest = document.getElementById('tab-guest-view');
  const tabAdmin = document.getElementById('tab-admin-view');

  if (mode === 'guest') {
    if (guestView) guestView.style.display = 'block';
    if (adminView) adminView.style.display = 'none';
    if (tabGuest) tabGuest.classList.add('active');
    if (tabAdmin) tabAdmin.classList.remove('active');
  } else {
    if (guestView) guestView.style.display = 'none';
    if (adminView) adminView.style.display = 'block';
    if (tabAdmin) tabAdmin.classList.add('active');
    if (tabGuest) tabGuest.classList.remove('active');
    renderAdminPortal();
  }
}

// ============================================================================
// 5. MOTOR DE CONFETI EN CANVAS (SUTIL Y MINIMALISTA)
// ============================================================================
class CleanConfetti {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animating = false;
    this.colors = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe', '#f59e0b'];

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(count = 90) {
    if (!this.canvas) return;
    const originX = this.canvas.width / 2;
    const originY = this.canvas.height * 0.4;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 10 + 3;
      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        size: Math.random() * 7 + 4,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 8,
        opacity: 1,
        life: 0
      });
    }

    if (!this.animating) {
      this.animating = true;
      this.loop();
    }
  }

  loop() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22;
      p.vx *= 0.98;
      p.rotation += p.vRot;
      p.life++;

      if (p.life > 60) {
        p.opacity -= 0.03;
      }

      if (p.opacity <= 0 || p.y > this.canvas.height + 50) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.globalAlpha = Math.max(0, p.opacity);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      requestAnimationFrame(() => this.loop());
    } else {
      this.animating = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

let fxConfetti = null;

// ============================================================================
// 6. FORMULARIO RSVP DE INVITADO
// ============================================================================
function setAttendance(attending) {
  isAttending = attending;
  const choiceYes = document.getElementById('choice-yes');
  const choiceNo = document.getElementById('choice-no');
  const passesGroup = document.getElementById('passes-field-group');
  const submitText = document.getElementById('btn-submit-text');

  if (attending) {
    choiceYes.classList.add('selected');
    choiceNo.classList.remove('selected');
    if (passesGroup) passesGroup.style.display = 'block';
    if (submitText) submitText.innerText = 'Confirmar Asistencia & Asignar Mi Mesa';
  } else {
    choiceNo.classList.add('selected');
    choiceYes.classList.remove('selected');
    if (passesGroup) passesGroup.style.display = 'none';
    if (submitText) submitText.innerText = 'Notificar a los Anfitriones (No Asistiré)';
  }
}

function changePasses(delta) {
  passesCount = Math.max(1, Math.min(6, passesCount + delta));
  const countEl = document.getElementById('passes-count');
  if (countEl) countEl.innerText = passesCount;
}

// ============================================================================
// 7. ASIGNACIÓN INTELIGENTE DE MESAS (CROQUIS DE SALÓN)
// ============================================================================
function getOccupiedSeatsByTable() {
  const guests = getGuestsList();
  const usage = new Map();
  EVENT_CONFIG.tables.forEach(t => usage.set(t.name, 0));

  guests.forEach(g => {
    if (g.attending && g.tableName) {
      const cur = usage.get(g.tableName) || 0;
      usage.set(g.tableName, cur + (g.passes || 1));
    }
  });

  return usage;
}

function assignBestAvailableTable(passes = 2, preferredTableName = 'AUTO') {
  const usage = getOccupiedSeatsByTable();

  // Si tiene preferencia manual válida
  if (preferredTableName && preferredTableName !== 'AUTO') {
    const table = EVENT_CONFIG.tables.find(t => t.name === preferredTableName);
    if (table) {
      const occupied = usage.get(table.name) || 0;
      if (occupied + passes <= table.capacity) {
        return table.name;
      }
    }
  }

  // Búsqueda automática: buscar mesa que admita los pases sin sobrepasar 10 personas
  for (const table of EVENT_CONFIG.tables) {
    const occupied = usage.get(table.name) || 0;
    if ((table.capacity - occupied) >= passes) {
      return table.name;
    }
  }

  // Si todas están casi llenas, ubicar en la que tenga mayor espacio libre
  let bestTable = EVENT_CONFIG.tables[0].name;
  let minOcc = 999;
  for (const table of EVENT_CONFIG.tables) {
    const occupied = usage.get(table.name) || 0;
    if (occupied < minOcc) {
      minOcc = occupied;
      bestTable = table.name;
    }
  }
  return bestTable;
}

// ============================================================================
// 8. GENERADOR DETERMINISTA DE CÓDIGO QR EN CANVAS
// ============================================================================
function drawMinimalQrCode(canvas, token) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  const gridCount = 25;
  const cellSize = size / gridCount;

  let seed = 0;
  for (let i = 0; i < token.length; i++) {
    seed = (seed * 37 + token.charCodeAt(i)) & 0xffffffff;
  }

  function nextRand() {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 4294967296;
  }

  // Dibujar los patrones de posición (Finders)
  function drawFinder(row, col) {
    const x = col * cellSize;
    const y = row * cellSize;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y, 7 * cellSize, 7 * cellSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize);
    ctx.fillStyle = '#1d4ed8'; // Centro azul cobalto
    ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize);
  }

  drawFinder(1, 1);
  drawFinder(1, gridCount - 8);
  drawFinder(gridCount - 8, 1);

  // Cuadrícula interior
  ctx.fillStyle = '#0f172a';
  for (let r = 0; r < gridCount; r++) {
    for (let c = 0; c < gridCount; c++) {
      const isFinderTL = r < 9 && c < 9;
      const isFinderTR = r < 9 && c >= gridCount - 9;
      const isFinderBL = r >= gridCount - 9 && c < 9;

      if (!isFinderTL && !isFinderTR && !isFinderBL) {
        if (nextRand() > 0.46) {
          ctx.fillRect(c * cellSize + 0.5, r * cellSize + 0.5, cellSize - 0.5, cellSize - 0.5);
        }
      }
    }
  }

  // Emblema central sutil LG10
  const centerSize = 5 * cellSize;
  const cx = (size - centerSize) / 2;
  const cy = (size - centerSize) / 2;
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(cx, cy, centerSize, centerSize);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${cellSize * 2.2}px 'Outfit', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LG', size / 2, size / 2);
}

// ============================================================================
// 9. PROCESAMIENTO DEL ENVÍO DE CONFIRMACIÓN
// ============================================================================
function handleRsvpSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('guest-name');
  const phoneInput = document.getElementById('guest-phone');
  const notesInput = document.getElementById('guest-notes');

  const fullName = nameInput ? nameInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const notes = notesInput ? notesInput.value.trim() : '';

  if (!fullName) {
    alert('Por favor ingresa tu nombre o el de tu familia.');
    return;
  }

  // Asignar mesa de manera automática e inteligente
  const assignedTable = isAttending ? assignBestAvailableTable(passesCount) : 'Sin mesa (No asiste)';
  const token = `LG10-VIP-${Math.floor(1000 + Math.random() * 9000)}`;

  const newGuestRecord = {
    id: Date.now(),
    fullName,
    phone,
    passes: isAttending ? passesCount : 0,
    attending: isAttending,
    tableName: assignedTable,
    folioCode: token,
    notes,
    createdAt: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  };

  // Guardar en almacenamiento del cliente y sincronizar con EvenPass
  saveGuest(newGuestRecord);

  // Notificar al sistema EvenPass vía Storage Event (para que se refleje inmediatamente en el sistema central si está abierto en otra pestaña)
  try {
    localStorage.setItem('evenpass_latest_rsvp_guest', JSON.stringify({
      eventId: 1, // o ID de Luis Gerardo
      fullName: newGuestRecord.fullName,
      passes: newGuestRecord.passes,
      token: newGuestRecord.folioCode,
      phone: newGuestRecord.phone,
      assignedTable: newGuestRecord.tableName,
      source: 'DIGITAL_INVITATION',
      timestamp: Date.now()
    }));
  } catch (err) {}

  if (fxConfetti) {
    fxConfetti.burst(100);
  }

  if (isAttending) {
    // Generar Pase Digital VIP
    const form = document.getElementById('rsvp-form');
    const ticketDisplay = document.getElementById('ticket-display');
    const ticketName = document.getElementById('ticket-name');
    const ticketTable = document.getElementById('ticket-table-assignment');
    const ticketFolio = document.getElementById('ticket-folio');
    const ticketPasses = document.getElementById('ticket-passes-label');
    const qrCanvas = document.getElementById('ticket-qr-canvas');
    const waBtn = document.getElementById('btn-whatsapp-confirmation');
    const calBtn = document.getElementById('btn-add-google-calendar-pass');

    if (ticketName) ticketName.innerText = fullName;
    if (ticketTable) ticketTable.innerText = `Mesa Asignada: ${assignedTable}`;
    if (ticketFolio) ticketFolio.innerText = token;
    if (ticketPasses) ticketPasses.innerText = `${passesCount} ${passesCount === 1 ? 'Persona' : 'Personas'}`;

    if (qrCanvas) {
      drawMinimalQrCode(qrCanvas, token);
    }

    // Configurar enlace de WhatsApp oficial al 6676118835
    if (waBtn) {
      const msg = encodeURIComponent(
        `¡Hola! 👋 Confirmamos nuestra asistencia a los 10 años de Luis Gerardo 🎉\n\n` +
        `👤 Invitado: ${fullName}\n` +
        `🎟️ Pases: ${passesCount} personas\n` +
        `🍽️ Mesa: ${assignedTable}\n` +
        `🔑 Folio de Acceso: ${token}\n` +
        (notes ? `💬 Nota: "${notes}"\n\n` : `\n`) +
        `¡Muchas gracias! Nos vemos el Sábado 14 de Noviembre a las 4:00 PM.`
      );
      waBtn.href = `https://wa.me/${EVENT_CONFIG.parentPhone}?text=${msg}`;
    }

    // Configurar botón Google Calendar personalizado
    if (calBtn) {
      calBtn.href = generateGoogleCalendarUrl(fullName, passesCount, assignedTable);
    }

    if (form) form.style.display = 'none';
    if (ticketDisplay) {
      ticketDisplay.style.display = 'block';
      ticketDisplay.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } else {
    const form = document.getElementById('rsvp-form');
    if (form) {
      form.innerHTML = `
        <div style="text-align: center; padding: 32px 16px;">
          <h3 style="color: #0f172a; font-size: 1.25rem; margin-bottom: 8px;">Agradecemos mucho tu respuesta</h3>
          <p style="color: #475569; font-size: 0.92rem; max-width: 480px; margin: 0 auto;">
            Hemos registrado que no podrás acompañarnos. Tus buenos deseos han sido entregados a los anfitriones y a Luis Gerardo.
          </p>
        </div>
      `;
    }
  }
}

// ============================================================================
// 10. ALMACENAMIENTO DE INVITADOS (LOCALSTORAGE / BASE DE DATOS)
// ============================================================================
const GUESTS_STORAGE_KEY = 'evenpass_guests_luis_gerardo_portal';

function getGuestsList() {
  const cached = localStorage.getItem(GUESTS_STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }

  // Lista inicial de demostración realista y organizada
  const initialData = [
    { id: 1, fullName: 'Familia Morales Valenzuela', phone: '667-112-3344', passes: 4, attending: true, tableName: 'Mesa 01 - Familia Cercana', folioCode: 'LG10-VIP-1102', notes: 'Abuelos y tíos de Luis Gerardo', createdAt: '09:30 AM' },
    { id: 2, fullName: 'Mateo González & Padres', phone: '667-223-4455', passes: 3, attending: true, tableName: 'Mesa 02 - Amigos de Colegio', folioCode: 'LG10-VIP-2481', notes: 'Compañero de salón', createdAt: '10:15 AM' },
    { id: 3, fullName: 'Lic. Roberto Somoza & Fam.', phone: '667-334-5566', passes: 3, attending: true, tableName: 'Mesa 03 - Padrinos & Tíos', folioCode: 'LG10-VIP-3392', notes: 'Padrino de bautizo', createdAt: '11:00 AM' },
    { id: 4, fullName: 'Santiago Beltrán & Papás', phone: '667-445-6677', passes: 3, attending: true, tableName: 'Mesa 04 - Amigos Deportes & Laser', folioCode: 'LG10-VIP-4819', notes: 'Equipo de fútbol', createdAt: '11:45 AM' },
    { id: 5, fullName: 'Familia Quiñónez Rivas', phone: '667-556-7788', passes: 2, attending: true, tableName: 'Mesa 01 - Familia Cercana', folioCode: 'LG10-VIP-5520', notes: 'Primos', createdAt: '12:20 PM' }
  ];
  localStorage.setItem(GUESTS_STORAGE_KEY, JSON.stringify(initialData));
  return initialData;
}

function saveGuest(record) {
  const list = getGuestsList();
  list.unshift(record);
  localStorage.setItem(GUESTS_STORAGE_KEY, JSON.stringify(list));
}

function removeGuest(id) {
  if (!confirm('¿Deseas dar de baja a este invitado y liberar sus lugares en la mesa?')) return;
  const list = getGuestsList().filter(g => g.id !== id);
  localStorage.setItem(GUESTS_STORAGE_KEY, JSON.stringify(list));
  renderAdminPortal();
}

// ============================================================================
// 11. RENDERIZADO DEL PORTAL DEL ANFITRIÓN (CONTROL DE MESAS E INVITADOS)
// ============================================================================
function renderAdminPortal() {
  const guests = getGuestsList();
  const searchInput = document.getElementById('admin-search-input');
  const term = searchInput ? searchInput.value.toLowerCase().trim() : '';

  // 1. Métricas KPI
  let totalConfirmedPasses = 0;
  let confirmedFamilies = 0;
  let declinedCount = 0;

  guests.forEach(g => {
    if (g.attending) {
      totalConfirmedPasses += (g.passes || 0);
      confirmedFamilies++;
    } else {
      declinedCount++;
    }
  });

  const kpiPasses = document.getElementById('kpi-confirmed-passes');
  const kpiPercent = document.getElementById('kpi-occupancy-percent');
  const kpiFamilies = document.getElementById('kpi-families-count');
  const kpiDeclined = document.getElementById('kpi-declined-count');

  const occPercent = Math.round((totalConfirmedPasses / EVENT_CONFIG.totalCapacity) * 100);

  if (kpiPasses) kpiPasses.innerText = `${totalConfirmedPasses} / ${EVENT_CONFIG.totalCapacity}`;
  if (kpiPercent) kpiPercent.innerText = `${occPercent}%`;
  if (kpiFamilies) kpiFamilies.innerText = String(confirmedFamilies);
  if (kpiDeclined) kpiDeclined.innerText = String(declinedCount);

  // 2. Renderizado de Mesas (Croquis)
  const usage = getOccupiedSeatsByTable();
  const tablesContainer = document.getElementById('tables-cards-container');
  if (tablesContainer) {
    tablesContainer.innerHTML = '';
    EVENT_CONFIG.tables.forEach(table => {
      const occupied = usage.get(table.name) || 0;
      const pct = Math.min(100, Math.round((occupied / table.capacity) * 100));
      const isFull = occupied >= table.capacity;

      // Obtener nombres sentados en esta mesa
      const seatedGuests = guests
        .filter(g => g.attending && g.tableName === table.name)
        .map(g => `${g.fullName.split(' ')[0]} (${g.passes}p)`);

      const card = document.createElement('div');
      card.className = 'table-slot-card';
      card.innerHTML = `
        <div class="table-header-flex">
          <b>${table.name.split(' - ')[0]}</b>
          <span class="table-capacity-pill ${isFull ? 'capacity-full' : 'capacity-available'}">
            ${occupied}/${table.capacity} lugares
          </span>
        </div>
        <div style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 8px;">
          ${table.name.split(' - ')[1] || 'Asignada'}
        </div>
        <div class="table-progress-bar">
          <div class="table-progress-fill" style="width: ${pct}%; background: ${isFull ? '#dc2626' : '#1d4ed8'};"></div>
        </div>
        <div class="table-assigned-names" title="${seatedGuests.join(', ')}">
          ${seatedGuests.length > 0 ? seatedGuests.join(', ') : 'Mesa disponible'}
        </div>
      `;
      tablesContainer.appendChild(card);
    });
  }

  // 3. Renderizado de Filas de la Tabla de Invitados
  const tbody = document.getElementById('admin-table-rows');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filtered = guests.filter(g => {
    if (!term) return true;
    return (
      (g.fullName && g.fullName.toLowerCase().includes(term)) ||
      (g.phone && g.phone.includes(term)) ||
      (g.tableName && g.tableName.toLowerCase().includes(term)) ||
      (g.folioCode && g.folioCode.toLowerCase().includes(term))
    );
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--text-muted);">No se encontraron invitados con el filtro indicado.</td></tr>`;
    return;
  }

  filtered.forEach(g => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="guest-name-bold">${g.fullName}</span>
        <span class="guest-phone-sub">Registro: ${g.createdAt || 'En línea'}</span>
      </td>
      <td>${g.phone || 'N/A'}</td>
      <td><strong>${g.passes} pases</strong></td>
      <td>
        <span class="badge-table-tag">${g.tableName || 'Sin asignar'}</span>
      </td>
      <td><code style="font-size: 0.8rem; font-weight: 700;">${g.folioCode || 'N/A'}</code></td>
      <td>
        <span class="${g.attending ? 'table-capacity-pill capacity-available' : 'table-capacity-pill capacity-full'}">
          ${g.attending ? 'CONFIRMADO' : 'DECLINADO'}
        </span>
      </td>
      <td>
        <button class="btn-toolbar" style="padding: 4px 10px; font-size: 0.74rem;" onclick="removeGuest(${g.id})">
          Eliminar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterAdminGuests() {
  renderAdminPortal();
}

// Modal Agregar Manualmente
function openAddGuestModal() {
  const modal = document.getElementById('modal-add-guest');
  if (modal) modal.classList.add('active');
}

function closeAddGuestModal(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('btn-close-modal')) return;
  const modal = document.getElementById('modal-add-guest');
  if (modal) modal.classList.remove('active');
}

function handleManualGuestSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('manual-name').value.trim();
  const phone = document.getElementById('manual-phone').value.trim();
  const passes = parseInt(document.getElementById('manual-passes').value, 10) || 1;
  const prefTable = document.getElementById('manual-table-select').value;

  if (!name) return;

  const assignedTable = assignBestAvailableTable(passes, prefTable);
  const token = `LG10-VIP-${Math.floor(1000 + Math.random() * 9000)}`;

  const newGuest = {
    id: Date.now(),
    fullName: name,
    phone: phone || 'Registro Manual',
    passes: passes,
    attending: true,
    tableName: assignedTable,
    folioCode: token,
    notes: 'Registrado directamente por los anfitriones',
    createdAt: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  };

  saveGuest(newGuest);
  closeAddGuestModal();
  renderAdminPortal();

  // Reset form
  document.getElementById('form-manual-guest').reset();
}

// Exportar a CSV
function exportGuestsCsv() {
  const guests = getGuestsList();
  let csvContent = 'ID,Invitado,Telefono,Pases,Mesa,Folio,Estado,Hora\n';

  guests.forEach(g => {
    const row = [
      g.id,
      `"${g.fullName.replace(/"/g, '""')}"`,
      `"${g.phone || ''}"`,
      g.passes,
      `"${g.tableName || ''}"`,
      g.folioCode || '',
      g.attending ? 'CONFIRMADO' : 'DECLINADO',
      g.createdAt || ''
    ].join(',');
    csvContent += row + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Invitados_Luis_Gerardo_10_Anos_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// 12. INICIALIZACIÓN
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  initCalendarButtons();
  fxConfetti = new CleanConfetti('fx-canvas');

  const rsvpForm = document.getElementById('rsvp-form');
  if (rsvpForm) {
    rsvpForm.addEventListener('submit', handleRsvpSubmit);
  }

  // Escuchar si EvenPass central sincroniza algo
  window.addEventListener('storage', (e) => {
    if (e.key === GUESTS_STORAGE_KEY) {
      if (currentView === 'admin') {
        renderAdminPortal();
      }
    }
  });
});
