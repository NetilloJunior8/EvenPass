/**
 * MOTOR UNIVERSAL DE INVITACIÓN Y PANEL DEL ANFITRIÓN | EVENPASS OS
 * Soporta Luis Gerardo 10 (evento 6) y cualquier evento futuro vía ?eventId=...&cfg=...
 * Sincronización automática bidireccional en vivo (BroadcastChannel + ntfy SSE + Attachment Unwrap).
 */

// ============================================================================
// 1. CONFIGURACIÓN BASE Y RESOLUCIÓN DINÁMICA POR EVENTO
// ============================================================================
const DEFAULT_EVENT_6 = {
  id: 6,
  title: 'Mis 10 Años · Luis Gerardo',
  boyName: 'Luis Gerardo',
  hostName: 'Familia Morales (Papás)',
  eventType: 'Cumpleaños',
  date: 'Sábado 14 de Noviembre, 2026',
  time: '4:00 PM (16:00 hrs)',
  eventDate: '2026-11-14T16:00:00',
  venue: 'Arena Laser Quest & Salón Neón VIP',
  venueAddress: 'Av. Paseo de los Héroes 450, Col. Las Quintas, Culiacán, Sinaloa',
  parentPhone: '526676118835',
  totalCapacity: 50,
  hasCroquis: true,
  hasScanner: true,
  tierPlan: 'PREMIUM',
  tables: [
    { id: 1, name: 'Mesa 01 - Familia Cercana', capacity: 10, shape: 'ROUND', tableNumber: 1 },
    { id: 2, name: 'Mesa 02 - Amigos de Colegio', capacity: 10, shape: 'ROUND', tableNumber: 2 },
    { id: 3, name: 'Mesa 03 - Padrinos & Tíos', capacity: 10, shape: 'ROUND', tableNumber: 3 },
    { id: 4, name: 'Mesa 04 - Amigos Deportes & Laser', capacity: 10, shape: 'ROUND', tableNumber: 4 },
    { id: 5, name: 'Mesa 05 - Invitados Especiales', capacity: 10, shape: 'ROUND', tableNumber: 5 }
  ]
};

function getActiveEventId() {
  const params = new URLSearchParams(window.location.search);
  const paramId = params.get('eventId') || params.get('ev') || params.get('id');
  if (paramId) {
    const parsed = parseInt(paramId, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 6;
}

const CLOUD_SYNC_RELAY = 'https://ntfy.sh/ep_v3_global';
const MQTT_BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
const STORAGE_KEY = `evenpass_event_${getActiveEventId()}_guests_db`;
const processedCloudMsgIds = new Set();
let isFirstAppPoll = true;
let cloudSseSource = null;
let cloudSseReconnectTimer = null;
let lastRenderedPassToken = null;
let mqttRelayClient = null;
let mqttRelayConnected = false;
let sseRelayConnected = false;

function trackProcessedMsgId(id) {
  if (!id) return;
  processedCloudMsgIds.add(id);
  if (processedCloudMsgIds.size > 600) {
    const first = processedCloudMsgIds.values().next().value;
    if (first) processedCloudMsgIds.delete(first);
  }
}

// Decodifica configuración compacta ?cfg=... generada por EvenPass OS para nuevos eventos
function decodeCompactConfigFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const cfg = params.get('cfg');
    if (!cfg) return null;
    const b64 = cfg.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const decoded = JSON.parse(new TextDecoder().decode(bytes));
    if (!decoded || !decoded.id) return null;

    const evId = Number(decoded.id);
    const meta = {
      id: evId,
      name: decoded.name || 'Evento EvenPass',
      hostName: decoded.hostName || 'Anfitrión',
      eventType: decoded.eventType || 'Evento',
      eventDate: decoded.eventDate || DEFAULT_EVENT_6.eventDate,
      venueName: decoded.venueName || 'Salón Principal',
      locationAddress: decoded.locationAddress || '',
      maxCapacity: Number(decoded.maxCapacity) || 200,
      tierPlan: decoded.tierPlan || 'STANDARD',
      hasCroquis: !!decoded.hasCroquis,
      hasScanner: !!decoded.hasScanner,
      status: decoded.status || 'PENDIENTE'
    };
    localStorage.setItem(`evenpass_event_${evId}_meta_db`, JSON.stringify(meta));
    if (Array.isArray(decoded.tables) && decoded.tables.length > 0) {
      localStorage.setItem(`evenpass_event_${evId}_tables_db`, JSON.stringify(decoded.tables));
    }
    return { meta, tables: decoded.tables || [] };
  } catch (e) {
    return null;
  }
}

function getEventMeta() {
  const evId = getActiveEventId();
  try {
    const rawMeta = localStorage.getItem(`evenpass_event_${evId}_meta_db`);
    if (rawMeta) {
      const m = JSON.parse(rawMeta);
      if (m && m.name) return m;
    }
  } catch (e) {}

  try {
    const rawEvents = localStorage.getItem('evenpass_events_db');
    if (rawEvents) {
      const list = JSON.parse(rawEvents);
      if (Array.isArray(list)) {
        const found = list.find(e => Number(e.id) === evId);
        if (found) return found;
      }
    }
  } catch (e) {}

  if (evId === 6) {
    return {
      id: 6,
      name: DEFAULT_EVENT_6.title,
      hostName: DEFAULT_EVENT_6.hostName,
      eventType: DEFAULT_EVENT_6.eventType,
      eventDate: DEFAULT_EVENT_6.eventDate,
      venueName: DEFAULT_EVENT_6.venue,
      locationAddress: DEFAULT_EVENT_6.venueAddress,
      maxCapacity: DEFAULT_EVENT_6.totalCapacity,
      hasCroquis: true,
      hasScanner: true,
      tierPlan: 'PREMIUM'
    };
  }

  return {
    id: evId,
    name: `Evento EvenPass #${evId}`,
    hostName: 'Anfitrión del Evento',
    eventType: 'Celebración',
    eventDate: new Date().toISOString(),
    venueName: 'Salón Principal',
    locationAddress: '',
    maxCapacity: 200,
    hasCroquis: true,
    hasScanner: true,
    tierPlan: 'STANDARD'
  };
}

function updateDynamicEventUI() {
  const meta = getEventMeta();
  const evId = getActiveEventId();
  const evName = meta.name || meta.title || DEFAULT_EVENT_6.title;
  const venue = meta.venueName || meta.venue || DEFAULT_EVENT_6.venue;
  const address = meta.locationAddress || meta.venueAddress || DEFAULT_EVENT_6.venueAddress;
  const hasCroquis = meta.hasCroquis !== false;
  const tables = getEventTablesRaw();
  const cap = tables.reduce((s, t) => s + (t.capacity || 10), 0) || Number(meta.maxCapacity) || 50;

  // Panel del Anfitrión
  const panelSub = document.getElementById('panel-event-subtitle');
  if (panelSub) {
    panelSub.innerText = `${evName} | Plan ${meta.tierPlan || 'STANDARD'} · ${venue}`;
  }
  const capLabel = document.getElementById('panel-capacity-label');
  if (capLabel) {
    capLabel.innerText = `Aforo Salón (${cap} max)`;
  }
  const croquisModule = document.getElementById('panel-croquis-module');
  if (croquisModule) {
    croquisModule.style.display = hasCroquis ? 'block' : 'none';
  }
  const dispatchTableWrap = document.getElementById('dispatch-table')?.parentElement;
  if (dispatchTableWrap) {
    dispatchTableWrap.style.display = hasCroquis ? 'block' : 'none';
  }

  // Invitación pública (index.html) cuando no es Event 6 o trae meta remota
  if (evId !== 6 || localStorage.getItem(`evenpass_event_${evId}_meta_db`)) {
    const heroTitle = document.getElementById('hero-event-title');
    const heroSub = document.getElementById('hero-event-subtitle');
    const heroVenue = document.getElementById('hero-event-venue');
    const heroDate = document.getElementById('hero-event-date');
    const heroTime = document.getElementById('hero-event-time');
    const vTitle = document.getElementById('venue-title-text');
    const vAddr = document.getElementById('venue-address-text');
    const notesLbl = document.getElementById('notes-label');

    if (heroTitle && evId !== 6) heroTitle.innerText = evName.toUpperCase();
    if (heroSub && evId !== 6) heroSub.innerText = `${meta.eventType || 'Evento'} · Anfitrión: ${meta.hostName || 'Organizador'}`;
    if (heroVenue) heroVenue.innerText = venue;
    if (vTitle) vTitle.innerText = venue;
    if (vAddr && address) vAddr.innerText = address;
    if (notesLbl && evId !== 6) notesLbl.innerText = `Dedicatoria para ${meta.hostName || 'los Anfitriones'} (Opcional)`;

    if (meta.eventDate) {
      const dt = new Date(meta.eventDate);
      if (!isNaN(dt.getTime())) {
        DEFAULT_EVENT_6.targetDate = dt;
        if (heroDate && evId !== 6) {
          heroDate.innerText = dt.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        }
        if (heroTime && evId !== 6) {
          heroTime.innerText = dt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        }
      }
    }
    if (evId !== 6) {
      document.title = `${evName} | Invitación EvenPass`;
    }
  }
}

function recordDeletedGuestLocal(eventId, token, fullName, timestamp = Date.now()) {
  try {
    const key = `evenpass_deleted_guests_${eventId}`;
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift({ token, fullName, timestamp });
    localStorage.setItem(key, JSON.stringify(list.slice(0, 40)));
  } catch (e) {}
}

function getDeletedGuestsLocal(eventId) {
  try {
    const raw = localStorage.getItem(`evenpass_deleted_guests_${eventId}`);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function createMqttCloudRelay(onMessage, onStatus) {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let ws = null;
  let ready = false;
  let brokerIdx = 0;
  let keepaliveTimer = null;
  let reconnectTimer = null;
  let topics = [];
  const outbox = [];

  function concat(parts) {
    const len = parts.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(len);
    let pos = 0;
    parts.forEach(p => { out.set(p, pos); pos += p.length; });
    return out;
  }

  function encStr(s) {
    const b = enc.encode(String(s));
    const out = new Uint8Array(2 + b.length);
    out[0] = (b.length >> 8) & 0xff;
    out[1] = b.length & 0xff;
    out.set(b, 2);
    return out;
  }

  function encRemLen(n) {
    const bytes = [];
    do {
      let d = n % 128;
      n = Math.floor(n / 128);
      if (n > 0) d |= 0x80;
      bytes.push(d);
    } while (n > 0);
    return new Uint8Array(bytes);
  }

  function encConnect(id) {
    const vh = concat([encStr('MQTT'), new Uint8Array([4, 2, 0, 60])]);
    const body = concat([vh, encStr(id)]);
    return concat([new Uint8Array([0x10]), encRemLen(body.length), body]);
  }

  function encSubscribe(tList) {
    const pid = Math.floor(1 + Math.random() * 60000);
    const parts = [new Uint8Array([(pid >> 8) & 0xff, pid & 0xff])];
    tList.forEach(t => { parts.push(encStr(t)); parts.push(new Uint8Array([0])); });
    const body = concat(parts);
    return concat([new Uint8Array([0x82]), encRemLen(body.length), body]);
  }

  function encPublish(topic, text, retain) {
    const body = concat([encStr(topic), enc.encode(text)]);
    return concat([new Uint8Array([retain ? 0x31 : 0x30]), encRemLen(body.length), body]);
  }

  function clearTimers() {
    if (keepaliveTimer) { clearInterval(keepaliveTimer); keepaliveTimer = null; }
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  }

  function markReady() {
    ready = true;
    if (onStatus) onStatus(true);
    if (keepaliveTimer) clearInterval(keepaliveTimer);
    keepaliveTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try { ws.send(new Uint8Array([0xc0, 0x00])); } catch (e) {}
      }
    }, 25000);
    while (outbox.length > 0 && ws && ws.readyState === WebSocket.OPEN) {
      const next = outbox.shift();
      try { ws.send(encPublish(next.topic, next.payload, next.retain)); } catch (e) {}
    }
  }

  function connect() {
    if (typeof WebSocket === 'undefined') return;
    clearTimers();
    ready = false;
    const url = MQTT_BROKERS[brokerIdx % MQTT_BROKERS.length];
    try {
      ws = new WebSocket(url, 'mqtt');
      ws.binaryType = 'arraybuffer';
      const currentWs = ws;
      const watchdog = setTimeout(() => {
        if (!ready && ws === currentWs) { try { ws.close(); } catch (e) {} }
      }, 6500);

      ws.onopen = () => {
        ws.send(encConnect('ep_web_' + Math.random().toString(36).slice(2, 10)));
      };

      ws.onmessage = (evt) => {
        const rawData = evt.data;
        const buf = rawData instanceof Uint8Array
          ? rawData
          : ArrayBuffer.isView(rawData)
            ? new Uint8Array(rawData.buffer, rawData.byteOffset, rawData.byteLength)
            : (rawData && typeof rawData.byteLength === 'number')
              ? new Uint8Array(rawData)
              : null;
        if (!buf) return;
        let offset = 0;
        while (offset < buf.length) {
          const hdr = buf[offset];
          const pktType = (hdr >> 4) & 0x0f;
          const flags = hdr & 0x0f;
          let pos = offset + 1;
          let remLen = 0;
          let mult = 1;
          let bad = false;
          while (pos < buf.length) {
            const b = buf[pos++];
            remLen += (b & 0x7f) * mult;
            mult *= 128;
            if ((b & 0x80) === 0) break;
            if (mult > 2097152) { bad = true; break; }
          }
          const pktEnd = pos + remLen;
          if (bad || pktEnd > buf.length) break;

          if (pktType === 2) {
            clearTimeout(watchdog);
            if (topics.length > 0) ws.send(encSubscribe(topics));
            else markReady();
          } else if (pktType === 9) {
            markReady();
          } else if (pktType === 3) {
            if (pos + 2 <= pktEnd) {
              const tLen = (buf[pos] << 8) | buf[pos + 1];
              let pStart = pos + 2 + tLen;
              const topic = dec.decode(buf.subarray(pos + 2, pos + 2 + tLen));
              if ((flags & 0x06) !== 0) pStart += 2;
              if (pStart <= pktEnd) {
                try {
                  const data = JSON.parse(dec.decode(buf.subarray(pStart, pktEnd)));
                  if (onMessage) onMessage(topic, data);
                } catch (e) {}
              }
            }
          }
          offset = pktEnd;
        }
      };

      ws.onerror = () => { clearTimeout(watchdog); if (onStatus) onStatus(false); };
      ws.onclose = () => {
        clearTimeout(watchdog);
        ready = false;
        ws = null;
        clearTimers();
        if (onStatus) onStatus(false);
        brokerIdx = (brokerIdx + 1) % MQTT_BROKERS.length;
        reconnectTimer = setTimeout(connect, 2500);
      };
    } catch (e) {
      if (onStatus) onStatus(false);
      brokerIdx = (brokerIdx + 1) % MQTT_BROKERS.length;
      reconnectTimer = setTimeout(connect, 3000);
    }
  }

  return {
    start(tList) {
      topics = tList.slice();
      connect();
    },
    publish(topic, obj, retain = false) {
      const payload = typeof obj === 'string' ? obj : JSON.stringify(obj);
      if (ws && ws.readyState === WebSocket.OPEN && ready) {
        try { ws.send(encPublish(topic, payload, retain)); return; } catch (e) {}
      }
      outbox.push({ topic, payload, retain });
      if (outbox.length > 40) outbox.shift();
    }
  };
}

let retainedSnapshotTimer = null;
function scheduleRetainedRemoteActionSnapshot(evId) {
  if (retainedSnapshotTimer) clearTimeout(retainedSnapshotTimer);
  retainedSnapshotTimer = setTimeout(() => {
    retainedSnapshotTimer = null;
    if (!mqttRelayClient) return;
    const now = Date.now();
    const snapId = 'msg_snap_' + now + '_' + Math.random().toString(36).substr(2, 6);
    trackProcessedMsgId(snapId);
    const snapPayload = {
      type: 'SYNC_FULL_STATE',
      msgId: snapId,
      eventId: evId,
      eventMeta: getEventMeta(),
      allGuests: getStoredGuests(),
      allTables: getEventTablesRaw(),
      deletedGuests: getDeletedGuestsLocal(evId),
      timestamp: now
    };
    mqttRelayClient.publish(`evenpass/cloud/v2/remote-action/${evId}`, snapPayload, true);
  }, 150);
}

// ============================================================================
// 2. EMISOR Y DESEMPAQUETADOR CLOUD (WSS MQTT PRIMARIO + SSE RESPALDO)
// ============================================================================
function broadcastToCloud(payload) {
  try {
    const evId = Number(payload?.eventId || getActiveEventId() || 6);
    if (!payload.msgId) {
      payload.msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    trackProcessedMsgId(payload.msgId);

    if (mqttRelayClient) {
      mqttRelayClient.publish(`evenpass/cloud/v2/ev/${evId}`, payload, false);
      const isMutation = payload.type !== 'REQUEST_FULL_STATE';
      if (isMutation) {
        scheduleRetainedRemoteActionSnapshot(evId);
      }
    }

    const serialized = JSON.stringify(payload);
    if (payload.type !== 'REQUEST_FULL_STATE' && (serialized.length < 3800 || !mqttRelayConnected)) {
      fetch(CLOUD_SYNC_RELAY, {
        method: 'POST',
        headers: {
          'Title': 'EvenPass Cloud Sync',
          'Tags': 'ticket,cloud'
        },
        body: serialized
      }).catch(err => console.warn('Cloud sync relay warn:', err));
    }
  } catch (e) {}
}

function broadcastLocalChannel(payload) {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('evenpass_invitations_channel');
      bc.postMessage(payload);
    }
  } catch (e) {}
}

async function unwrapCloudPacket(raw) {
  if (!raw) return null;
  if (typeof raw.message === 'string' && raw.message.trim().startsWith('{')) {
    try {
      return JSON.parse(raw.message);
    } catch (e) {}
  }
  if (raw.attachment && typeof raw.attachment.url === 'string') {
    try {
      const res = await fetch(raw.attachment.url, { method: 'GET', mode: 'cors', cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().startsWith('{')) {
          return JSON.parse(text);
        }
      }
    } catch (e) {
      console.warn('Attachment fetch warn:', e);
    }
  }
  return null;
}

// ============================================================================
// 3. SALONES, MESAS Y AUTO-BALANCEADOR SIN SOBRECUPO
// ============================================================================
function getEventTablesRaw() {
  const evId = getActiveEventId();
  const meta = getEventMeta();
  if (meta && meta.hasCroquis === false) {
    return [];
  }

  let baseTables = evId === 6 ? DEFAULT_EVENT_6.tables.map(t => ({ ...t })) : [];

  try {
    const cachedTables = localStorage.getItem(`evenpass_event_${evId}_tables_db`);
    if (cachedTables) {
      const parsed = JSON.parse(cachedTables);
      if (Array.isArray(parsed)) {
        baseTables = parsed.map((t, idx) => ({
          id: t.id || (idx + 1),
          name: t.name || t.tableName || `Mesa ${idx + 1}`,
          capacity: Number(t.capacity) || 10,
          shape: t.shape || 'ROUND',
          tableNumber: t.tableNumber || (idx + 1)
        }));
      }
    }
  } catch (e) {}

  // Si EvenPass está en el mismo navegador, leer salón exacto del evento
  try {
    const rawSalons = localStorage.getItem('evenpass_salons_db');
    const rawEvents = localStorage.getItem('evenpass_events_db');
    if (rawSalons) {
      const salons = JSON.parse(rawSalons);
      let targetSalonId = evId === 6 ? 4 : null;
      if (rawEvents) {
        const evList = JSON.parse(rawEvents);
        const ev = Array.isArray(evList) ? evList.find(item => Number(item.id) === evId) : null;
        if (ev && ev.salonId) targetSalonId = Number(ev.salonId);
      }
      const curSalon = targetSalonId ? salons.find(s => Number(s.id) === Number(targetSalonId)) : null;
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

  return baseTables;
}

function getEventTables() {
  const meta = getEventMeta();
  if (meta && meta.hasCroquis === false) return [];
  return getEventTablesRaw();
}

function matchesTableName(guestTableName, table) {
  if (!guestTableName || !table) return false;
  const g = String(guestTableName).toLowerCase().trim();
  const t = String(table.name || table.tableName || '').toLowerCase().trim();
  if (!g || !t) return false;
  if (g === t) return true;
  if (g.startsWith(t) || t.startsWith(g)) return true;

  const gMatch = g.match(/\b(?:mesa|table)\s*0*(\d+)/i);
  const tMatch = t.match(/\b(?:mesa|table)\s*0*(\d+)/i);
  if (gMatch && tMatch && parseInt(gMatch[1], 10) === parseInt(tMatch[1], 10)) {
    return true;
  }
  if (gMatch && table.tableNumber && parseInt(gMatch[1], 10) === Number(table.tableNumber)) {
    return true;
  }
  return false;
}

function balanceGuestsAgainstCapacity(guestsList) {
  if (!Array.isArray(guestsList) || guestsList.length === 0) {
    return { guests: guestsList, changed: false };
  }
  const meta = getEventMeta();
  if (meta && meta.hasCroquis === false) {
    return { guests: guestsList, changed: false };
  }

  const tables = getEventTablesRaw();
  if (tables.length === 0) {
    return { guests: guestsList, changed: false };
  }

  const occTracker = new Map();
  tables.forEach(t => occTracker.set(t.name, 0));
  const evId = getActiveEventId();
  let changed = false;

  guestsList.forEach(g => {
    if (
      g.status !== 'DECLINED' &&
      g.tableName &&
      !g.tableName.toLowerCase().includes('sin asignar') &&
      !g.tableName.toLowerCase().includes('sin mesa')
    ) {
      const passes = Number(g.passesGranted || g.passesConfirmed || g.totalPasses || 1);
      const matched = tables.find(t => matchesTableName(g.tableName, t));
      const tName = matched ? matched.name : g.tableName;
      const current = occTracker.get(tName) || 0;
      const cap = matched ? (matched.capacity || 10) : 10;

      if (matched && current + passes > cap) {
        let alt = tables.find(t => {
          if (t.name === tName) return false;
          const altOcc = occTracker.get(t.name) || 0;
          return ((t.capacity || 10) - altOcc) >= passes;
        });

        if (!alt) {
          const totalCap = Math.max(Number(meta.maxCapacity) || 0, tables.reduce((s, x) => s + (x.capacity || 10), 0));
          const totalUsed = [...occTracker.values()].reduce((s, v) => s + v, 0);
          if (totalUsed + passes <= totalCap || evId === 6) {
            const nextNum = (tables.reduce((m, t) => Math.max(m, t.tableNumber || 0), 0)) + 1;
            const newTbl = {
              id: Date.now() + nextNum,
              name: `Mesa ${nextNum < 10 ? '0' + nextNum : nextNum} - Auto`,
              capacity: Math.max(10, passes),
              shape: 'ROUND',
              tableNumber: nextNum
            };
            tables.push(newTbl);
            occTracker.set(newTbl.name, 0);
            alt = newTbl;

            try {
              localStorage.setItem(`evenpass_event_${evId}_tables_db`, JSON.stringify(tables));
            } catch (e) {}

            const msgId = 'msg_tbl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            broadcastLocalChannel({ type: 'AUTO_TABLE_CREATED', msgId, eventId: evId, table: newTbl });
            broadcastToCloud({ type: 'AUTO_TABLE_CREATED', msgId, eventId: evId, table: newTbl, timestamp: Date.now() });
          }
        }

        if (alt) {
          g.tableName = alt.name;
          g.manualAssignmentTimestamp = Date.now();
          occTracker.set(alt.name, (occTracker.get(alt.name) || 0) + passes);
          changed = true;
        }
      } else {
        occTracker.set(tName, current + passes);
      }
    }
  });

  return { guests: guestsList, changed };
}

function getStoredGuests() {
  const evId = getActiveEventId();

  // 1. Si EvenPass OS corre en el mismo origen/navegador, leer su base filtrada por evId
  try {
    const epAll = localStorage.getItem('evenpass_all_guests_db');
    if (epAll) {
      const epGuests = JSON.parse(epAll);
      if (Array.isArray(epGuests)) {
        const evGuests = epGuests.filter(g => Number(g.eventId) === evId);
        if (evGuests.length > 0 || localStorage.getItem('evenpass_events_db')) {
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

          const balanceResult = balanceGuestsAgainstCapacity(mapped);
          const finalMapped = balanceResult.guests;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(finalMapped));
          localStorage.setItem(`evenpass_event_${evId}_guests_db`, JSON.stringify(finalMapped));
          if (evId === 6) {
            localStorage.setItem('evenpass_luis_gerardo_guests_db', JSON.stringify(finalMapped));
          }
          return finalMapped;
        }
      }
    }
  } catch (e) {}

  // 2. Caché local aislada por eventId (evita contaminar eventos nuevos con datos de Event 6)
  const cached = localStorage.getItem(STORAGE_KEY) || (evId === 6 ? localStorage.getItem('evenpass_luis_gerardo_guests_db') : null);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        const balanceResult = balanceGuestsAgainstCapacity(parsed);
        const finalParsed = balanceResult.guests;
        if (balanceResult.changed) {
          saveGuestsListSilently(finalParsed);
        }
        return finalParsed;
      }
    } catch (e) {}
  }

  // 3. Padrón inicial exclusivo para Evento 6 (Luis Gerardo 10 años, Mario en Mesa 02 = EvenPass)
  if (evId === 6) {
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

  return [];
}

function saveGuestsListSilently(list) {
  const evId = getActiveEventId();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  try {
    localStorage.setItem(`evenpass_event_${evId}_guests_db`, JSON.stringify(list));
    if (evId === 6) {
      localStorage.setItem('evenpass_luis_gerardo_guests_db', JSON.stringify(list));
      localStorage.setItem('evenpass_luis_gerardo_updated_tick', String(Date.now()));
    }
  } catch (e) {}
}

function getTableOccupancies() {
  const guests = getStoredGuests();
  const tables = getEventTables();
  const occ = new Map();
  tables.forEach(t => occ.set(t.name, 0));

  guests.forEach(g => {
    if (
      g.status !== 'DECLINED' &&
      g.tableName &&
      !g.tableName.toLowerCase().includes('sin mesa') &&
      !g.tableName.toLowerCase().includes('sin asignar')
    ) {
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
  const meta = getEventMeta();
  const tables = getEventTables();
  const occ = getTableOccupancies();
  const guests = getStoredGuests();
  const committedPasses = guests
    .filter(g => g.status !== 'DECLINED')
    .reduce((sum, g) => sum + Number(g.passesGranted || g.passesConfirmed || 1), 0);
  const maxEventCap = Number(meta.maxCapacity) || tables.reduce((s, t) => s + (t.capacity || 10), 0) || 200;

  if (committedPasses + passes > maxEventCap) {
    return { tableName: null, autoCreated: false, venueFull: true };
  }

  if (meta && meta.hasCroquis === false) {
    return { tableName: 'Acceso General', autoCreated: false, venueFull: false };
  }

  if (preferredName && preferredName !== 'AUTO') {
    const target = tables.find(t => t.name === preferredName);
    if (target) {
      const current = occ.get(target.name) || 0;
      if (current + passes <= target.capacity) {
        return { tableName: target.name, autoCreated: false, venueFull: false };
      }
    }
  }

  for (const table of tables) {
    const current = occ.get(table.name) || 0;
    if (table.capacity - current >= passes) {
      return { tableName: table.name, autoCreated: false, venueFull: false };
    }
  }

  // Todas las mesas llenas pero dentro del aforo máximo: auto-crear nueva mesa
  const evId = getActiveEventId();
  const nextNum = (tables.reduce((m, t) => Math.max(m, t.tableNumber || 0), 0)) + 1;
  const newTableName = `Mesa ${nextNum < 10 ? '0' + nextNum : nextNum} - Auto`;
  const newTable = {
    id: Date.now(),
    name: newTableName,
    capacity: Math.max(10, passes),
    shape: 'ROUND',
    tableNumber: nextNum
  };

  try {
    const existing = getEventTablesRaw();
    existing.push(newTable);
    localStorage.setItem(`evenpass_event_${evId}_tables_db`, JSON.stringify(existing));
  } catch (e) {}

  const msgId = 'msg_tbl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  trackProcessedMsgId(msgId);
  broadcastLocalChannel({ type: 'AUTO_TABLE_CREATED', msgId, eventId: evId, table: newTable });
  broadcastToCloud({ type: 'AUTO_TABLE_CREATED', msgId, eventId: evId, table: newTable, timestamp: Date.now() });

  return { tableName: newTableName, autoCreated: true, venueFull: false };
}

// ============================================================================
// 4. ENLACE A GOOGLE CALENDAR & UTILIDADES
// ============================================================================
function getGoogleCalendarUrl(guestName = '', passes = 2, table = '') {
  const meta = getEventMeta();
  const evTitle = meta.name || meta.title || DEFAULT_EVENT_6.title;
  const venue = meta.venueName || meta.venue || DEFAULT_EVENT_6.venue;
  const address = meta.locationAddress || DEFAULT_EVENT_6.venueAddress;
  const title = encodeURIComponent(evTitle);
  const dates = '20261114T220000Z/20261115T023000Z';
  const location = encodeURIComponent(address || venue);
  const details = encodeURIComponent(
    `${evTitle} en ${venue}.\n\n` +
    (guestName ? `Pase reservado para: ${guestName} (${passes} personas)\n` : '') +
    (table ? `Mesa Asignada: ${table}\n\n` : '') +
    `Presenta tu pase digital o código QR al llegar.`
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}&sf=true&output=xml`;
}

// ============================================================================
// 5. LÓGICA DE INVITACIÓN DIGITAL (INDEX.HTML)
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
  decodeCompactConfigFromUrl();
  updateDynamicEventUI();

  const urlParams = new URLSearchParams(window.location.search);
  const nameParam = urlParams.get('nombre');
  const passesParam = parseInt(urlParams.get('pases'), 10);
  const tokenParam = urlParams.get('token');

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
    // Si abrieron el enlace general sin nombre personalizado, habilitar edición directa
    if (inputName && inputName.type === 'hidden') {
      inputName.type = 'text';
      inputName.className = 'form-input-clean';
      inputName.placeholder = 'Escribe tu nombre completo o familia';
      inputName.value = '';
      inputName.required = true;
      const guestCard = document.querySelector('.rsvp-guest-card');
      if (guestCard) guestCard.style.display = 'none';
    }
  }

  if (selectPasses) {
    selectPasses.innerHTML = '';
    const maxSel = nameParam ? defaultPasses : 6;
    for (let i = 1; i <= maxSel; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.innerText = `${i} ${i === 1 ? 'Persona' : 'Personas'}`;
      if (i === defaultPasses) opt.selected = true;
      selectPasses.appendChild(opt);
    }
  }

  if (tokenParam) {
    lastRenderedPassToken = tokenParam;
    const guests = getStoredGuests();
    const existing = guests.find(g => g.token === tokenParam);
    if (existing && (existing.status === 'CONFIRMED' || existing.status === 'ATTENDED')) {
      renderIssuedPass(existing.fullName, existing.passesConfirmed || existing.passesGranted, existing.tableName, existing.token);
    }
  }

  initCountdown();
  startLiveCloudSyncListener();
  broadcastLocalChannel({ type: 'REQUEST_FULL_STATE', eventId: getActiveEventId() });
  broadcastToCloud({ type: 'REQUEST_FULL_STATE', eventId: getActiveEventId(), timestamp: Date.now() });
}

function submitRsvp(e) {
  e.preventDefault();

  const name = document.getElementById('input-name').value.trim();
  const phone = document.getElementById('input-phone').value.trim() || 'Enlace Digital';
  const notes = document.getElementById('input-notes').value.trim();
  const passesSelected = userAttendance ? parseInt(document.getElementById('select-passes').value, 10) : 0;

  if (!name) {
    alert('Por favor ingresa tu nombre.');
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token');
  const token = tokenFromUrl || `EP-${Math.floor(1000 + Math.random() * 9000)}`;
  lastRenderedPassToken = token;

  const guests = getStoredGuests();
  let assignedTable = 'Sin asignar';

  if (userAttendance) {
    const existingPre = guests.find(g => (tokenFromUrl && g.token === tokenFromUrl) || g.fullName.toLowerCase() === name.toLowerCase());
    const preferred = existingPre && existingPre.tableName && existingPre.tableName !== 'Sin asignar' ? existingPre.tableName : 'AUTO';
    const assignRes = autoAssignTable(passesSelected, preferred);
    if (assignRes.venueFull) {
      alert('El evento ha alcanzado su capacidad máxima de lugares disponibles.');
      return;
    }
    assignedTable = assignRes.tableName || 'Sin asignar';
  }

  const existingIdx = guests.findIndex(g => (tokenFromUrl && g.token === tokenFromUrl) || g.fullName.toLowerCase() === name.toLowerCase());
  const now = Date.now();
  const confirmedGuestObj = {
    id: existingIdx >= 0 ? guests[existingIdx].id : now,
    fullName: name,
    phone: existingIdx >= 0 ? (phone || guests[existingIdx].phone) : phone,
    passesGranted: passesSelected || (existingIdx >= 0 ? guests[existingIdx].passesGranted : 2),
    passesConfirmed: passesSelected,
    status: userAttendance ? 'CONFIRMED' : 'DECLINED',
    tableName: assignedTable,
    token: token,
    notes: notes,
    updatedAt: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    manualAssignmentTimestamp: now
  };

  if (existingIdx >= 0) {
    guests[existingIdx] = confirmedGuestObj;
  } else {
    guests.unshift(confirmedGuestObj);
  }

  saveGuestsListSilently(guests);

  const evId = getActiveEventId();
  const msgId = 'msg_rsvp_' + now + '_' + Math.random().toString(36).substr(2, 7);
  trackProcessedMsgId(msgId);

  try {
    localStorage.setItem('evenpass_latest_rsvp_guest', JSON.stringify({
      msgId, eventId: evId, fullName: name, phone, passes: passesSelected, token, assignedTable,
      status: confirmedGuestObj.status, source: 'DIGITAL_INVITATION', timestamp: now
    }));
  } catch (err) {}

  broadcastLocalChannel({
    type: 'RSVP_CONFIRMED',
    msgId,
    eventId: evId,
    guest: confirmedGuestObj,
    allGuests: guests
  });

  // Cloud payload compacto (<4KB) para entrega SSE instantánea
  broadcastToCloud({
    type: 'RSVP_CONFIRMED',
    msgId,
    eventId: evId,
    guest: confirmedGuestObj,
    timestamp: now
  });

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
            Hemos registrado que no podrás asistir y notificamos a los anfitriones.
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

  lastRenderedPassToken = token;
  if (pName) pName.innerText = name;
  if (pTable) pTable.innerText = `Mesa Asignada: ${tableName || 'Por asignar'}`;
  if (pFolio) pFolio.innerText = token;
  if (pPasses) pPasses.innerText = `${passes} ${passes === 1 ? 'Persona' : 'Personas'}`;

  if (qrCanvas) {
    drawQrMatrix(qrCanvas, token);
  }

  if (waBtn) {
    const meta = getEventMeta();
    const evTitle = meta.name || DEFAULT_EVENT_6.title;
    const msg = encodeURIComponent(
      `Hola. Confirmamos nuestra asistencia a ${evTitle}.\n\n` +
      `Invitado: ${name}\n` +
      `Pases: ${passes} personas\n` +
      `Mesa asignada: ${tableName || 'Por asignar'}\n` +
      `Folio QR: ${token}` +
      (notes ? `\nMensaje: "${notes}"` : '')
    );
    waBtn.href = `https://wa.me/${DEFAULT_EVENT_6.parentPhone}?text=${msg}`;
  }

  if (calBtn) {
    calBtn.href = getGoogleCalendarUrl(name, passes, tableName);
  }

  if (form) form.style.display = 'none';
  if (passCard) {
    passCard.style.display = 'block';
    passCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function syncOpenGuestPassScreen(guest) {
  if (!guest) return;
  const token = guest.token;
  if (!lastRenderedPassToken || (token && token !== lastRenderedPassToken)) return;

  const pName = document.getElementById('pass-guest-name');
  const pTable = document.getElementById('pass-table-name');
  const pPasses = document.getElementById('pass-passes-count');
  const rTargetName = document.getElementById('rsvp-target-name');
  const rPassesBadge = document.getElementById('rsvp-passes-badge');

  const passes = guest.passesConfirmed || guest.passesGranted || 1;
  if (pName) pName.innerText = guest.fullName;
  if (pTable) pTable.innerText = `Mesa Asignada: ${guest.tableName || 'Por asignar'}`;
  if (pPasses) pPasses.innerText = `${passes} ${passes === 1 ? 'Persona' : 'Personas'}`;
  if (rTargetName) rTargetName.innerText = guest.fullName;
  if (rPassesBadge) rPassesBadge.innerText = `${guest.passesGranted || passes} Pases Reservados`;
}

// ============================================================================
// 6. SINCRONIZACIÓN BIDIRECCIONAL EN TIEMPO REAL (SIN BOTONES MANUALES)
// ============================================================================
function applyTableReassignment(data) {
  if (!data) return;
  const targetEvId = Number(data.eventId) || 6;
  if (targetEvId !== getActiveEventId()) return;

  const guests = getStoredGuests();
  let modified = false;
  let updatedGuest = null;
  const msgTimestamp = Number(data.timestamp || 0);

  guests.forEach(g => {
    const matchToken = data.guestToken && g.token === data.guestToken;
    const matchName = data.fullName && g.fullName && g.fullName.toLowerCase().trim() === data.fullName.toLowerCase().trim();
    if (matchToken || matchName) {
      const curTs = Number(g.manualAssignmentTimestamp || 0);
      if (curTs && msgTimestamp && msgTimestamp < curTs) {
        return;
      }

      const tables = getEventTablesRaw();
      const matchedTable = tables.find(t => matchesTableName(data.newTableName, t));
      const newTbl = (!data.newTableName || data.newTableName === 'Sin asignar')
        ? 'Sin asignar'
        : (matchedTable ? matchedTable.name : data.newTableName);

      if (g.tableName !== newTbl) {
        g.tableName = newTbl;
        g.manualAssignmentTimestamp = msgTimestamp || Date.now();
        modified = true;
      }
      updatedGuest = g;
    }
  });

  if (modified) {
    saveGuestsListSilently(guests);
    schedulePanelRender();
    syncOpenGuestPassScreen(updatedGuest);
  }
}

function applyFullStateSync(data) {
  if (!data) return;
  const targetEvId = Number(data.eventId) || 6;
  if (targetEvId !== getActiveEventId()) return;

  let changed = false;

  if (data.eventMeta) {
    try {
      localStorage.setItem(`evenpass_event_${targetEvId}_meta_db`, JSON.stringify(data.eventMeta));
      updateDynamicEventUI();
      changed = true;
    } catch (e) {}
  }

  if (Array.isArray(data.allTables)) {
    try {
      const normalizedTables = data.allTables.map((t, idx) => ({
        id: t.id || (idx + 1),
        name: t.name || t.tableName || `Mesa ${idx + 1}`,
        capacity: Number(t.capacity) || 10,
        shape: t.shape || 'ROUND',
        tableNumber: t.tableNumber || (idx + 1)
      }));
      localStorage.setItem(`evenpass_event_${targetEvId}_tables_db`, JSON.stringify(normalizedTables));
      changed = true;
    } catch (e) {}
  }

  if (Array.isArray(data.allGuests)) {
    try {
      const localGuests = getStoredGuests();
      const deletedLocal = getDeletedGuestsLocal(targetEvId);
      const remoteDeleted = Array.isArray(data.deletedGuests) ? data.deletedGuests : [];

      let mergedGuests = localGuests.filter(g => {
        const delMatch = remoteDeleted.find(d =>
          (d.token && g.token && d.token === g.token) ||
          (d.fullName && g.fullName && d.fullName.toLowerCase().trim() === g.fullName.toLowerCase().trim())
        );
        if (!delMatch) return true;
        if (Number(g.manualAssignmentTimestamp || 0) > Number(delMatch.timestamp || 0)) return true;
        changed = true;
        return false;
      });

      data.allGuests.forEach(incomingG => {
        const delMatch = deletedLocal.find(d =>
          (d.token && incomingG.token && d.token === incomingG.token) ||
          (d.fullName && incomingG.fullName && d.fullName.toLowerCase().trim() === incomingG.fullName.toLowerCase().trim())
        );
        if (delMatch && Number(incomingG.manualAssignmentTimestamp || data.timestamp || 0) <= Number(delMatch.timestamp || 0)) {
          return;
        }

        const idx = mergedGuests.findIndex(g =>
          (incomingG.token && g.token === incomingG.token) ||
          (incomingG.id && g.id === incomingG.id) ||
          (incomingG.fullName && g.fullName && g.fullName.toLowerCase().trim() === incomingG.fullName.toLowerCase().trim())
        );

        if (idx >= 0) {
          const cur = mergedGuests[idx];
          const localTs = Number(cur.manualAssignmentTimestamp || 0);
          const incomingTs = Number(incomingG.manualAssignmentTimestamp || data.timestamp || 0);
          const preferLocal = localTs > incomingTs;

          const finalTableName = preferLocal ? cur.tableName : (incomingG.tableName || 'Sin asignar');
          const finalTs = preferLocal ? localTs : incomingTs;
          const finalStatus = preferLocal ? cur.status : (incomingG.status || cur.status);
          const finalPasses = preferLocal ? cur.passesGranted : (incomingG.passesGranted || cur.passesGranted);

          if (
            cur.tableName !== finalTableName ||
            cur.status !== finalStatus ||
            cur.passesGranted !== finalPasses ||
            cur.fullName !== incomingG.fullName
          ) {
            mergedGuests[idx] = {
              ...cur,
              ...incomingG,
              tableName: finalTableName,
              manualAssignmentTimestamp: finalTs,
              status: finalStatus,
              passesGranted: finalPasses
            };
            changed = true;
          }
        } else {
          mergedGuests.push(incomingG);
          changed = true;
        }
      });

      if (changed) {
        saveGuestsListSilently(mergedGuests);
      }

      if (lastRenderedPassToken) {
        const matched = mergedGuests.find(g => g.token === lastRenderedPassToken);
        if (matched) syncOpenGuestPassScreen(matched);
      }
    } catch (e) {}
  }

  if (changed) {
    schedulePanelRender();
  }
}

let panelRenderScheduled = false;
function schedulePanelRender() {
  if (panelRenderScheduled) return;
  panelRenderScheduled = true;
  const doRender = () => {
    panelRenderScheduled = false;
    updateDynamicEventUI();
    if (document.getElementById('panel-tables-grid') || document.getElementById('panel-table-body')) {
      loadStoredGuests();
    }
  };
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(doRender);
  } else {
    setTimeout(doRender, 16);
  }
}

function handleIncomingCloudMessage(data) {
  if (!data || !data.type) return;
  const evId = getActiveEventId();
  if (data.eventId && Number(data.eventId) !== evId) return;

  if (data.type === 'SYNC_FULL_STATE') {
    applyFullStateSync(data);
    return;
  }

  if (data.type === 'TABLES_SYNC' && Array.isArray(data.allTables)) {
    try {
      const normalized = data.allTables.map((t, idx) => ({
        id: t.id || (idx + 1),
        name: t.name || t.tableName || `Mesa ${idx + 1}`,
        capacity: Number(t.capacity) || 10,
        shape: t.shape || 'ROUND',
        tableNumber: t.tableNumber || (idx + 1)
      }));
      localStorage.setItem(`evenpass_event_${evId}_tables_db`, JSON.stringify(normalized));
      if (typeof populateDispatchTablesSelect === 'function') populateDispatchTablesSelect();
      schedulePanelRender();
    } catch (e) {}
    return;
  }

  if (data.type === 'TABLE_REASSIGNED') {
    applyTableReassignment(data);
    return;
  }

  if (data.type === 'GUEST_DELETED') {
    const evId = getActiveEventId();
    recordDeletedGuestLocal(evId, data.guestToken, data.fullName, Number(data.timestamp || Date.now()));
    const guests = getStoredGuests();
    const filtered = guests.filter(g =>
      !(
        (data.guestToken && g.token === data.guestToken) ||
        (data.fullName && g.fullName && g.fullName.toLowerCase().trim() === data.fullName.toLowerCase().trim()) ||
        (data.guestId && g.id === data.guestId)
      )
    );
    if (filtered.length !== guests.length) {
      saveGuestsListSilently(filtered);
      schedulePanelRender();
    }
    return;
  }

  if ((data.type === 'AUTO_TABLE_CREATED' || data.type === 'TABLE_CREATED') && data.table) {
    try {
      const existing = getEventTablesRaw();
      const tblName = data.table.name || data.table.tableName;
      const alreadyExists = existing.some(t => t.name === tblName || Number(t.id) === Number(data.table.id));
      if (!alreadyExists) {
        existing.push({
          id: data.table.id || Date.now(),
          name: tblName,
          capacity: Number(data.table.capacity) || 10,
          shape: data.table.shape || 'ROUND',
          tableNumber: data.table.tableNumber || (existing.length + 1)
        });
        localStorage.setItem(`evenpass_event_${evId}_tables_db`, JSON.stringify(existing));
      }
      if (typeof populateDispatchTablesSelect === 'function') populateDispatchTablesSelect();
      schedulePanelRender();
    } catch (e) {}
    return;
  }

  if (data.type === 'SYNC_ALL' && Array.isArray(data.guests)) {
    saveGuestsListSilently(data.guests);
    schedulePanelRender();
    return;
  }

  if (data.type === 'NEW_GUEST' || data.type === 'NEW_INVITATION' || data.type === 'GUEST_UPDATED' || data.type === 'RSVP_CONFIRMED') {
    if (data.guest) {
      const guests = getStoredGuests();
      const existingIdx = guests.findIndex(g =>
        (data.guest.token && g.token === data.guest.token) ||
        (data.guest.id && g.id === data.guest.id) ||
        (g.fullName && data.guest.fullName && g.fullName.toLowerCase().trim() === data.guest.fullName.toLowerCase().trim())
      );
      const msgTs = Number(data.guest.manualAssignmentTimestamp || data.timestamp || 0);
      let modifiedGuest;
      if (existingIdx < 0) {
        modifiedGuest = { ...data.guest, manualAssignmentTimestamp: msgTs };
        guests.unshift(modifiedGuest);
      } else {
        const cur = guests[existingIdx];
        const curTs = Number(cur.manualAssignmentTimestamp || 0);
        const preferLocal = curTs > msgTs;
        modifiedGuest = {
          ...cur,
          ...data.guest,
          tableName: preferLocal ? cur.tableName : (data.guest.tableName || cur.tableName),
          manualAssignmentTimestamp: Math.max(curTs, msgTs)
        };
        guests[existingIdx] = modifiedGuest;
      }
      saveGuestsListSilently(guests);
      schedulePanelRender();
      syncOpenGuestPassScreen(modifiedGuest);
    } else if (Array.isArray(data.allGuests) && data.allGuests.length > 0) {
      applyFullStateSync(data);
    }
  }
}

function connectCloudSse() {
  try {
    if (typeof EventSource === 'undefined') return;
    if (cloudSseSource) {
      try { cloudSseSource.close(); } catch (e) {}
    }
    cloudSseSource = new EventSource(`${CLOUD_SYNC_RELAY}/sse`);
    cloudSseSource.onopen = () => {
      sseRelayConnected = true;
    };
    cloudSseSource.onmessage = async (e) => {
      try {
        const raw = JSON.parse(e.data);
        if (raw.id) {
          if (processedCloudMsgIds.has(raw.id)) return;
          trackProcessedMsgId(raw.id);
        }
        const data = await unwrapCloudPacket(raw);
        if (!data) return;
        if (data.msgId) {
          if (processedCloudMsgIds.has(data.msgId)) return;
          trackProcessedMsgId(data.msgId);
        }
        handleIncomingCloudMessage(data);
      } catch (err) {}
    };
    cloudSseSource.onerror = () => {
      sseRelayConnected = false;
      try { cloudSseSource.close(); } catch (e) {}
      cloudSseSource = null;
      if (!cloudSseReconnectTimer) {
        cloudSseReconnectTimer = setTimeout(() => {
          cloudSseReconnectTimer = null;
          connectCloudSse();
        }, 8000);
      }
    };
  } catch (e) {}
}

function pollCloudRelay() {
  const timeParam = isFirstAppPoll ? 'since=6h' : 'since=45s';
  isFirstAppPoll = false;

  fetch(`${CLOUD_SYNC_RELAY}/json?poll=1&${timeParam}`, { method: 'GET', mode: 'cors', cache: 'no-store' })
    .then(res => res.ok ? res.text() : '')
    .then(async text => {
      if (!text) return;
      const lines = text.trim().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.id) {
            if (processedCloudMsgIds.has(parsed.id)) continue;
            trackProcessedMsgId(parsed.id);
          }
          const data = await unwrapCloudPacket(parsed);
          if (!data) continue;
          if (data.msgId) {
            if (processedCloudMsgIds.has(data.msgId)) continue;
            trackProcessedMsgId(data.msgId);
          }
          handleIncomingCloudMessage(data);
        } catch (e) {}
      }
    })
    .catch(() => {});
}

let cloudListenerStarted = false;
function startLiveCloudSyncListener() {
  if (cloudListenerStarted) return;
  cloudListenerStarted = true;

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('evenpass_invitations_channel');
      bc.onmessage = (event) => {
        if (event && event.data) {
          if (event.data.msgId) {
            if (processedCloudMsgIds.has(event.data.msgId)) return;
            trackProcessedMsgId(event.data.msgId);
          }
          handleIncomingCloudMessage(event.data);
        }
      };
    }
  } catch (e) {}

  const evId = getActiveEventId();
  mqttRelayClient = createMqttCloudRelay(
    (_topic, data) => {
      if (!data || typeof data !== 'object') return;
      if (data.msgId) {
        if (processedCloudMsgIds.has(data.msgId)) return;
        trackProcessedMsgId(data.msgId);
      }
      handleIncomingCloudMessage(data);
    },
    (connected) => {
      mqttRelayConnected = !!connected;
    }
  );
  mqttRelayClient.start([
    `evenpass/cloud/v2/ev/${evId}`,
    `evenpass/cloud/v2/ep-state/${evId}`
  ]);

  connectCloudSse();
  setTimeout(pollCloudRelay, 900);
  setInterval(() => {
    if (!mqttRelayConnected && !sseRelayConnected) {
      pollCloudRelay();
    }
  }, 30000);
}

// ============================================================================
// 7. PANEL DEL ANFITRIÓN (PANEL.HTML) — SIN SOBRECUPO Y CON MESAS EN VIVO
// ============================================================================
function initHostPanel() {
  decodeCompactConfigFromUrl();
  updateDynamicEventUI();
  loadStoredGuests();
  startLiveCloudSyncListener();

  const evId = getActiveEventId();
  broadcastLocalChannel({ type: 'REQUEST_FULL_STATE', eventId: evId });
  broadcastToCloud({ type: 'REQUEST_FULL_STATE', eventId: evId, timestamp: Date.now() });

  window.addEventListener('storage', (e) => {
    if (
      e.key === STORAGE_KEY ||
      e.key === 'evenpass_all_guests_db' ||
      e.key === 'evenpass_salons_db' ||
      e.key === 'evenpass_luis_gerardo_updated_tick' ||
      e.key === `evenpass_event_${evId}_tables_db` ||
      e.key === `evenpass_event_${evId}_meta_db`
    ) {
      schedulePanelRender();
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
  let guests = getStoredGuests();
  const balanceRes = balanceGuestsAgainstCapacity(guests);
  if (balanceRes.changed) {
    guests = balanceRes.guests;
    saveGuestsListSilently(guests);
  }
  populateDispatchTablesSelect();
  renderPanelKPIs(guests);
  renderPanelTablesGrid(guests);
  renderPanelTable();
}

function renderPanelKPIs(guests) {
  let confirmedPasses = 0;
  let confirmedFamilies = 0;
  let pendingCount = 0;
  let totalCommittedPasses = 0;

  guests.forEach(g => {
    if (g.status === 'CONFIRMED' || g.status === 'ATTENDED') {
      confirmedPasses += (g.passesConfirmed || g.passesGranted || 0);
      confirmedFamilies++;
    } else if (g.status === 'PENDING') {
      pendingCount++;
    }
    if (g.status !== 'DECLINED') {
      totalCommittedPasses += (g.passesGranted || g.passesConfirmed || 0);
    }
  });

  const meta = getEventMeta();
  const tables = getEventTables();
  const totalVenueCap = tables.reduce((sum, t) => sum + (t.capacity || 10), 0) || Number(meta.maxCapacity) || 50;

  const kpiConf = document.getElementById('kpi-panel-confirmed');
  const kpiOcc = document.getElementById('kpi-panel-occupancy');
  const kpiFam = document.getElementById('kpi-panel-families');
  const kpiPend = document.getElementById('kpi-panel-pending');

  const occPct = Math.round((confirmedPasses / totalVenueCap) * 100);
  const commitPct = Math.round((totalCommittedPasses / totalVenueCap) * 100);
  const isVenueFull = totalCommittedPasses >= totalVenueCap;

  if (kpiConf) kpiConf.innerText = `${confirmedPasses} / ${totalVenueCap}`;
  if (kpiOcc) kpiOcc.innerText = `${occPct}% (${commitPct}% comprometido)`;
  if (kpiFam) kpiFam.innerText = String(confirmedFamilies);
  if (kpiPend) kpiPend.innerText = String(pendingCount);

  let bannerEl = document.getElementById('panel-aforo-banner');
  if (!bannerEl) {
    bannerEl = document.createElement('div');
    bannerEl.id = 'panel-aforo-banner';
    bannerEl.style.cssText = 'display:none;background:#dc2626;color:#fff;text-align:center;padding:12px 20px;font-weight:700;font-size:0.95rem;border-radius:10px;margin:10px 0;';
    const kpiSection = document.querySelector('.panel-kpis-grid');
    if (kpiSection) kpiSection.after(bannerEl);
  }
  if (isVenueFull) {
    bannerEl.style.display = 'block';
    bannerEl.innerText = `AFORO COMPLETO: ${totalCommittedPasses}/${totalVenueCap} pases comprometidos. No se pueden crear más invitaciones hasta liberar espacio o agregar mesas.`;
  } else {
    bannerEl.style.display = 'none';
  }
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

    const seatedList = guests
      .filter(g => g.status !== 'DECLINED' && matchesTableName(g.tableName, table))
      .map(g => {
        const passes = g.passesGranted || g.passesConfirmed || g.totalPasses || 1;
        const isConf = g.status === 'CONFIRMED' || g.status === 'ATTENDED';
        const shortName = g.fullName.split(' ')[0];
        return `${shortName} (${passes}p ${isConf ? 'Conf.' : 'Pend.'})`;
      });

    const isRect = table.shape === 'IMPERIAL' || table.shape === 'RECTANGULAR';
    const shapeBadge = isRect
      ? '<span style="font-size: 0.65rem; background: #e0e7ff; color: #4338ca; padding: 1px 5px; border-radius: 4px; margin-left: 4px; font-weight: 700;">Imperial</span>'
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
        ${table.name.split(' - ')[1] || (isRect ? 'Mesa Imperial Rectangular' : 'Mesa Redonda')}
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

function createTableFromPanel(e) {
  e.preventDefault();
  const nameInput = document.getElementById('new-table-name');
  const shapeSelect = document.getElementById('new-table-shape');
  const capInput = document.getElementById('new-table-capacity');

  const name = nameInput.value.trim();
  if (!name) return;
  const shape = shapeSelect.value === 'RECTANGULAR' ? 'RECTANGULAR' : 'ROUND';
  const capacity = Math.max(2, Math.min(30, parseInt(capInput.value, 10) || 10));

  const evId = getActiveEventId();
  const existing = getEventTablesRaw();
  const nextNum = (existing.reduce((m, t) => Math.max(m, t.tableNumber || 0), 0)) + 1;

  const newTable = {
    id: Date.now(),
    name: name,
    capacity: capacity,
    shape: shape,
    tableNumber: nextNum
  };

  existing.push(newTable);
  try {
    localStorage.setItem(`evenpass_event_${evId}_tables_db`, JSON.stringify(existing));
  } catch (err) {}

  const msgId = 'msg_tbl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 7);
  trackProcessedMsgId(msgId);

  const payload = {
    type: 'TABLE_CREATED',
    msgId,
    eventId: evId,
    table: newTable,
    timestamp: Date.now()
  };
  broadcastLocalChannel({ ...payload, allTables: existing });
  broadcastToCloud(payload);

  nameInput.value = '';
  populateDispatchTablesSelect();
  schedulePanelRender();
}

function autoDistributeFromPanel() {
  const guests = getStoredGuests();
  const tables = getEventTablesRaw();
  if (tables.length === 0) return;

  let changed = false;
  const occ = getTableOccupancies();
  guests.forEach(g => {
    if (g.status === 'DECLINED') return;
    if (!g.tableName || g.tableName === 'Sin asignar') {
      const passes = Number(g.passesGranted || g.passesConfirmed || 1);
      const target = tables.find(t => ((t.capacity || 10) - (occ.get(t.name) || 0)) >= passes);
      if (target) {
        g.tableName = target.name;
        g.manualAssignmentTimestamp = Date.now();
        occ.set(target.name, (occ.get(target.name) || 0) + passes);
        changed = true;
      }
    }
  });

  if (changed) {
    saveGuestsListSilently(guests);
    const evId = getActiveEventId();
    const msgId = 'msg_auto_' + Date.now();
    trackProcessedMsgId(msgId);
    broadcastLocalChannel({ type: 'SYNC_FULL_STATE', msgId, eventId: evId, allGuests: guests, allTables: tables, timestamp: Date.now() });
    broadcastToCloud({ type: 'SYNC_FULL_STATE', msgId, eventId: evId, allGuests: guests, allTables: tables, timestamp: Date.now() });
    schedulePanelRender();
  }
}

function reassignGuestTableFromPanel(guestId, newTableName) {
  const guests = getStoredGuests();
  const guest = guests.find(g => g.id === guestId);
  if (!guest) return;

  let targetTable = null;
  if (newTableName && newTableName !== 'Sin asignar') {
    const tables = getEventTables();
    targetTable = tables.find(t => matchesTableName(newTableName, t));
    if (targetTable) {
      const occ = getTableOccupancies();
      const isAlreadyThere = matchesTableName(guest.tableName, targetTable);
      const curOccupied = occ.get(targetTable.name) || 0;
      const passes = Number(guest.passesGranted || guest.passesConfirmed || 1);
      const prospectiveOcc = isAlreadyThere ? curOccupied : (curOccupied + passes);

      if (prospectiveOcc > targetTable.capacity) {
        alert(
          `Mesa al Límite de Aforo\n\n` +
          `"${targetTable.name}" ya tiene ${curOccupied}/${targetTable.capacity} lugares.\n` +
          `"${guest.fullName}" (${passes} pases) supera el límite. Elige otra mesa o crea una nueva.`
        );
        loadStoredGuests();
        return;
      }
    }
  }

  const evId = getActiveEventId();
  guest.tableName = newTableName === 'Sin asignar' ? 'Sin asignar' : (targetTable ? targetTable.name : newTableName);
  guest.manualAssignmentTimestamp = Date.now();
  saveGuestsListSilently(guests);

  const msgId = 'msg_mv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 7);
  trackProcessedMsgId(msgId);

  const payload = {
    type: 'TABLE_REASSIGNED',
    msgId,
    eventId: evId,
    guestId: guest.id,
    guestToken: guest.token,
    fullName: guest.fullName,
    newTableName: guest.tableName,
    newTableId: targetTable ? targetTable.id : undefined,
    timestamp: guest.manualAssignmentTimestamp
  };

  broadcastLocalChannel(payload);
  broadcastToCloud(payload);
  schedulePanelRender();
}

function renderPanelTable() {
  const guests = getStoredGuests();
  const searchInput = document.getElementById('panel-search');
  const term = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const tbody = document.getElementById('panel-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const tables = getEventTables();
  const meta = getEventMeta();
  const hasCroquis = meta.hasCroquis !== false;

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
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted);">No hay invitados registrados en este filtro.</td></tr>`;
    return;
  }

  filtered.forEach(g => {
    const tr = document.createElement('tr');
    let badgeClass = 'badge-status pending';
    let statusText = 'PENDIENTE';
    if (g.status === 'ATTENDED') {
      badgeClass = 'badge-status confirmed';
      statusText = `EN PUERTA (${g.passesConfirmed || g.passesGranted}p)`;
    } else if (g.status === 'CONFIRMED') {
      badgeClass = 'badge-status confirmed';
      statusText = `CONFIRMADO (${g.passesConfirmed || g.passesGranted}p)`;
    } else if (g.status === 'DECLINED') {
      badgeClass = 'badge-status declined';
      statusText = 'NO ASISTIRÁ';
    }

    let tableCellHtml = `<span style="font-size: 0.78rem; color: #64748b;">Acceso General</span>`;
    if (hasCroquis) {
      let tableOptions = `<option value="Sin asignar">Sin asignar</option>`;
      tables.forEach(t => {
        const isSelected = matchesTableName(g.tableName, t);
        tableOptions += `<option value="${t.name}" ${isSelected ? 'selected' : ''}>${t.name.split(' - ')[0]}</option>`;
      });
      tableCellHtml = `
        <select class="form-input-clean table-inline-select" style="padding: 4px 8px; font-size: 0.78rem; font-weight: 700; width: auto; max-width: 175px; border-color: #cbd5e1; background: #f8fafc;" onchange="reassignGuestTableFromPanel(${g.id}, this.value)">
          ${tableOptions}
        </select>
      `;
    }

    tr.innerHTML = `
      <td>
        <strong style="color: #0f172a; display: block;">${g.fullName}</strong>
        <small style="color: #64748b;">${g.phone || 'Sin teléfono'} · ${g.updatedAt || 'Reciente'}</small>
      </td>
      <td><b>${g.passesGranted || g.passesConfirmed || 1} pases</b></td>
      <td>${tableCellHtml}</td>
      <td><code style="font-size: 0.78rem;">${g.token}</code></td>
      <td><span class="${badgeClass}">${statusText}</span></td>
      <td style="white-space: nowrap;">
        <button class="btn-outline" style="padding: 4px 8px; font-size: 0.72rem;" onclick="openEditGuestModal(${g.id})">Editar</button>
        <button class="btn-outline" style="padding: 4px 8px; font-size: 0.72rem;" onclick="copyGuestInviteLink('${g.fullName.replace(/'/g, "\\'")}', ${g.passesGranted || 1}, '${g.token}')">Copiar Link</button>
        <button class="btn-outline" style="padding: 4px 8px; font-size: 0.72rem; color: #dc2626;" onclick="deleteHostGuest(${g.id})">Borrar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openEditGuestModal(guestId) {
  const guests = getStoredGuests();
  const g = guests.find(item => item.id === guestId);
  if (!g) return;
  document.getElementById('edit-guest-id').value = g.id;
  document.getElementById('edit-guest-name').value = g.fullName;
  document.getElementById('edit-guest-passes').value = g.passesGranted || g.passesConfirmed || 1;
  document.getElementById('edit-guest-status').value = g.status === 'ATTENDED' ? 'CONFIRMED' : (g.status || 'CONFIRMED');
  document.getElementById('edit-guest-phone').value = g.phone || '';
  const modal = document.getElementById('panel-edit-modal');
  if (modal) modal.style.display = 'flex';
}

function closeEditGuestModal() {
  const modal = document.getElementById('panel-edit-modal');
  if (modal) modal.style.display = 'none';
}

function saveEditedGuestFromPanel(e) {
  e.preventDefault();
  const guestId = Number(document.getElementById('edit-guest-id').value);
  const fullName = document.getElementById('edit-guest-name').value.trim();
  const passes = Math.max(1, parseInt(document.getElementById('edit-guest-passes').value, 10) || 1);
  const status = document.getElementById('edit-guest-status').value;
  const phone = document.getElementById('edit-guest-phone').value.trim();

  if (!fullName) return;
  const guests = getStoredGuests();
  const idx = guests.findIndex(g => Number(g.id) === guestId);
  if (idx < 0) return;

  const cur = guests[idx];
  const meta = getEventMeta();
  const tables = getEventTables();
  const maxEventCap = Number(meta.maxCapacity) || tables.reduce((s, t) => s + (t.capacity || 10), 0) || 200;
  const otherCommitted = guests
    .filter(g => g.id !== cur.id && g.status !== 'DECLINED')
    .reduce((s, g) => s + Number(g.passesGranted || g.passesConfirmed || 1), 0);

  if (status !== 'DECLINED' && otherCommitted + passes > maxEventCap) {
    alert(`El cambio excede el aforo máximo del evento (${otherCommitted + passes}/${maxEventCap} pases).`);
    return;
  }

  let tableName = cur.tableName;
  if (meta.hasCroquis !== false && status !== 'DECLINED' && tableName && tableName !== 'Sin asignar') {
    const matchedTbl = tables.find(t => matchesTableName(tableName, t));
    if (matchedTbl) {
      const othersInTbl = guests
        .filter(g => g.id !== cur.id && g.status !== 'DECLINED' && matchesTableName(g.tableName, matchedTbl))
        .reduce((s, g) => s + Number(g.passesGranted || g.passesConfirmed || 1), 0);
      if (othersInTbl + passes > matchedTbl.capacity) {
        const res = autoAssignTable(passes, 'AUTO');
        if (res.tableName) tableName = res.tableName;
      }
    }
  }

  const now = Date.now();
  const updated = {
    ...cur,
    fullName,
    phone,
    passesGranted: passes,
    passesConfirmed: (status === 'CONFIRMED' || status === 'ATTENDED') ? passes : 0,
    status,
    tableName,
    manualAssignmentTimestamp: now
  };
  guests[idx] = updated;
  saveGuestsListSilently(guests);

  const evId = getActiveEventId();
  const msgId = 'msg_upd_' + now + '_' + Math.random().toString(36).substr(2, 6);
  trackProcessedMsgId(msgId);
  broadcastLocalChannel({ type: 'GUEST_UPDATED', msgId, eventId: evId, guest: updated });
  broadcastToCloud({ type: 'GUEST_UPDATED', msgId, eventId: evId, guest: updated, timestamp: now });

  closeEditGuestModal();
  schedulePanelRender();
}

function getGuestInvitationBaseUrl() {
  if (window.location.protocol === 'file:') {
    const raw = window.location.href.split('?')[0].split('#')[0];
    return raw.replace(/panel(\.html)?$/i, 'index.html');
  }
  const url = new URL(window.location.href);
  let pathname = url.pathname
    .replace(/\/panel\.html$/i, '')
    .replace(/\/panel\/?$/i, '')
    .replace(/\/index\.html$/i, '')
    .replace(/\/+$/, '');
  return pathname ? `${url.origin}${pathname}/index.html` : `${url.origin}/index.html`;
}

function openEventInvitationPage() {
  const evId = getActiveEventId();
  const params = new URLSearchParams(window.location.search);
  const cfg = params.get('cfg');
  const url = `${getGuestInvitationBaseUrl()}?eventId=${evId}${cfg ? '&cfg=' + cfg : ''}`;
  window.open(url, '_blank');
}

function dispatchInvitation(e) {
  e.preventDefault();

  const nameInput = document.getElementById('dispatch-name');
  const passesInput = document.getElementById('dispatch-passes');
  const tableSelect = document.getElementById('dispatch-table');

  const name = nameInput.value.trim();
  const passes = parseInt(passesInput.value, 10) || 1;
  const preferredTable = tableSelect ? tableSelect.value : 'AUTO';

  if (!name) {
    alert('Por favor ingresa el nombre del invitado.');
    return;
  }

  const assignResult = autoAssignTable(passes, preferredTable);
  if (assignResult.venueFull) {
    alert(
      `AFORO COMPLETO\n\n` +
      `No hay capacidad disponible para ${passes} pase(s) en este evento.\n` +
      `Libera lugares o crea mesas adicionales primero.`
    );
    return;
  }

  if (assignResult.autoCreated) {
    alert(
      `Mesa Creada Automáticamente\n\n` +
      `Todas las mesas estaban llenas. Se creó automáticamente "${assignResult.tableName}" para ${name} (${passes} pase(s)).`
    );
  }

  const evId = getActiveEventId();
  const token = `${evId === 6 ? 'LG10-VIP' : 'EP-' + String(evId).slice(-3)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const assignedTable = assignResult.tableName || 'Sin asignar';
  const now = Date.now();

  const newGuest = {
    id: now,
    fullName: name,
    phone: 'WhatsApp Directo',
    passesGranted: passes,
    passesConfirmed: 0,
    status: 'PENDING',
    tableName: assignedTable,
    token,
    notes: 'Enlace enviado por WhatsApp',
    updatedAt: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    manualAssignmentTimestamp: now
  };

  const guests = getStoredGuests();
  guests.unshift(newGuest);
  saveGuestsListSilently(guests);

  const msgId = 'msg_new_' + now + '_' + Math.random().toString(36).substr(2, 7);
  trackProcessedMsgId(msgId);

  broadcastLocalChannel({ type: 'NEW_INVITATION', msgId, eventId: evId, guest: newGuest, allGuests: guests });
  broadcastToCloud({ type: 'NEW_GUEST', msgId, eventId: evId, guest: newGuest, timestamp: now });

  const params = new URLSearchParams(window.location.search);
  const cfg = params.get('cfg');
  const inviteUrl = `${getGuestInvitationBaseUrl()}?eventId=${evId}&nombre=${encodeURIComponent(name)}&pases=${passes}&token=${token}${cfg ? '&cfg=' + cfg : ''}`;
  const meta = getEventMeta();
  const evName = meta.name || DEFAULT_EVENT_6.title;

  const msg =
    `Hola ${name},\n` +
    `Te compartimos tu invitación digital oficial para ${evName} con ${passes} pases reservados:\n` +
    `${inviteUrl}\n\n` +
    `Abre el enlace para confirmar tu asistencia y ver tu mesa asignada.`;

  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');

  nameInput.value = '';
  populateDispatchTablesSelect();
  schedulePanelRender();
}

function copyGuestInviteLink(name, passes, token) {
  const evId = getActiveEventId();
  const params = new URLSearchParams(window.location.search);
  const cfg = params.get('cfg');
  const inviteUrl = `${getGuestInvitationBaseUrl()}?eventId=${evId}&nombre=${encodeURIComponent(name)}&pases=${passes}&token=${token}${cfg ? '&cfg=' + cfg : ''}`;

  navigator.clipboard.writeText(inviteUrl).then(() => {
    alert(`Enlace copiado para ${name}:\n\n${inviteUrl}`);
  }).catch(() => {
    prompt('Copia el siguiente enlace:', inviteUrl);
  });
}

function deleteHostGuest(id) {
  if (!confirm('¿Deseas eliminar a este invitado y liberar sus lugares asignados?')) return;
  const guests = getStoredGuests();
  const guestToDelete = guests.find(g => g.id === id);
  if (!guestToDelete) return;

  const list = guests.filter(g => g.id !== id);
  const evId = getActiveEventId();
  recordDeletedGuestLocal(evId, guestToDelete.token, guestToDelete.fullName, Date.now());
  saveGuestsListSilently(list);
  schedulePanelRender();

  const msgId = 'msg_del_' + Date.now() + '_' + Math.random().toString(36).substr(2, 7);
  trackProcessedMsgId(msgId);

  const payload = {
    type: 'GUEST_DELETED',
    msgId,
    eventId: evId,
    guestId: id,
    guestToken: guestToDelete.token,
    fullName: guestToDelete.fullName,
    tableName: guestToDelete.tableName,
    timestamp: Date.now()
  };

  broadcastLocalChannel(payload);
  broadcastToCloud(payload);
}

function exportCsvForHostess() {
  const guests = getStoredGuests();
  let csv = 'ID,Invitado,Telefono,Pases_Confirmados,Pases_Otorgados,Mesa_Asignada,Folio_QR,Estado,Hora\n';
  guests.forEach(g => {
    csv += [
      g.id,
      `"${(g.fullName || '').replace(/"/g, '""')}"`,
      `"${g.phone || ''}"`,
      g.passesConfirmed || 0,
      g.passesGranted || 0,
      `"${g.tableName || ''}"`,
      g.token || '',
      g.status,
      g.updatedAt || ''
    ].join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Padron_EvenPass_Evento_${getActiveEventId()}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// 8. UTILIDADES: QR EN CANVAS, CUENTA REGRESIVA, AUDIO Y CONFETI
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
    ctx.fillStyle = '#1d4ed8';
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
      if (!isTL && !isTR && !isBL && nextRand() > 0.46) {
        ctx.fillRect(c * cellSize + 0.5, r * cellSize + 0.5, cellSize - 0.5, cellSize - 0.5);
      }
    }
  }

  const centerSize = 5 * cellSize;
  const cx = (size - centerSize) / 2;
  const cy = (size - centerSize) / 2;
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(cx, cy, centerSize, centerSize);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${cellSize * 2.2}px 'Outfit', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EP', size / 2, size / 2);
}

function initCountdown() {
  const dEl = document.getElementById('lbl-days');
  const hEl = document.getElementById('lbl-hours');
  const mEl = document.getElementById('lbl-minutes');
  const sEl = document.getElementById('lbl-seconds');

  function update() {
    const now = new Date().getTime();
    const meta = getEventMeta();
    const targetMs = new Date(meta.eventDate || DEFAULT_EVENT_6.eventDate).getTime() || new Date('2026-11-14T16:00:00').getTime();
    const distance = targetMs - now;
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
      if (!audioCtx && AudioCtxClass) audioCtx = new AudioCtxClass();
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
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

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('form-rsvp')) {
    initGuestPage();
  } else if (document.getElementById('form-dispatch-invitation')) {
    initHostPanel();
  }
});
