/**
 * LUIS GERARDO · MIS 10 AÑOS | MOTOR DE INVITACIÓN & PANEL DEL ANFITRIÓN
 * Soporta index.html (Invitados) y panel.html (Anfitriones) con sincronización total.
 */

// ============================================================================
// 1. CONFIGURACIÓN DEL EVENTO Y SALÓN
// ============================================================================
const EVENT_DATA = {
  title: 'Mis 10 Años · Luis Gerardo',
  boyName: 'Luis Gerardo',
  date: 'Sábado 14 de Noviembre, 2026',
  time: '4:00 PM (16:00 hrs)',
  targetDate: new Date('2026-11-14T16:00:00'),
  venue: 'Arena Laser Quest & Salón Neón VIP',
  venueAddress: 'Av. Paseo de los Héroes 450, Col. Las Quintas, Culiacán, Sinaloa',
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

// Event ID dinámico para soportar este y todos los futuros eventos
function getActiveEventId() {
  const params = new URLSearchParams(window.location.search);
  const paramId = params.get('eventId') || params.get('ev') || params.get('id');
  if (paramId) {
    const parsed = parseInt(paramId, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 6; // Por defecto: Mis 10 Años · Luis Gerardo (ID 6)
}

const CLOUD_SYNC_RELAY = 'https://ntfy.sh/evenpass_cloud_sync_relay';
const STORAGE_KEY = `evenpass_event_${getActiveEventId()}_guests_db`;

// Emisor en tiempo real hacia la nube (CORS libre, funciona en Netlify, localhost y móviles)
function broadcastToCloud(payload) {
  try {
    fetch(CLOUD_SYNC_RELAY, {
      method: 'POST',
      headers: {
        'Title': 'EvenPass Cloud Sync',
        'Tags': 'ticket,cloud'
      },
      body: JSON.stringify(payload)
    }).catch(err => console.warn('Cloud sync relay warn:', err));
  } catch (e) {}
}

// ============================================================================
// 2. BASE DE DATOS LOCAL Y SINCRONIZACIÓN
// ============================================================================
function getStoredGuests() {
  const evId = getActiveEventId();

  // 1. Si EvenPass tiene su base de datos local en este navegador, sincronizar con máxima fidelidad
  try {
    const epAll = localStorage.getItem('evenpass_all_guests_db');
    if (epAll) {
      const epGuests = JSON.parse(epAll);
      if (Array.isArray(epGuests)) {
        const evGuests = epGuests.filter(g => g.eventId === evId);
        if (evGuests.length > 0) {
          const mapped = evGuests.map(g => ({
            id: g.id,
            fullName: g.fullName,
            phone: g.phone || 'WhatsApp Directo',
            passesGranted: g.totalPasses,
            passesConfirmed: (g.status === 'CONFIRMED' || g.status === 'ATTENDED') ? g.totalPasses : 0,
            status: g.status,
            tableName: g.assignedTableName || 'Sin asignar',
            token: g.qrCodeToken,
            notes: g.dietNotes || '',
            updatedAt: g.confirmedAt || 'Hoy',
            manualAssignmentTimestamp: g.manualAssignmentTimestamp || 0
          }));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
          localStorage.setItem(`evenpass_event_${evId}_guests_db`, JSON.stringify(mapped));
          localStorage.setItem('evenpass_luis_gerardo_guests_db', JSON.stringify(mapped));
          return mapped;
        }
      }
    }
  } catch (e) {}

  // 2. Revisar almacenamiento local del panel
  const cached = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('evenpass_luis_gerardo_guests_db');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let changed = false;

        // Auto-sanar sobrecupo heredado de Mesa 01 si Quiñónez y Mario siguen asignados a Mesa 01
        parsed.forEach(g => {
          const name = (g.fullName || '').toLowerCase().trim();
          if ((name.includes('quiñónez') || name.includes('quinonez')) && (g.tableName || '').includes('Mesa 01')) {
            g.tableName = 'Mesa 05 - Invitados Especiales';
            changed = true;
          }
          if (name === 'mario' && (g.tableName || '').includes('Mesa 01')) {
            g.tableName = 'Mesa 02 - Amigos de Colegio';
            changed = true;
          }
        });

        // Garantizar que Mario con 3 pases siempre esté disponible
        if (!parsed.some(g => (g.fullName || '').toLowerCase().trim() === 'mario')) {
          parsed.push({
            id: 6,
            fullName: 'Mario',
            phone: '667-611-8835',
            passesGranted: 3,
            passesConfirmed: 0,
            status: 'PENDING',
            tableName: 'Mesa 02 - Amigos de Colegio',
            token: 'LG10-VIP-8835',
            notes: 'Invitación con 3 pases',
            updatedAt: '12:45 PM'
          });
          changed = true;
        }

        if (changed) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          localStorage.setItem(`evenpass_event_${evId}_guests_db`, JSON.stringify(parsed));
          localStorage.setItem('evenpass_luis_gerardo_guests_db', JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch (e) {}
  }

  // 3. Padrón inicial oficial sincronizado con EvenPass (distribución balanceada sin sobrecupo)
  const initial = [
    { id: 1, fullName: 'Familia Morales Valenzuela', phone: '667-112-3344', passesGranted: 4, passesConfirmed: 4, status: 'CONFIRMED', tableName: 'Mesa 01 - Familia Cercana', token: 'LG10-VIP-1102', notes: 'Abuelos y tíos', updatedAt: '09:30 AM' },
    { id: 2, fullName: 'Mateo González & Padres', phone: '667-223-4455', passesGranted: 3, passesConfirmed: 3, status: 'CONFIRMED', tableName: 'Mesa 02 - Amigos de Colegio', token: 'LG10-VIP-2481', notes: 'Compañero de salón', updatedAt: '10:15 AM' },
    { id: 3, fullName: 'Lic. Roberto Somoza & Fam.', phone: '667-334-5566', passesGranted: 3, passesConfirmed: 3, status: 'CONFIRMED', tableName: 'Mesa 03 - Padrinos & Tíos', token: 'LG10-VIP-3392', notes: 'Padrino', updatedAt: '11:00 AM' },
    { id: 4, fullName: 'Santiago Beltrán & Papás', phone: '667-445-6677', passesGranted: 3, passesConfirmed: 3, status: 'CONFIRMED', tableName: 'Mesa 04 - Amigos Deportes & Laser', token: 'LG10-VIP-4819', notes: 'Fútbol', updatedAt: '11:45 AM' },
    { id: 5, fullName: 'Familia Quiñónez Rivas', phone: '667-556-7788', passesGranted: 4, passesConfirmed: 0, status: 'PENDING', tableName: 'Mesa 05 - Invitados Especiales', token: 'LG10-VIP-5520', notes: 'Enviado por WhatsApp', updatedAt: '12:20 PM' },
    { id: 6, fullName: 'Mario', phone: '667-611-8835', passesGranted: 3, passesConfirmed: 0, status: 'PENDING', tableName: 'Mesa 02 - Amigos de Colegio', token: 'LG10-VIP-8835', notes: 'Invitación con 3 pases', updatedAt: '12:45 PM' }
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  localStorage.setItem('evenpass_luis_gerardo_guests_db', JSON.stringify(initial));
  return initial;
}

function saveGuestsList(list) {
  const evId = getActiveEventId();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  try {
    localStorage.setItem(`evenpass_event_${evId}_guests_db`, JSON.stringify(list));
    localStorage.setItem('evenpass_luis_gerardo_guests_db', JSON.stringify(list));
    localStorage.setItem('evenpass_luis_gerardo_updated_tick', String(Date.now()));
  } catch (e) {}

  // 1. Sincronizar en la misma pestaña/navegador vía BroadcastChannel
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('evenpass_invitations_channel');
      bc.postMessage({ type: 'SYNC_ALL', eventId: evId, guests: list });
    }
  } catch (e) {}

  // 2. Sincronizar hacia la nube para EvenPass OS en tiempo real (Netlify <-> EvenPass)
  broadcastToCloud({
    type: 'SYNC_ALL',
    eventId: evId,
    guests: list,
    timestamp: Date.now()
  });
}

function getEventTables() {
  const evId = getActiveEventId();
  let baseTables = [...EVENT_DATA.tables];

  // 1. Verificar si hay tablas guardadas del salón de EvenPass
  try {
    const cachedTables = localStorage.getItem(`evenpass_event_${evId}_tables_db`);
    if (cachedTables) {
      const parsed = JSON.parse(cachedTables);
      if (Array.isArray(parsed) && parsed.length > 0) {
        baseTables = parsed;
      }
    }
  } catch (e) {}

  // 2. Si EvenPass está en el mismo navegador, leer salón activo
  try {
    const rawSalons = localStorage.getItem('evenpass_salons_db');
    if (rawSalons) {
      const salons = JSON.parse(rawSalons);
      const curSalon = salons.find(s => s.id === 4) || salons[0];
      if (curSalon && Array.isArray(curSalon.tables) && curSalon.tables.length > 0) {
        baseTables = curSalon.tables.map(t => ({
          id: t.id,
          name: t.tableName,
          capacity: t.capacity || 10,
          shape: t.shape || 'ROUND',
          tableNumber: t.tableNumber
        }));
      }
    }
  } catch (e) {}

  // 3. Incluir cualquier mesa asignada a invitados que no esté en baseTables
  const guests = getStoredGuests();
  guests.forEach(g => {
    if (g.tableName && !baseTables.some(t => t.name.toLowerCase().trim() === g.tableName.toLowerCase().trim()) && 
        !g.tableName.toLowerCase().includes('sin mesa') && !g.tableName.toLowerCase().includes('sin asignar')) {
      baseTables.push({
        id: baseTables.length + 1,
        name: g.tableName,
        capacity: 10,
        shape: 'ROUND'
      });
    }
  });

  return baseTables;
}

// Comparador robusto de mesas (tolera "Mesa 02", "Mesa 2", "Mesa 02 - Amigos de Colegio", etc.)
function matchesTableName(guestTableName, table) {
  if (!guestTableName || !table) return false;
  const g = guestTableName.toLowerCase().trim();
  const t = (table.name || '').toLowerCase().trim();
  if (g === t) return true;
  if (g.startsWith(t) || t.startsWith(g)) return true;

  // Comparar por número de mesa: "Mesa 02" vs "Mesa 2" vs "Mesa 02 - Amigos de Colegio"
  const gMatch = g.match(/mesa\s*0?(\d+)/i);
  const tMatch = t.match(/mesa\s*0?(\d+)/i);
  if (gMatch && tMatch && parseInt(gMatch[1], 10) === parseInt(tMatch[1], 10)) {
    return true;
  }
  if (gMatch && table.tableNumber && parseInt(gMatch[1], 10) === table.tableNumber) {
    return true;
  }
  return false;
}

// Cálculo de Asientos Ocupados por Mesa (Croquis) - Sincronizado exactamente con EvenPass
function getTableOccupancies() {
  const guests = getStoredGuests();
  const tables = getEventTables();
  const occ = new Map();
  tables.forEach(t => occ.set(t.name, 0));

  guests.forEach(g => {
    if (g.status !== 'DECLINED' && g.tableName && !g.tableName.toLowerCase().includes('sin mesa') && !g.tableName.toLowerCase().includes('sin asignar')) {
      const passes = Number(g.passesGranted || g.passesConfirmed || g.totalPasses || 1);
      
      const matchedTable = tables.find(t => matchesTableName(g.tableName, t));
      if (matchedTable) {
        occ.set(matchedTable.name, (occ.get(matchedTable.name) || 0) + passes);
      } else {
        occ.set(g.tableName, (occ.get(g.tableName) || 0) + passes);
      }
    }
  });

  return occ;
}

function autoAssignTable(passes = 2, preferredName = 'AUTO') {
  const tables = getEventTables();
  const occ = getTableOccupancies();

  if (preferredName && preferredName !== 'AUTO') {
    const target = tables.find(t => t.name === preferredName);
    if (target) {
      const current = occ.get(target.name) || 0;
      if (current + passes <= target.capacity) {
        return target.name;
      }
    }
  }

  // Buscar mesa con cupo libre suficiente
  for (const table of tables) {
    const current = occ.get(table.name) || 0;
    if (table.capacity - current >= passes) {
      return table.name;
    }
  }

  // Si todas están llenas, asignar a la que tenga menor aforo
  let minTable = tables[0]?.name || 'Mesa 01 - Familia Cercana';
  let minCount = 999;
  for (const table of tables) {
    const current = occ.get(table.name) || 0;
    if (current < minCount) {
      minCount = current;
      minTable = table.name;
    }
  }
  return minTable;
}

function syncDirectWithEvenPass() {
  const evId = getActiveEventId();
  const guests = getStoredGuests();
  saveGuestsList(guests);

  // Solicitar el estado completo de mesas y distribución a EvenPass OS
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('evenpass_invitations_channel');
      bc.postMessage({ type: 'REQUEST_FULL_STATE', eventId: evId });
    }
  } catch (e) {}

  broadcastToCloud({
    type: 'REQUEST_FULL_STATE',
    eventId: evId,
    timestamp: Date.now()
  });

  const payload = JSON.stringify(guests, null, 2);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(payload).then(() => {
      alert(`¡Sincronización enviada con éxito a EvenPass OS!\n\nSe emitieron los ${guests.length} invitados del panel por el canal en tiempo real.\n(Copia de respaldo en portapapeles lista por si abres EvenPass en otro equipo).`);
    }).catch(() => {
      alert(`¡Sincronización emitida!\n\n${guests.length} invitados conectados en tiempo real con EvenPass OS.`);
    });
  } else {
    alert(`¡Sincronización emitida!\n\n${guests.length} invitados conectados en tiempo real con EvenPass OS.`);
  }
}

// ============================================================================
// 3. ENLACE A GOOGLE CALENDAR
// ============================================================================
function getGoogleCalendarUrl(guestName = '', passes = 2, table = '') {
  const title = encodeURIComponent(`Mis 10 Años · Luis Gerardo`);
  const dates = '20261114T220000Z/20261115T023000Z'; // 16:00 a 20:30 UTC-6 -> 22:00 a 02:30 UTC
  const location = encodeURIComponent(EVENT_DATA.venueAddress);
  const details = encodeURIComponent(
    `Recepción de cumpleaños de Luis Gerardo (10 Años) en ${EVENT_DATA.venue}.\n\n` +
    (guestName ? `Pase reservado para: ${guestName} (${passes} personas)\n` : '') +
    (table ? `Mesa Asignada en Croquis: ${table}\n\n` : '') +
    `Presenta tu pase digital o código QR al llegar a la puerta del salón.\n` +
    `Contacto de anfitriones: 667 611 8835.`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}

// ============================================================================
// 4. LÓGICA DE LA INVITACIÓN DEL INVITADO (INDEX.HTML)
// ============================================================================
let userAttendance = true;

function selectAttendance(attending) {
  userAttendance = attending;
  const btnYes = document.getElementById('choice-yes');
  const btnNo = document.getElementById('choice-no');
  const passesGroup = document.getElementById('passes-input-group');
  const submitLbl = document.getElementById('btn-submit-lbl');

  if (attending) {
    if (btnYes) btnYes.classList.add('active');
    if (btnNo) btnNo.classList.remove('active');
    if (passesGroup) passesGroup.style.display = 'block';
    if (submitLbl) submitLbl.innerText = 'Confirmar Asistencia & Asignar Mi Mesa';
  } else {
    if (btnNo) btnNo.classList.add('active');
    if (btnYes) btnYes.classList.remove('active');
    if (passesGroup) passesGroup.style.display = 'none';
    if (submitLbl) submitLbl.innerText = 'Notificar a los Anfitriones (No Asistiré)';
  }
}

function initGuestPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const nameParam = urlParams.get('nombre');
  const passesParam = parseInt(urlParams.get('pases'), 10);
  const tokenParam = urlParams.get('token');

  // Enlace a calendario del héroe
  const heroCal = document.getElementById('btn-hero-calendar');
  if (heroCal) heroCal.href = getGoogleCalendarUrl(nameParam || '', passesParam || 2);

  const defaultPasses = passesParam || 2;
  const rTargetName = document.getElementById('rsvp-target-name');
  const rPassesBadge = document.getElementById('rsvp-passes-badge');
  const inputName = document.getElementById('input-name');
  const selectPasses = document.getElementById('select-passes');

  if (nameParam) {
    const banner = document.getElementById('vip-guest-banner');
    const bName = document.getElementById('banner-guest-name');
    const bPasses = document.getElementById('banner-passes-text');

    if (banner) banner.style.display = 'flex';
    if (bName) bName.innerText = nameParam;
    if (bPasses) bPasses.innerText = `Pase reservado para: ${defaultPasses} personas`;
    if (rTargetName) rTargetName.innerText = nameParam;
    if (rPassesBadge) rPassesBadge.innerText = `${defaultPasses} Pases Reservados`;
    if (inputName) inputName.value = nameParam;
  } else {
    if (rTargetName) rTargetName.innerText = 'Familia Invitada';
    if (rPassesBadge) rPassesBadge.innerText = `${defaultPasses} Pases Reservados`;
    if (inputName) inputName.value = 'Familia Invitada';
  }

  // Configurar opciones de select según los pases otorgados por los anfitriones
  if (selectPasses) {
    selectPasses.innerHTML = '';
    for (let i = 1; i <= defaultPasses; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.innerText = `${i} ${i === 1 ? 'Persona' : 'Personas'}`;
      if (i === defaultPasses) opt.selected = true;
      selectPasses.appendChild(opt);
    }
  }

  // Verificar si este token o usuario YA confirmó (Caducidad del link / Solo se genera una vez)
  if (tokenParam) {
    const guests = getStoredGuests();
    const existing = guests.find(g => g.token === tokenParam);
    if (existing && existing.status === 'CONFIRMED') {
      // Mostrar directamente el pase ya emitido
      renderIssuedPass(existing.fullName, existing.passesConfirmed, existing.tableName, existing.token);
    }
  }

  initCountdown();
  startLiveCloudSyncListener();
}

function submitRsvp(e) {
  e.preventDefault();

  const name = document.getElementById('input-name').value.trim() || 'Familia Invitada';
  const phone = document.getElementById('input-phone').value.trim() || 'Enlace WhatsApp';
  const notes = document.getElementById('input-notes').value.trim();
  const passesSelected = userAttendance ? parseInt(document.getElementById('select-passes').value, 10) : 0;

  if (!name) {
    alert('Por favor ingresa tu nombre.');
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token');
  const token = tokenFromUrl || `LG10-VIP-${Math.floor(1000 + Math.random() * 9000)}`;

  const guests = getStoredGuests();
  let assignedTable = 'Sin mesa (No Asiste)';

  if (userAttendance) {
    // Asignación de mesa automática e inteligente en Croquis
    assignedTable = autoAssignTable(passesSelected);
  }

  // Actualizar o crear invitado en el padrón
  const existingIdx = guests.findIndex(g => (tokenFromUrl && g.token === tokenFromUrl) || g.fullName.toLowerCase() === name.toLowerCase());

  if (existingIdx >= 0) {
    guests[existingIdx].status = userAttendance ? 'CONFIRMED' : 'DECLINED';
    guests[existingIdx].passesConfirmed = passesSelected;
    guests[existingIdx].phone = phone || guests[existingIdx].phone;
    guests[existingIdx].tableName = assignedTable;
    guests[existingIdx].token = token;
    guests[existingIdx].notes = notes;
    guests[existingIdx].updatedAt = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  } else {
    guests.unshift({
      id: Date.now(),
      fullName: name,
      phone: phone || 'N/A',
      passesGranted: passesSelected || 2,
      passesConfirmed: passesSelected,
      status: userAttendance ? 'CONFIRMED' : 'DECLINED',
      tableName: assignedTable,
      token: token,
      notes: notes,
      updatedAt: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    });
  }

  saveGuestsList(guests);

  // Sincronizar inmediatamente con EvenPass OS en tiempo real (para reflejar en Croquis central y Escáner)
  const evId = getActiveEventId();
  try {
    const rsvpPayload = {
      eventId: evId,
      fullName: name,
      phone: phone || 'WhatsApp Directo',
      passes: passesSelected,
      token: token,
      assignedTable: assignedTable,
      status: userAttendance ? 'CONFIRMED' : 'DECLINED',
      source: 'DIGITAL_INVITATION',
      timestamp: Date.now()
    };
    localStorage.setItem('evenpass_latest_rsvp_guest', JSON.stringify(rsvpPayload));

    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('evenpass_invitations_channel');
      bc.postMessage({
        type: 'RSVP_CONFIRMED',
        eventId: evId,
        guest: {
          fullName: name,
          phone: phone,
          passesConfirmed: userAttendance ? passesSelected : 0,
          passesGranted: passesSelected,
          status: userAttendance ? 'CONFIRMED' : 'DECLINED',
          tableName: assignedTable,
          token: token,
          notes: notes
        },
        allGuests: guests
      });
    }

    broadcastToCloud({
      type: 'RSVP_CONFIRMED',
      eventId: evId,
      guest: {
        fullName: name,
        phone: phone,
        passesConfirmed: userAttendance ? passesSelected : 0,
        passesGranted: passesSelected,
        status: userAttendance ? 'CONFIRMED' : 'DECLINED',
        tableName: assignedTable,
        token: token,
        notes: notes
      },
      allGuests: guests,
      timestamp: Date.now()
    });
  } catch (err) {}

  if (userAttendance) {
    triggerConfetti();
    renderIssuedPass(name, passesSelected, assignedTable, token, notes);
  } else {
    const form = document.getElementById('form-rsvp');
    if (form) {
      form.innerHTML = `
        <div style="text-align: center; padding: 24px 10px;">
          <h3 style="color: #0f172a; font-size: 1.2rem; margin-bottom: 8px;">Agradecemos tu respuesta</h3>
          <p style="color: #475569; font-size: 0.9rem;">
            Hemos registrado que no podrás asistir. Tus buenos deseos han sido enviados a Luis Gerardo y a su familia.
          </p>
        </div>
      `;
    }
  }
}

function renderIssuedPass(name, passes, tableName, token, notes = '') {
  const form = document.getElementById('form-rsvp');
  const passCard = document.getElementById('ticket-pass-display');
  const pName = document.getElementById('pass-guest-name');
  const pTable = document.getElementById('pass-table-name');
  const pFolio = document.getElementById('pass-folio-code');
  const pPasses = document.getElementById('pass-passes-count');
  const qrCanvas = document.getElementById('pass-qr-canvas');
  const waBtn = document.getElementById('btn-notify-parents-wa');
  const calBtn = document.getElementById('btn-pass-calendar');

  if (pName) pName.innerText = name;
  if (pTable) pTable.innerText = `Mesa Asignada: ${tableName}`;
  if (pFolio) pFolio.innerText = token;
  if (pPasses) pPasses.innerText = `${passes} ${passes === 1 ? 'Persona' : 'Personas'}`;

  if (qrCanvas) {
    drawQrMatrix(qrCanvas, token);
  }

  // Enlace WhatsApp a los papás (6676118835)
  if (waBtn) {
    const msg = encodeURIComponent(
      `¡Hola! 👋 Confirmamos nuestra asistencia a los 10 años de Luis Gerardo 🎉\n\n` +
      `👤 Invitado: ${name}\n` +
      `🎟️ Pases: ${passes} personas\n` +
      `🍽️ Mesa: ${tableName}\n` +
      `🔑 Folio QR: ${token}\n` +
      (notes ? `💬 Mensaje: "${notes}"\n\n` : `\n`) +
      `¡Nos vemos el Sábado 14 de Noviembre a las 4:00 PM!`
    );
    waBtn.href = `https://wa.me/${EVENT_DATA.parentPhone}?text=${msg}`;
  }

  // Enlace Google Calendar personalizado
  if (calBtn) {
    calBtn.href = getGoogleCalendarUrl(name, passes, tableName);
  }

  if (form) form.style.display = 'none';
  if (passCard) {
    passCard.style.display = 'block';
    passCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// ============================================================================
// 5. LÓGICA DEL PANEL DEL ANFITRIÓN (PANEL.HTML) & SINCRONIZACIÓN EN TIEMPO REAL
// ============================================================================
function applyTableReassignment(data) {
  if (!data) return;
  const targetEvId = Number(data.eventId) || 6;
  if (targetEvId !== getActiveEventId()) return;

  const guests = getStoredGuests();
  let modified = false;

  guests.forEach(g => {
    const matchToken = data.guestToken && g.token === data.guestToken;
    const matchName = data.fullName && g.fullName && g.fullName.toLowerCase().trim() === data.fullName.toLowerCase().trim();
    if (matchToken || matchName) {
      const newTbl = data.newTableName === 'Sin asignar' ? 'Sin asignar' : (data.newTableName || 'Sin asignar');
      if (g.tableName !== newTbl) {
        g.tableName = newTbl;
        g.manualAssignmentTimestamp = data.timestamp || Date.now();
        modified = true;
      }
    }
  });

  if (modified) {
    const evId = getActiveEventId();
    saveGuestsListSilently(guests);

    // Si estamos en panel.html, refrescar tablero y tabla
    if (typeof loadStoredGuests === 'function' && document.getElementById('panel-tables-grid')) {
      loadStoredGuests();
    }

    // Si estamos en index.html con un pase abierto, actualizar número de mesa en pantalla
    const pTable = document.getElementById('pass-table-name');
    const pFolio = document.getElementById('pass-folio-code');
    if (pTable && pFolio && (data.guestToken === pFolio.innerText.trim() || !pFolio.innerText)) {
      pTable.innerText = `Mesa Asignada: ${data.newTableName}`;
    }
  }
}

function applyFullStateSync(data) {
  if (!data) return;
  const targetEvId = Number(data.eventId) || 6;
  if (targetEvId !== getActiveEventId()) return;

  let changed = false;

  // 1. Guardar tablas sincronizadas
  if (Array.isArray(data.allTables) && data.allTables.length > 0) {
    try {
      localStorage.setItem(`evenpass_event_${targetEvId}_tables_db`, JSON.stringify(data.allTables));
      changed = true;
    } catch (e) {}
  }

  // 2. Guardar invitados sincronizados
  if (Array.isArray(data.allGuests) && data.allGuests.length > 0) {
    try {
      saveGuestsListSilently(data.allGuests);
      changed = true;
    } catch (e) {}
  }

  if (changed && typeof loadStoredGuests === 'function' && document.getElementById('panel-tables-grid')) {
    loadStoredGuests();
  }
}

function saveGuestsListSilently(list) {
  const evId = getActiveEventId();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  try {
    localStorage.setItem(`evenpass_event_${evId}_guests_db`, JSON.stringify(list));
    localStorage.setItem('evenpass_luis_gerardo_guests_db', JSON.stringify(list));
    localStorage.setItem('evenpass_luis_gerardo_updated_tick', String(Date.now()));
  } catch (e) {}
}

function handleIncomingCloudMessage(data) {
  if (!data || !data.type) return;

  if (data.type === 'SYNC_FULL_STATE') {
    applyFullStateSync(data);
  } else if (data.type === 'TABLE_REASSIGNED') {
    applyTableReassignment(data);
  } else if (data.type === 'SYNC_ALL' && Array.isArray(data.guests)) {
    if (data.eventId === getActiveEventId()) {
      saveGuestsListSilently(data.guests);
      if (document.getElementById('panel-tables-grid')) loadStoredGuests();
    }
  } else if (data.type === 'NEW_GUEST' || data.type === 'NEW_INVITATION') {
    if (data.guest && data.eventId === getActiveEventId()) {
      const guests = getStoredGuests();
      const existing = guests.find(g => (data.guest.token && g.token === data.guest.token) || (g.fullName && data.guest.fullName && g.fullName.toLowerCase().trim() === data.guest.fullName.toLowerCase().trim()));
      if (!existing) {
        guests.unshift(data.guest);
        saveGuestsListSilently(guests);
        if (document.getElementById('panel-tables-grid')) loadStoredGuests();
      }
    }
  } else if (data.type === 'RSVP_CONFIRMED') {
    if (data.guest && data.eventId === getActiveEventId()) {
      const guests = getStoredGuests();
      const idx = guests.findIndex(g => (data.guest.token && g.token === data.guest.token) || (g.fullName && data.guest.fullName && g.fullName.toLowerCase().trim() === data.guest.fullName.toLowerCase().trim()));
      if (idx >= 0) {
        guests[idx].status = data.guest.status;
        guests[idx].passesConfirmed = data.guest.passesConfirmed;
        if (data.guest.tableName) guests[idx].tableName = data.guest.tableName;
        saveGuestsListSilently(guests);
        if (document.getElementById('panel-tables-grid')) loadStoredGuests();
      }
    }
  }
}

let cloudListenerStarted = false;
function startLiveCloudSyncListener() {
  if (cloudListenerStarted) return;
  cloudListenerStarted = true;

  // 1. BroadcastChannel (mismo navegador / diferentes pestañas)
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('evenpass_invitations_channel');
      bc.onmessage = (event) => {
        if (event && event.data) {
          handleIncomingCloudMessage(event.data);
        }
      };
    }
  } catch (e) {}

  // 2. SSE Server-Sent Events desde ntfy Cloud Relay (Netlify <-> EvenPass)
  try {
    if (typeof EventSource !== 'undefined') {
      const sse = new EventSource(`${CLOUD_SYNC_RELAY}/sse`);
      sse.onmessage = (e) => {
        try {
          const raw = JSON.parse(e.data);
          if (raw.message) {
            const data = JSON.parse(raw.message);
            handleIncomingCloudMessage(data);
          }
        } catch (err) {}
      };
    }
  } catch (e) {}

  // 3. Polling de respaldo cada 3.5 segundos
  setInterval(() => {
    fetch(`${CLOUD_SYNC_RELAY}/json?poll=1&since=5m`, { method: 'GET', mode: 'cors' })
      .then(res => res.ok ? res.text() : '')
      .then(text => {
        if (!text) return;
        const lines = text.trim().split('\n');
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message) {
              const data = JSON.parse(parsed.message);
              handleIncomingCloudMessage(data);
            }
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, 3500);
}

function initHostPanel() {
  loadStoredGuests();
  startLiveCloudSyncListener();

  // Solicitar estado maestro completo a EvenPass OS
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('evenpass_invitations_channel');
      bc.postMessage({ type: 'REQUEST_FULL_STATE', eventId: getActiveEventId() });
    }
  } catch (e) {}
  broadcastToCloud({ type: 'REQUEST_FULL_STATE', eventId: getActiveEventId(), timestamp: Date.now() });

  // Escuchar si un invitado confirma desde otra pestaña para actualizar inmediatamente
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === 'evenpass_luis_gerardo_updated_tick' || e.key === `evenpass_event_${getActiveEventId()}_tables_db`) {
      loadStoredGuests();
    }
  });
}

function populateDispatchTablesSelect() {
  const select = document.getElementById('dispatch-table');
  if (!select) return;

  const currentVal = select.value;
  const tables = getEventTables();

  let optionsHtml = '<option value="AUTO">Asignación Automática Inteligente</option>';
  tables.forEach(t => {
    optionsHtml += `<option value="${t.name}">${t.name} (${t.capacity}p)</option>`;
  });

  select.innerHTML = optionsHtml;
  if (currentVal && tables.some(t => t.name === currentVal)) {
    select.value = currentVal;
  }
}

function loadStoredGuests() {
  const guests = getStoredGuests();
  populateDispatchTablesSelect();
  renderPanelKPIs(guests);
  renderPanelTablesGrid(guests);
  renderPanelTable();
}

function renderPanelKPIs(guests) {
  let confirmedPasses = 0;
  let confirmedFamilies = 0;
  let pendingCount = 0;

  guests.forEach(g => {
    if (g.status === 'CONFIRMED' || g.status === 'ATTENDED') {
      confirmedPasses += (g.passesConfirmed || g.passesGranted || 0);
      confirmedFamilies++;
    } else if (g.status === 'PENDING') {
      pendingCount++;
    }
  });

  const tables = getEventTables();
  const totalVenueCap = tables.reduce((sum, t) => sum + (t.capacity || 10), 0) || EVENT_DATA.totalCapacity || 50;

  const kpiConf = document.getElementById('kpi-panel-confirmed');
  const kpiOcc = document.getElementById('kpi-panel-occupancy');
  const kpiFam = document.getElementById('kpi-panel-families');
  const kpiPend = document.getElementById('kpi-panel-pending');

  const occPct = Math.round((confirmedPasses / totalVenueCap) * 100);

  if (kpiConf) kpiConf.innerText = `${confirmedPasses} / ${totalVenueCap}`;
  if (kpiOcc) kpiOcc.innerText = `${occPct}%`;
  if (kpiFam) kpiFam.innerText = String(confirmedFamilies);
  if (kpiPend) kpiPend.innerText = String(pendingCount);
}

function renderPanelTablesGrid(guests) {
  const container = document.getElementById('panel-tables-grid');
  if (!container) return;
  container.innerHTML = '';

  const occ = getTableOccupancies();
  const allTables = getEventTables();

  allTables.forEach(table => {
    const occupied = occ.get(table.name) || 0;
    const isFull = occupied >= table.capacity;
    const pct = Math.min(100, Math.round((occupied / table.capacity) * 100));

    // Comensales asignados a esta mesa (Confirmados y Pendientes)
    const seatedList = guests
      .filter(g => g.status !== 'DECLINED' && matchesTableName(g.tableName, table))
      .map(g => {
        const passes = g.passesGranted || g.passesConfirmed || g.totalPasses || 1;
        const isConf = g.status === 'CONFIRMED' || g.status === 'ATTENDED';
        const shortName = g.fullName.split(' ')[0];
        return `${shortName} (${passes}p ${isConf ? '✓' : 'pend.'})`;
      });

    const isRect = table.shape === 'IMPERIAL' || table.shape === 'RECTANGULAR';
    const shapeBadge = isRect 
      ? '<span style="font-size: 0.65rem; background: #e0e7ff; color: #4338ca; padding: 1px 5px; border-radius: 4px; margin-left: 4px; font-weight: 700;">Rectangular</span>' 
      : '';

    const cell = document.createElement('div');
    cell.className = 'table-preview-cell';
    cell.innerHTML = `
      <div class="table-cell-head">
        <b>${table.name.split(' - ')[0]}${shapeBadge}</b>
        <span class="table-occupancy-pill ${isFull ? 'capacity-full' : 'capacity-available'}">
          ${occupied}/${table.capacity} lugares
        </span>
      </div>
      <div style="font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 6px;">
        ${table.name.split(' - ')[1] || (isRect ? 'Mesa Imperial / Rectangular' : 'Mesa Redonda')}
      </div>
      <div class="table-bar-bg">
        <div class="table-bar-fill" style="width: ${pct}%; background: ${isFull ? '#dc2626' : '#1d4ed8'};"></div>
      </div>
      <div class="table-seated-list" title="${seatedList.join(', ')}">
        ${seatedList.length > 0 ? seatedList.join(', ') : 'Mesa disponible'}
      </div>
    `;
    container.appendChild(cell);
  });
}

function reassignGuestTableFromPanel(guestId, newTableName) {
  const guests = getStoredGuests();
  const guest = guests.find(g => g.id === guestId);
  if (!guest) return;

  const evId = getActiveEventId();
  guest.tableName = newTableName === 'Sin asignar' ? 'Sin asignar' : newTableName;
  guest.manualAssignmentTimestamp = Date.now();
  guest.updatedAt = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  saveGuestsList(guests);

  const payload = {
    type: 'TABLE_REASSIGNED',
    eventId: evId,
    guestId: guest.id,
    guestToken: guest.token,
    fullName: guest.fullName,
    newTableName: guest.tableName,
    timestamp: guest.manualAssignmentTimestamp
  };

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('evenpass_invitations_channel');
      bc.postMessage(payload);
    }
  } catch (e) {}

  broadcastToCloud(payload);
  loadStoredGuests();
}

function renderPanelTable() {
  const guests = getStoredGuests();
  const searchInput = document.getElementById('panel-search');
  const term = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const tbody = document.getElementById('panel-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const tables = getEventTables();

  const filtered = guests.filter(g => {
    if (!term) return true;
    return (
      g.fullName.toLowerCase().includes(term) ||
      (g.phone && g.phone.includes(term)) ||
      (g.tableName && g.tableName.toLowerCase().includes(term)) ||
      (g.token && g.token.toLowerCase().includes(term))
    );
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted);">No se encontraron invitados.</td></tr>`;
    return;
  }

  filtered.forEach(g => {
    const tr = document.createElement('tr');
    let badgeClass = 'badge-status pending';
    let statusText = 'PENDIENTE';
    if (g.status === 'CONFIRMED' || g.status === 'ATTENDED') {
      badgeClass = 'badge-status confirmed';
      statusText = `CONFIRMADO (${g.passesConfirmed || g.passesGranted}p)`;
    } else if (g.status === 'DECLINED') {
      badgeClass = 'badge-status declined';
      statusText = 'NO ASISTIRÁ';
    }

    // Selector interactivo de mesa por invitado
    let tableOptions = `<option value="Sin asignar">Sin asignar</option>`;
    tables.forEach(t => {
      const isSelected = matchesTableName(g.tableName, t);
      tableOptions += `<option value="${t.name}" ${isSelected ? 'selected' : ''}>${t.name.split(' - ')[0]}</option>`;
    });

    tr.innerHTML = `
      <td>
        <strong style="color: #0f172a; display: block;">${g.fullName}</strong>
        <small style="color: #64748b;">${g.phone} · ${g.updatedAt || 'Reciente'}</small>
      </td>
      <td><b>${(g.status === 'CONFIRMED' || g.status === 'ATTENDED') ? (g.passesConfirmed || g.passesGranted) : g.passesGranted} pases</b></td>
      <td>
        <select class="form-input-clean table-inline-select" style="padding: 4px 8px; font-size: 0.78rem; font-weight: 700; width: auto; max-width: 175px; border-color: #cbd5e1; background: #f8fafc;" onchange="reassignGuestTableFromPanel(${g.id}, this.value)">
          ${tableOptions}
        </select>
      </td>
      <td><code style="font-size: 0.78rem;">${g.token}</code></td>
      <td><span class="${badgeClass}">${statusText}</span></td>
      <td>
        <button class="btn-outline" style="padding: 4px 8px; font-size: 0.72rem;" onclick="copyGuestInviteLink('${g.fullName}', ${g.passesGranted}, '${g.token}')">
          Copiar Link
        </button>
        <button class="btn-outline" style="padding: 4px 8px; font-size: 0.72rem; color: #dc2626;" onclick="deleteHostGuest(${g.id})">
          Borrar
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}


// Obtiene la URL base limpia para la invitación de invitados (compatible con Netlify Pretty URLs, subcarpetas y local)
function getGuestInvitationBaseUrl() {
  if (window.location.protocol === 'file:') {
    const raw = window.location.href.split('?')[0].split('#')[0];
    return raw.replace(/panel(\.html)?$/i, 'index.html');
  }

  const url = new URL(window.location.href);
  let pathname = url.pathname;

  // Limpiar sufijos como /panel.html, /panel, o /index.html
  pathname = pathname
    .replace(/\/panel\.html$/i, '')
    .replace(/\/panel\/?$/i, '')
    .replace(/\/index\.html$/i, '')
    .replace(/\/+$/, '');

  return pathname ? `${url.origin}${pathname}/index.html` : `${url.origin}/index.html`;
}

function dispatchInvitation(e) {
  e.preventDefault();

  const nameInput = document.getElementById('dispatch-name');
  const passesInput = document.getElementById('dispatch-passes');
  const tableInput = document.getElementById('dispatch-table');

  const name = nameInput.value.trim();
  const passes = parseInt(passesInput.value, 10);
  const preferredTable = tableInput.value;

  if (!name) return;

  const token = `LG10-VIP-${Math.floor(1000 + Math.random() * 9000)}`;
  const assignedTable = autoAssignTable(passes, preferredTable);

  const newGuest = {
    id: Date.now(),
    fullName: name,
    phone: 'WhatsApp Directo',
    passesGranted: passes,
    passesConfirmed: 0,
    status: 'PENDING',
    tableName: assignedTable,
    token: token,
    notes: 'Enlace enviado por WhatsApp',
    updatedAt: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  };

  const guests = getStoredGuests();
  guests.unshift(newGuest);
  saveGuestsList(guests);

  const evId = getActiveEventId();

  // Emitir evento explícito de nuevo invitado para EvenPass OS (Local + Nube)
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('evenpass_invitations_channel');
      bc.postMessage({ type: 'NEW_INVITATION', eventId: evId, guest: newGuest, allGuests: guests });
    }
  } catch (e) {}

  broadcastToCloud({
    type: 'NEW_GUEST',
    eventId: evId,
    guest: newGuest,
    allGuests: guests,
    timestamp: Date.now()
  });

  // Construir Enlace Único a index.html (compatible con Netlify, Vercel, Hosting y local)
  const baseUrl = getGuestInvitationBaseUrl();
  const inviteUrl = `${baseUrl}?eventId=${evId}&nombre=${encodeURIComponent(name)}&pases=${passes}&token=${token}`;

  // Mensaje elegante para enviar por WhatsApp
  const msg = 
    `¡Hola *${name}*! 👋\n` +
    `Nos encantaría que nos acompañes a festejar los *10 Años de Luis Gerardo* 🎮✨\n\n` +
    `Aquí tienes tu invitación digital oficial con tus *${passes} pases reservados*:\n` +
    `👉 ${inviteUrl}\n\n` +
    `Por favor abre el enlace para agendar la fecha y confirmar tu asistencia. ¡Te esperamos para celebrar en grande!`;

  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');

  nameInput.value = '';
  loadStoredGuests();
}

function copyGuestInviteLink(name, passes, token) {
  const evId = getActiveEventId();
  const baseUrl = getGuestInvitationBaseUrl();
  const inviteUrl = `${baseUrl}?eventId=${evId}&nombre=${encodeURIComponent(name)}&pases=${passes}&token=${token}`;

  navigator.clipboard.writeText(inviteUrl).then(() => {
    alert(`¡Enlace copiado para ${name}!\n\n${inviteUrl}`);
  }).catch(() => {
    prompt('Copia el siguiente enlace:', inviteUrl);
  });
}

function deleteHostGuest(id) {
  if (!confirm('¿Deseas eliminar a este invitado y liberar sus lugares asignados?')) return;
  const list = getStoredGuests().filter(g => g.id !== id);
  saveGuestsList(list);
  loadStoredGuests();
}

function exportCsvForHostess() {
  const guests = getStoredGuests();
  let csv = 'ID,Invitado,Telefono,Pases_Confirmados,Pases_Otorgados,Mesa_Asignada,Folio_QR,Estado,Hora\n';

  guests.forEach(g => {
    const row = [
      g.id,
      `"${g.fullName.replace(/"/g, '""')}"`,
      `"${g.phone || ''}"`,
      g.passesConfirmed || 0,
      g.passesGranted || 0,
      `"${g.tableName || ''}"`,
      g.token || '',
      g.status,
      g.updatedAt || ''
    ].join(',');
    csv += row + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Padron_Puerta_Hostess_Luis_Gerardo_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// 6. UTILIDADES: GENERADOR DETERMINISTA DE CÓDIGO QR EN CANVAS
// ============================================================================
function drawQrMatrix(canvas, token) {
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

  function drawFinder(row, col) {
    const x = col * cellSize;
    const y = row * cellSize;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y, 7 * cellSize, 7 * cellSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize);
    ctx.fillStyle = '#1d4ed8'; // Azul cobalto
    ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize);
  }

  drawFinder(1, 1);
  drawFinder(1, gridCount - 8);
  drawFinder(gridCount - 8, 1);

  ctx.fillStyle = '#0f172a';
  for (let r = 0; r < gridCount; r++) {
    for (let c = 0; c < gridCount; c++) {
      const isTL = r < 9 && c < 9;
      const isTR = r < 9 && c >= gridCount - 9;
      const isBL = r >= gridCount - 9 && c < 9;

      if (!isTL && !isTR && !isBL) {
        if (nextRand() > 0.46) {
          ctx.fillRect(c * cellSize + 0.5, r * cellSize + 0.5, cellSize - 0.5, cellSize - 0.5);
        }
      }
    }
  }

  // Emblema central LG
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
// 7. CUENTA REGRESIVA Y AUDIO SINTETIZADOR
// ============================================================================
function initCountdown() {
  const dEl = document.getElementById('lbl-days');
  const hEl = document.getElementById('lbl-hours');
  const mEl = document.getElementById('lbl-minutes');
  const sEl = document.getElementById('lbl-seconds');

  function update() {
    const now = new Date().getTime();
    const distance = EVENT_DATA.targetDate.getTime() - now;

    if (distance < 0) {
      if (dEl) dEl.innerText = '00';
      if (hEl) hEl.innerText = '00';
      if (mEl) mEl.innerText = '00';
      if (sEl) sEl.innerText = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    if (dEl) dEl.innerText = String(days).padStart(2, '0');
    if (hEl) hEl.innerText = String(hours).padStart(2, '0');
    if (mEl) mEl.innerText = String(minutes).padStart(2, '0');
    if (sEl) sEl.innerText = String(seconds).padStart(2, '0');
  }

  update();
  setInterval(update, 1000);
}

// Audio Sintetizador Web Audio API
let audioCtx = null;
let musicInterval = null;
let isAudioPlaying = false;

function toggleAudio() {
  const btn = document.getElementById('btn-toggle-audio');
  const lbl = document.getElementById('audio-btn-label');

  if (isAudioPlaying) {
    if (musicInterval) {
      clearInterval(musicInterval);
      musicInterval = null;
    }
    isAudioPlaying = false;
    if (btn) btn.classList.add('muted');
    if (lbl) lbl.innerText = 'Música';
  } else {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!audioCtx && AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      isAudioPlaying = true;
      if (btn) btn.classList.remove('muted');
      if (lbl) lbl.innerText = 'Pausar';

      const melody = [523, 659, 783, 1046, 783, 659, 587, 523];
      let note = 0;

      musicInterval = setInterval(() => {
        if (!isAudioPlaying || !audioCtx) return;
        try {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(melody[note % melody.length], audioCtx.currentTime);
          note++;

          gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.32);

          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.32);
        } catch (e) {}
      }, 420);
    } catch (e) {}
  }
}

function triggerConfetti() {
  const canvas = document.getElementById('fx-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#1d4ed8', '#2563eb', '#3b82f6', '#93c5fd', '#dbeafe', '#b45309'];

  for (let i = 0; i < 90; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 10 + 3;
    particles.push({
      x: canvas.width / 2,
      y: canvas.height * 0.4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 7 + 4,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 8,
      opacity: 1,
      life: 0
    });
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22;
      p.vx *= 0.98;
      p.rotation += p.vRot;
      p.life++;

      if (p.life > 60) p.opacity -= 0.03;
      if (p.opacity <= 0 || p.y > canvas.height + 40) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    if (particles.length > 0) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  frame();
}

// ============================================================================
// 8. AUTO-INICIALIZACIÓN SEGÚN LA PÁGINA ACTIVA
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('form-rsvp')) {
    initGuestPage();
  } else if (document.getElementById('form-dispatch-invitation')) {
    initHostPanel();
  }
});
