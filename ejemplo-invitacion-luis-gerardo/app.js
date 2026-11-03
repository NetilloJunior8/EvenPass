/**
 * INVITACIÓN VIP · LUIS GERARDO (MIS 10 AÑOS)
 * Lógica Interactiva: Countdown, Confeti Canvas, Audio Synth, RSVP en Vivo y Generador de Pase QR
 */

// ============================================================================
// 1. CONFIGURACIÓN Y ESTADO GLOBAL
// ============================================================================
const EVENT_CONFIG = {
  boyName: 'Luis Gerardo',
  age: 10,
  targetDate: new Date('2026-11-14T16:00:00'),
  venue: 'Arena Laser Quest & Jump Park',
  venueAddress: 'Av. Paseo de los Héroes 450, Col. Las Quintas, Culiacán',
  parentPhone: '526671234567' // Número de WhatsApp para recibir confirmaciones
};

let isAttending = true;
let passesCount = 2;
let isAudioPlaying = false;
let audioCtx = null;
let musicIntervalId = null;

// ============================================================================
// 2. CUENTA REGRESIVA DINÁMICA
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
// 3. EFECTOS ESPECIALES: MOTOR DE CONFETI EN CANVAS (60 FPS NATIVO)
// ============================================================================
class ConfettiCannon {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animating = false;
    this.colors = ['#06b6d4', '#22d3ee', '#8b5cf6', '#c084fc', '#f59e0b', '#10b981', '#ffffff'];

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(count = 140) {
    if (!this.canvas) return;
    const originX = this.canvas.width / 2;
    const originY = this.canvas.height * 0.45;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 4;
      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        size: Math.random() * 9 + 4,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
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
      p.vy += 0.22; // Gravedad
      p.vx *= 0.98; // Resistencia del aire
      p.rotation += p.vRot;
      p.life++;

      if (p.life > 70) {
        p.opacity -= 0.025;
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

let fxCannon = null;

// ============================================================================
// 4. GENERADOR DE AUDIO Y SÍNTESIS DE MÚSICA DE FIESTA (WEB AUDIO API)
// ============================================================================
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playCelebrationFanfare() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Acordes alegres de triunfo tipo videojuego (Do - Mi - Sol - Do octava)
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + idx * 0.11;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.36);
    });
  } catch (e) {
    // Audio no permitido sin gesto
  }
}

function togglePartyMusic() {
  const btn = document.getElementById('btn-toggle-audio');
  const label = document.getElementById('audio-label');

  if (isAudioPlaying) {
    // Apagar música
    if (musicIntervalId) {
      clearInterval(musicIntervalId);
      musicIntervalId = null;
    }
    isAudioPlaying = false;
    if (btn) btn.classList.add('muted');
    if (label) label.innerText = 'Música';
  } else {
    // Iniciar loop sintetizado alegre y suave
    const ctx = getAudioContext();
    if (!ctx) return;

    isAudioPlaying = true;
    if (btn) btn.classList.remove('muted');
    if (label) label.innerText = 'Pausar';

    const melody = [392, 440, 523, 659, 587, 523, 440, 392];
    let noteIdx = 0;

    musicIntervalId = setInterval(() => {
      if (!isAudioPlaying) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(melody[noteIdx % melody.length], ctx.currentTime);
        noteIdx++;

        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch (err) {}
    }, 400);
  }
}

// ============================================================================
// 5. CONTROL DEL FORMULARIO DE ASISTENCIA (RSVP)
// ============================================================================
function setAttendance(attending) {
  isAttending = attending;
  const choiceYes = document.getElementById('choice-yes');
  const choiceNo = document.getElementById('choice-no');
  const passesContainer = document.getElementById('passes-field-container');
  const submitText = document.getElementById('btn-submit-text');

  if (attending) {
    choiceYes.classList.add('is-selected');
    choiceNo.classList.remove('is-selected');
    if (passesContainer) passesContainer.style.display = 'block';
    if (submitText) submitText.innerText = 'Confirmar Asistencia y Generar Pase VIP';
  } else {
    choiceNo.classList.add('is-selected');
    choiceYes.classList.remove('is-selected');
    if (passesContainer) passesContainer.style.display = 'none';
    if (submitText) submitText.innerText = 'Registrar Respuesta (No Asistiré)';
  }
}

function changePasses(delta) {
  passesCount = Math.max(1, Math.min(6, passesCount + delta));
  const el = document.getElementById('passes-count');
  if (el) el.innerText = passesCount;
}

// ============================================================================
// 6. GENERADOR DE CÓDIGO QR EN CANVAS NATIVO (100% OFFLINE Y SIN CDNS EXTERNAS)
// ============================================================================
function drawCleanQrCode(canvas, text) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Generador de matriz determinista basada en el token
  const gridCount = 25;
  const cellSize = size / gridCount;

  // Función hash simple para generar un patrón QR visualmente realista
  let seed = 0;
  for (let i = 0; i < text.length; i++) {
    seed = (seed * 31 + text.charCodeAt(i)) & 0xffffffff;
  }

  function pseudoRand() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }

  ctx.fillStyle = '#0f172a';

  // Dibujar los 3 marcos de posición estándar de QR (Top-Left, Top-Right, Bottom-Left)
  function drawFinderPattern(row, col) {
    const x = col * cellSize;
    const y = row * cellSize;
    // Marco exterior 7x7
    ctx.fillRect(x, y, 7 * cellSize, 7 * cellSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize);
    // Centro 3x3
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize);
  }

  drawFinderPattern(1, 1);
  drawFinderPattern(1, gridCount - 8);
  drawFinderPattern(gridCount - 8, 1);

  // Rellenar cuadrícula interna con patrón consistente
  ctx.fillStyle = '#0f172a';
  for (let r = 0; r < gridCount; r++) {
    for (let c = 0; c < gridCount; c++) {
      // Ignorar zonas de los finders
      const inTopLeft = r < 9 && c < 9;
      const inTopRight = r < 9 && c >= gridCount - 9;
      const inBottomLeft = r >= gridCount - 9 && c < 9;

      if (!inTopLeft && !inTopRight && !inBottomLeft) {
        if (pseudoRand() > 0.48) {
          ctx.fillRect(c * cellSize + 0.5, r * cellSize + 0.5, cellSize - 0.5, cellSize - 0.5);
        }
      }
    }
  }

  // Mini insignia central con el número 10
  const centerSize = 5 * cellSize;
  const centerX = (size - centerSize) / 2;
  const centerY = (size - centerSize) / 2;
  ctx.fillStyle = '#06b6d4';
  ctx.fillRect(centerX, centerY, centerSize, centerSize);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${cellSize * 2.8}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('10', size / 2, size / 2 + 1);
}

// ============================================================================
// 7. ENVÍO DEL FORMULARIO Y GENERACIÓN DEL PASE
// ============================================================================
function handleFormSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('guest-name');
  const phoneInput = document.getElementById('guest-phone');
  const notesInput = document.getElementById('guest-notes');

  const fullName = nameInput ? nameInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const notes = notesInput ? notesInput.value.trim() : '';

  if (!fullName) {
    alert('Por favor ingresa el nombre de tu familia o invitado.');
    return;
  }

  // Generar folio único
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const folioCode = `LG10-VIP-${randomSuffix}`;

  // Guardar en Padrón Local de Invitados
  const guestRecord = {
    id: Date.now(),
    fullName,
    phone,
    passes: isAttending ? passesCount : 0,
    attending: isAttending,
    notes,
    folioCode,
    registeredAt: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  };

  saveGuestToStorage(guestRecord);

  // Efectos de celebración
  if (fxCannon) {
    fxCannon.burst(160);
  }
  playCelebrationFanfare();

  if (isAttending) {
    // Mostrar Boleto VIP
    const ticketDisplay = document.getElementById('ticket-display');
    const ticketName = document.getElementById('ticket-name');
    const ticketFolio = document.getElementById('ticket-folio');
    const ticketPassesLabel = document.getElementById('ticket-passes-label');
    const qrCanvas = document.getElementById('ticket-qr-canvas');
    const form = document.getElementById('rsvp-form');

    if (ticketName) ticketName.innerText = fullName;
    if (ticketFolio) ticketFolio.innerText = folioCode;
    if (ticketPassesLabel) ticketPassesLabel.innerText = `${passesCount} ${passesCount === 1 ? 'Persona' : 'Personas'}`;

    // Renderizar código QR
    if (qrCanvas) {
      drawCleanQrCode(qrCanvas, folioCode);
    }

    // Configurar enlace de WhatsApp
    const waBtn = document.getElementById('btn-whatsapp-share');
    if (waBtn) {
      const msg = encodeURIComponent(
        `¡Hola! 👋 Confirmamos nuestra asistencia a los 10 años de Luis Gerardo 🎉\n\n` +
        `👤 Invitado: ${fullName}\n` +
        `🎟️ Pases reservados: ${passesCount}\n` +
        `🔑 Folio VIP: ${folioCode}\n` +
        (notes ? `💬 Mensaje: "${notes}"\n\n` : `\n`) +
        `¡Nos vemos el Sábado 14 de Noviembre en Arena Laser Quest!`
      );
      waBtn.href = `https://wa.me/${EVENT_CONFIG.parentPhone}?text=${msg}`;
    }

    if (form) form.style.display = 'none';
    if (ticketDisplay) {
      ticketDisplay.style.display = 'block';
      ticketDisplay.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } else {
    // Si no asiste, agradecer la respuesta amablemente
    const form = document.getElementById('rsvp-form');
    if (form) {
      form.innerHTML = `
        <div style="text-align: center; padding: 30px 10px;">
          <div style="font-size: 2.4rem; margin-bottom: 10px;">🙏</div>
          <h3 style="color: #ffffff; font-size: 1.3rem; margin-bottom: 8px;">¡Muchas gracias por avisarnos!</h3>
          <p style="color: #94a3b8; font-size: 0.95rem;">Lamentamos que no puedas acompañarnos, ¡te guardaremos pastel en el corazón!</p>
        </div>
      `;
    }
  }

  // Refrescar lista de monitoreo
  renderAdminList();
}

// ============================================================================
// 8. ALMACENAMIENTO LOCAL Y MOCK DEL PADRÓN
// ============================================================================
const STORAGE_KEY = 'evenpass_guests_luis_gerardo';

function getInitialGuests() {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }

  // Invitados de demostración pre-cargados
  const demoList = [
    { id: 1, fullName: 'Familia Morales Valenzuela', phone: '667-111-2233', passes: 3, attending: true, notes: '¡Felicidades Luis Gerardo!', folioCode: 'LG10-VIP-8812', registeredAt: '10:14 AM' },
    { id: 2, fullName: 'Mateo González & Papis', phone: '667-444-5566', passes: 2, attending: true, notes: '¡Listos para el Laser Tag!', folioCode: 'LG10-VIP-7429', registeredAt: '11:30 AM' },
    { id: 3, fullName: 'Familia Quiñónez Rivas', phone: '667-777-8899', passes: 4, attending: true, notes: 'Ahí estaremos puntuales.', folioCode: 'LG10-VIP-3391', registeredAt: '12:05 PM' }
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(demoList));
  return demoList;
}

function saveGuestToStorage(record) {
  const list = getInitialGuests();
  list.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ============================================================================
// 9. PANEL DE CONTROL / MONITOR DE ANFITRIÓN (MODAL)
// ============================================================================
function openAdminModal() {
  renderAdminList();
  const modal = document.getElementById('admin-modal');
  if (modal) modal.classList.add('is-active');
}

function closeAdminModal(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('btn-modal-close')) {
    return;
  }
  const modal = document.getElementById('admin-modal');
  if (modal) modal.classList.remove('is-active');
}

function renderAdminList() {
  const list = getInitialGuests();
  const tbody = document.getElementById('admin-table-body');
  const statConfirmed = document.getElementById('stat-confirmed-passes');
  const statFamilies = document.getElementById('stat-families-count');
  const statDeclined = document.getElementById('stat-declined-count');

  let totalPasses = 0;
  let attendingFamilies = 0;
  let declinedCount = 0;

  list.forEach(item => {
    if (item.attending) {
      totalPasses += item.passes;
      attendingFamilies++;
    } else {
      declinedCount++;
    }
  });

  if (statConfirmed) statConfirmed.innerText = totalPasses;
  if (statFamilies) statFamilies.innerText = attendingFamilies;
  if (statDeclined) statDeclined.innerText = declinedCount;

  if (!tbody) return;
  tbody.innerHTML = '';

  list.forEach(g => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong style="color: #ffffff; display: block;">${g.fullName}</strong>
        <small style="color: #64748b;">${g.phone} · ${g.registeredAt}</small>
      </td>
      <td><b style="color: #06b6d4;">${g.passes} pases</b></td>
      <td>
        <span class="${g.attending ? 'badge-guest-confirmed' : 'badge-guest-declined'}">
          ${g.attending ? 'CONFIRMADO' : 'NO ASISTIRÁ'}
        </span>
      </td>
      <td><code style="color: #94a3b8; font-size: 0.78rem;">${g.folioCode}</code></td>
    `;
    tbody.appendChild(tr);
  });
}

function savePassSnapshot() {
  window.print();
}

// ============================================================================
// 10. INICIALIZACIÓN
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  fxCannon = new ConfettiCannon('fx-canvas');

  const form = document.getElementById('rsvp-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  const audioBtn = document.getElementById('btn-toggle-audio');
  if (audioBtn) {
    audioBtn.addEventListener('click', togglePartyMusic);
  }
});
