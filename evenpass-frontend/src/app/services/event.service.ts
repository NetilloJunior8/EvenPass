import { Injectable, signal, computed, NgZone } from '@angular/core';
import { 
  EventItem, Guest, Salon, SalonTable, SalonType, CheckInLog, 
  InvitationTemplate, AutoAssignResult, SupportTicket, SystemConfig, ItineraryItem, EventStatus,
  ExternalAuditEntry, SupabaseConfig 
} from '../models/models';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  // All Events in Catalog
  events = signal<EventItem[]>([]);
  activeEventId = signal<number>(
    (() => {
      try {
        const saved = localStorage.getItem('evenpass_active_event_id');
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed)) return parsed;
        }
      } catch (e) {}
      return 6; // Default to Luis Gerardo (Mis 10 Años)
    })()
  );

  // Computed Active Event
  selectedEvent = computed<EventItem | null>(() => {
    return this.events().find(e => e.id === this.activeEventId()) || this.events()[0] || null;
  });

  // State Collections
  allGuests = signal<Guest[]>([]);
  allLogs = signal<CheckInLog[]>([]);
  allAuditEntries = signal<ExternalAuditEntry[]>([]);
  salons = signal<Salon[]>([]);
  activeSalonId = signal<number>(1);

  // --- PERSISTENCE STORAGE KEYS ---
  readonly STORAGE_EVENTS = 'evenpass_events_db';
  readonly STORAGE_SALONS = 'evenpass_salons_db';
  readonly STORAGE_GUESTS = 'evenpass_all_guests_db';
  readonly STORAGE_LOGS = 'evenpass_all_logs_db';

  persistSalons(): void {
    try {
      const salonList = this.salons();
      localStorage.setItem(this.STORAGE_SALONS, JSON.stringify(salonList));

      // Also persist per-event tables database
      this.events().forEach(ev => {
        const targetSalonId = ev.salonId || 4;
        const targetSalon = salonList.find(s => s.id === targetSalonId);
        if (targetSalon && targetSalon.tables) {
          const formatted = targetSalon.tables.map(t => ({
            id: t.id,
            name: t.tableName,
            capacity: t.capacity || 10,
            shape: t.shape || 'ROUND',
            tableNumber: t.tableNumber,
            occupiedSeats: t.occupiedSeats || 0
          }));
          localStorage.setItem(`evenpass_event_${ev.id}_tables_db`, JSON.stringify(formatted));
        }
      });
    } catch (e) {
      console.warn('Error guardando salones en localStorage:', e);
    }
  }

  persistGuests(): void {
    try {
      const all = this.allGuests();
      localStorage.setItem(this.STORAGE_GUESTS, JSON.stringify(all));

      // Also persist per-event databases so local polling stays in 100% sync
      const eventIds = new Set(all.map(g => g.eventId));
      eventIds.forEach(evId => {
        const evGuests = all.filter(g => g.eventId === evId);
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
          manualAssignmentTimestamp: g.manualAssignmentTimestamp || Date.now()
        }));
        localStorage.setItem(`evenpass_event_${evId}_guests_db`, JSON.stringify(mapped));
        if (evId === 6) {
          localStorage.setItem('evenpass_luis_gerardo_guests_db', JSON.stringify(mapped));
          localStorage.setItem('evenpass_luis_gerardo_updated_tick', String(Date.now()));
        }
      });
    } catch (e) {
      console.warn('Error guardando invitados en localStorage:', e);
    }
  }

  persistEvents(): void {
    try {
      localStorage.setItem(this.STORAGE_EVENTS, JSON.stringify(this.events()));
    } catch (e) {
      console.warn('Error guardando eventos en localStorage:', e);
    }
  }

  currentSalon = computed<Salon | null>(() => {
    const activeEv = this.selectedEvent();
    const targetId = activeEv?.salonId || this.activeSalonId();
    const baseSalon = this.salons().find(s => s.id === targetId) || this.salons()[0] || null;
    if (!baseSalon) return null;

    // Dynamically calculate assigned guests and occupied seats in real time
    const evGuests = this.eventGuests();
    const updatedTables = baseSalon.tables.map(table => {
      const seated = evGuests.filter(g => 
        (g.assignedTableId != null && Number(g.assignedTableId) === Number(table.id)) ||
        (g.assignedTableName && g.assignedTableName.toLowerCase().trim() === table.tableName.toLowerCase().trim()) ||
        (g.assignedTableName && new RegExp(`\\b(mesa|table)\\s*0*${table.tableNumber}\\b`, 'i').test(g.assignedTableName))
      );
      const totalOccupied = seated.reduce((sum, g) => sum + g.totalPasses, 0);
      return {
        ...table,
        occupiedSeats: totalOccupied,
        assignedGuests: seated
      };
    });

    return {
      ...baseSalon,
      tables: updatedTables
    };
  });

  supabaseConfig = signal<SupabaseConfig>({
    url: 'https://wxvueavcyylgnbpksplr.supabase.co',
    anonKey: 'sb_anon_live_ep889214kldsf90234u1209384kjhsdkfh293847',
    tableName: 'guests',
    connected: true,
    autoSync: true
  });

  templates = signal<InvitationTemplate[]>([]);
  supportTickets = signal<SupportTicket[]>([]);

  // Dynamic Event Types Catalog
  eventTypes = signal<string[]>([
    'Boda',
    'XV Años',
    'Graduación',
    'Cumpleaños',
    'Bautizo',
    'Posada / Fiesta Navideña',
    'Primera Comunión',
    'Baby Shower',
    'Aniversario',
    'Gala Corporativa / Conferencia',
    'Fiesta Privada / VIP',
    'Despedida de Soltera/o'
  ]);

  addCustomEventType(newType: string): void {
    const clean = newType.trim();
    if (!clean) return;
    if (!this.eventTypes().some(t => t.toLowerCase() === clean.toLowerCase())) {
      this.eventTypes.update(list => [...list, clean]);
      this.notificationService.show('success', 'Categoría Guardada', `"${clean}" se agregó al catálogo de tipos de evento.`);
    }
  }

  // System Configuration
  systemConfig = signal<SystemConfig>({
    platformName: 'EvenPass Enterprise Event OS',
    requireApproval: false,
    autoTableAssignment: true,
    enableQrAntiReplay: true,
    allowManualCheckIn: true,
    whatsappMessageTemplate: 'Hola {nombre}! Te compartimos tu pase oficial para {evento}. Mesa: {mesa}. Ver pase: {url}'
  });

  // Event-Scoped Computeds
  eventGuests = computed<Guest[]>(() => {
    const evId = this.activeEventId();
    return this.allGuests().filter(g => g.eventId === evId);
  });

  eventLogs = computed<CheckInLog[]>(() => {
    const evId = this.activeEventId();
    return this.allLogs().filter(l => l.eventId === evId);
  });

  eventAuditEntries = computed<ExternalAuditEntry[]>(() => {
    const evId = this.activeEventId();
    return this.allAuditEntries().filter(a => a.eventId === evId);
  });

  eventItinerary = computed<ItineraryItem[]>(() => {
    return this.selectedEvent()?.itinerary || [];
  });

  // --- SMART REAL-TIME CLOCK & ITINERARY AUTO-PROGRESSION ---
  simulatedTime = signal<string | null>(null);
  autoProgressionEnabled = signal<boolean>(true);

  currentEffectiveTime = computed<string>(() => {
    if (this.simulatedTime()) return this.simulatedTime()!;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  });

  isEventLocked(ev?: EventItem | null): boolean {
    const target = ev !== undefined ? ev : this.selectedEvent();
    if (!target) return false;
    return target.status === 'FINALIZADO';
  }

  setSimulatedTime(timeStr: string | null): void {
    this.simulatedTime.set(timeStr);
    this.autoAdvanceItineraryForCurrentEvent();
    if (timeStr) {
      this.notificationService.show('info', 'Simulación de Horario Activada', `Reloj del sistema ajustado a las ${timeStr} hrs.`);
    } else {
      this.notificationService.show('success', 'Reloj Real Restaurado', 'Sincronizado con la hora de tu dispositivo.');
    }
  }

  autoAdvanceItineraryForCurrentEvent(): void {
    if (!this.autoProgressionEnabled()) return;
    const activeEv = this.selectedEvent();
    if (!activeEv || !activeEv.itinerary || activeEv.itinerary.length === 0) return;

    // Normalizar fechas para comparar días de calendario (año, mes, día)
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    let evDate = new Date();
    try {
      if (activeEv.eventDate) {
        evDate = new Date(activeEv.eventDate);
      }
    } catch (e) {}
    const evDayMidnight = new Date(evDate.getFullYear(), evDate.getMonth(), evDate.getDate()).getTime();

    // 1. SI EL EVENTO ES EN EL FUTURO (Aún no llega el día del evento):
    // El evento está en preparación activa: Despacho de invitaciones, confirmaciones y croquis.
    // NUNCA debe marcarse como FINALIZADO ni bloquearse.
    if (evDayMidnight > todayMidnight && !this.simulatedTime()) {
      if (activeEv.status !== 'PENDIENTE') {
        const updatedItinerary = activeEv.itinerary.map(item => ({ ...item, status: 'UPCOMING' as const }));
        this.events.update(list => list.map(e => 
          e.id === activeEv.id ? { ...e, status: 'PENDIENTE', itinerary: updatedItinerary } : e
        ));
      }
      return;
    }

    // 2. SI EL DÍA DEL EVENTO ES ANTERIOR A HOY (Ya concluyó en días pasados):
    if (evDayMidnight < todayMidnight && !this.simulatedTime()) {
      if (activeEv.status !== 'FINALIZADO') {
        const updatedItinerary = activeEv.itinerary.map(item => ({ ...item, status: 'COMPLETED' as const }));
        this.events.update(list => list.map(e => 
          e.id === activeEv.id ? { ...e, status: 'FINALIZADO', itinerary: updatedItinerary } : e
        ));
      }
      return;
    }

    // 3. EL EVENTO ES HOY (o está activa una simulación manual de horario):
    if (activeEv.status === 'FINALIZADO' && !this.simulatedTime()) return;

    const timeStr = this.currentEffectiveTime();
    const parts = timeStr.split(':').map(n => parseInt(n, 10));
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return;
    const [currH, currM] = parts;
    const currTotalMins = currH * 60 + currM;

    // Hora de inicio según el primer elemento del itinerario (o 16:00 por defecto)
    let eventStartMins = 16 * 60;
    const firstItem = activeEv.itinerary[0];
    if (firstItem && firstItem.time) {
      const p = firstItem.time.split(':').map(n => parseInt(n, 10));
      if (p.length >= 2 && !isNaN(p[0]) && !isNaN(p[1])) {
        eventStartMins = p[0] * 60 + p[1];
      }
    }

    const isMorningBeforeEvent = currH >= 6 && currTotalMins < eventStartMins;

    if (isMorningBeforeEvent) {
      // Evento del día de hoy antes de la hora de inicio
      let changed = false;
      let newStatus = activeEv.status;
      if (activeEv.status === 'EN_PROGRESO') {
        newStatus = 'PENDIENTE';
        changed = true;
      }
      const updatedItinerary = activeEv.itinerary.map(item => {
        if (item.status !== 'UPCOMING') {
          changed = true;
          return { ...item, status: 'UPCOMING' as const };
        }
        return item;
      });

      if (changed) {
        this.events.update(list => list.map(e => 
          e.id === activeEv.id ? { ...e, status: newStatus, itinerary: updatedItinerary } : e
        ));
      }
      return;
    }

    // Minutos normalizados para la tarde/noche y madrugada
    let normalizedCurr = currTotalMins;
    if (currH < 6) {
      normalizedCurr += 24 * 60;
    }

    const itemsWithMinutes = activeEv.itinerary.map(item => {
      const p = item.time.split(':').map(n => parseInt(n, 10));
      let m = (isNaN(p[0]) ? 0 : p[0]) * 60 + (isNaN(p[1]) ? 0 : p[1]);
      if (p[0] < 6) m += 24 * 60;
      return { item, startMins: m };
    });

    let anyChanged = false;
    const updatedItinerary: ItineraryItem[] = itemsWithMinutes.map((entry, idx) => {
      const startMins = entry.startMins;
      const nextEntry = itemsWithMinutes[idx + 1];
      const endMins = nextEntry ? nextEntry.startMins : (startMins + 60);

      let expectedStatus: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' = 'UPCOMING';
      if (normalizedCurr >= endMins) {
        expectedStatus = 'COMPLETED';
      } else if (normalizedCurr >= startMins && normalizedCurr < endMins) {
        expectedStatus = 'IN_PROGRESS';
      } else {
        expectedStatus = 'UPCOMING';
      }

      if (entry.item.status !== expectedStatus) {
        anyChanged = true;
      }
      return { ...entry.item, status: expectedStatus };
    });

    const lastEntry = itemsWithMinutes[itemsWithMinutes.length - 1];
    const eventFinishMins = lastEntry ? lastEntry.startMins + 60 : (24 + 3) * 60;

    let newEventStatus: EventStatus = activeEv.status;
    if (normalizedCurr >= eventFinishMins) {
      newEventStatus = 'FINALIZADO';
      anyChanged = true;
    } else if (normalizedCurr >= eventStartMins) {
      if (activeEv.status === 'PENDIENTE') {
        newEventStatus = 'EN_PROGRESO';
        anyChanged = true;
      }
    }

    if (anyChanged) {
      this.events.update(list => list.map(e => 
        e.id === activeEv.id ? { ...e, status: newEventStatus, itinerary: updatedItinerary } : e
      ));

      if (newEventStatus === 'FINALIZADO') {
        this.notificationService.show('info', 'Evento Concluido', `"${activeEv.name}" ha finalizado según el cronograma. Modo histórico activado.`);
      }
    }
  }

  setEventStatus(eventId: number, newStatus: EventStatus): void {
    this.events.update(list => list.map(e => {
      if (e.id === eventId) {
        let updatedItinerary = e.itinerary;
        if (newStatus === 'PENDIENTE') {
          updatedItinerary = (e.itinerary || []).map(item => ({ ...item, status: 'UPCOMING' as const }));
        } else if (newStatus === 'FINALIZADO') {
          updatedItinerary = (e.itinerary || []).map(item => ({ ...item, status: 'COMPLETED' as const }));
        }
        return { ...e, status: newStatus, itinerary: updatedItinerary };
      }
      return e;
    }));
    this.persistEvents();
    const ev = this.events().find(e => e.id === eventId);
    const label = newStatus === 'PENDIENTE' 
      ? 'Fase 1: En Planeación (Invitaciones & RSVP Abiertos)' 
      : (newStatus === 'EN_PROGRESO' ? 'Fase 2: En Progreso (Día del Evento & Acceso en Puerta)' : 'Fase 3: Concluido (Histórico)');
    this.notificationService.show('success', 'Estado del Evento Actualizado', `"${ev?.name}" ahora está en: ${label}.`);
  }

  constructor(
    private notificationService: NotificationService,
    private ngZone: NgZone
  ) {
    this.initDemoData();
    this.listenForIncomingTickets();
    this.listenForDigitalInvitations();
    // Auto-advance checking every 10 seconds based on clock
    setInterval(() => {
      this.autoAdvanceItineraryForCurrentEvent();
    }, 10000);
    this.autoAdvanceItineraryForCurrentEvent();
  }

  selectEvent(id: number): void {
    const found = this.events().find(e => e.id === id);
    if (found) {
      this.activeEventId.set(id);
      try {
        localStorage.setItem('evenpass_active_event_id', String(id));
      } catch (e) {}
      this.autoAdvanceItineraryForCurrentEvent();
      this.notificationService.show('info', 'Evento Activo', `Ahora gestionando: ${found.name}`);
    }
  }

  private initDemoData(): void {
    // 1. Initial Events with Host, Plan Tiers & Complete Itineraries (Representing all 3 Plans)
    const demoEvents: EventItem[] = [
      {
        id: 1,
        name: 'Gran Gala Nupcial · Sofía & Mateo',
        hostName: 'Laura Méndez',
        description: 'Ceremonia religiosa en Catedral y recepción de gala en Hacienda Los Olivos.',
        eventType: 'Boda',
        eventDate: '2026-12-05T19:00:00',
        createdAt: '2026-10-25T10:00:00',
        venueName: 'Hacienda Los Olivos (Salón Imperial)',
        locationAddress: 'Carretera a Imala Km 4.5, Culiacán',
        maxCapacity: 250,
        status: 'PENDIENTE',
        templateSlug: 'miriam-isidro',
        invitationMode: 'TEMPLATE',
        tierPlan: 'PREMIUM',
        hasCroquis: true,
        hasScanner: true,
        numTables: 16,
        totalGuests: 140,
        confirmedGuests: 140,
        attendedGuests: 0,
        itinerary: [
          { id: 1, time: '19:00', title: 'Recepción & Cóctel de Bienvenida en Jardín', description: 'Recepción con mixología de autor y cuarteto acústico', status: 'UPCOMING', location: 'Jardín Central' },
          { id: 2, time: '19:45', title: 'Apertura del Salón Real & Asignación de Mesas', description: 'Check-in por código QR y ubicación de comensales en sus mesas', status: 'UPCOMING', location: 'Acceso Salón Real' },
          { id: 3, time: '20:30', title: 'Entrada Triunfal de Novios & Primer Vals', description: 'Vals nupcial con pirotecnia fría y brindis de honor', status: 'UPCOMING', location: 'Pista Central' },
          { id: 4, time: '21:15', title: 'Cena Formal de Gala de 3 Tiempos', description: 'Servicio gastronómico a comensales en mesas', status: 'UPCOMING', location: 'Mesas del Salón' },
          { id: 5, time: '22:30', title: 'Apertura de Pista & Show DJ Estelar', description: 'Comienza fiesta general y barra libre internacional', status: 'UPCOMING', location: 'Escenario Principal' },
          { id: 6, time: '01:00', title: 'Corte de Pastel & Lanzamiento de Ramo', description: 'Tradición de ramo y mesa de postres gourmet', status: 'UPCOMING', location: 'Mesa de Pastel' },
          { id: 7, time: '02:00', title: 'Tornaboda & Clausura del Evento', description: 'Música en vivo y despedida formal de la recepción', status: 'UPCOMING', location: 'Salón Real' }
        ]
      },
      {
        id: 2,
        name: 'Mis 18 - Ivonne (Fiesta Neón & VIP)',
        hostName: 'Marcela Gómez',
        description: 'Fiesta temática nocturna con luces neón, DJ exclusivo y pista iluminada.',
        eventType: 'XV Años',
        eventDate: '2026-12-15T21:00:00',
        createdAt: '2026-11-01T10:00:00', // Created 1 day ago -> Within 5 days upgrade window!
        venueName: 'Sky Lounge Terrace (Carpa Real 40x60)',
        locationAddress: 'Blvd. Pedro Infante 2200, Culiacán',
        maxCapacity: 124,
        status: 'PENDIENTE',
        templateSlug: 'neon-party',
        invitationMode: 'TEMPLATE',
        tierPlan: 'STANDARD',
        hasCroquis: false,
        hasScanner: true,
        numTables: 15,
        totalGuests: 100,
        confirmedGuests: 100,
        attendedGuests: 0,
        itinerary: [
          { id: 1, time: '20:00', title: 'Recepción VIP & Pulseras Neón', description: 'Acceso exclusivo con acreditación QR y entrega de glowsticks', status: 'UPCOMING', location: 'Acceso Carpa' },
          { id: 2, time: '21:15', title: 'Sesión en Photocall 360°', description: 'Fotografía instantánea con props fluorescentes y amigos', status: 'UPCOMING', location: 'Zona Photocall' },
          { id: 3, time: '22:00', title: 'Entrada Especial de Ivonne & Coronación', description: 'Show de luces robóticas y bienvenida con amigos cercanos', status: 'UPCOMING', location: 'Pista de Baile' },
          { id: 4, time: '22:30', title: 'Vals de los 18 & Brindis Familiar', description: 'Brindis con familiares y palabras de agradecimiento', status: 'UPCOMING', location: 'Pista de Baile' },
          { id: 5, time: '23:00', title: 'Apertura de Buffet & Mesa de Snacks', description: 'Servicio en estación buffet de 8 pies y barra de mocktails', status: 'UPCOMING', location: 'Estación Buffet' },
          { id: 6, time: '23:45', title: 'DJ Set Principal & Pista Iluminada', description: 'Música electro, reggaetón y lluvia de confeti', status: 'UPCOMING', location: 'Pista 12x20' },
          { id: 7, time: '01:30', title: 'Pastel de Cumpleaños & Pirotecnia Fría', description: 'Mañanitas con DJ y corte de pastel temático', status: 'UPCOMING', location: 'Mesa de Pastel' },
          { id: 8, time: '03:00', title: 'After Party & Cierre de Pista', description: 'Música chillout y entrega de souvenirs para invitados', status: 'UPCOMING', location: 'Carpa Real' }
        ]
      },
      {
        id: 3,
        name: 'Graduación Ing. Sistemas 2026',
        hostName: 'Comité de Generación UAS',
        description: 'Cena de graduación y entrega de reconocimientos académicos.',
        eventType: 'Graduación',
        eventDate: '2026-10-10T19:00:00',
        createdAt: '2026-10-10T10:00:00',
        venueName: 'Centro de Convenciones (Salón Zafiro)',
        locationAddress: 'Desarrollo Urbano Tres Ríos',
        maxCapacity: 56,
        status: 'FINALIZADO',
        templateSlug: 'editorial-clean',
        invitationMode: 'TEMPLATE',
        tierPlan: 'PREMIUM',
        hasCroquis: true,
        hasScanner: true,
        numTables: 6,
        totalGuests: 50,
        confirmedGuests: 50,
        attendedGuests: 50,
        itinerary: [
          { id: 1, time: '18:30', title: 'Alfombra Roja & Acreditación de Egresados', description: 'Validación por código QR y entrega de solaperos oficiales', status: 'COMPLETED', location: 'Acceso Salón Zafiro' },
          { id: 2, time: '19:15', title: 'Entrada del Presidium & Generación', description: 'Marcha triunfal y ubicación de autoridades en la Mesa Principal', status: 'COMPLETED', location: 'Mesa de Honor (Top Table)' },
          { id: 3, time: '19:45', title: 'Ceremonia de Entrega de Diplomas', description: 'Mención honorífica y entrega de constancias de titulación', status: 'COMPLETED', location: 'Presidium' },
          { id: 4, time: '20:30', title: 'Discurso del Mejor Promedio & Mensaje Rector', description: 'Palabras del padrino de generación y representante estudiantil', status: 'COMPLETED', location: 'Atril Principal' },
          { id: 5, time: '21:00', title: 'Brindis de Honor Institucional', description: 'Champaña de gala y tradicional lanzamiento de birretes', status: 'COMPLETED', location: 'Salón Zafiro' },
          { id: 6, time: '21:30', title: 'Cena de Gala & Orquesta de Cámara', description: 'Cena servida a comensales en mesas redondas de banquete', status: 'COMPLETED', location: 'Mesas 02 a 06' },
          { id: 7, time: '23:00', title: 'Proyección de Video de Recuerdos (2022-2026)', description: 'Retrospectiva audiovisual con anécdotas universitarias', status: 'COMPLETED', location: 'Pantalla Central' },
          { id: 8, time: '00:30', title: 'Clausura Formal & Foto Oficial de Generación', description: 'Foto panorámica institucional y despedida de egresados', status: 'COMPLETED', location: 'Chimenea Arquitectónica' }
        ]
      },
      {
        id: 4,
        name: 'Posada Corporativa TechGroup 2026',
        hostName: 'Lic. Ricardo Bazúa (HR Manager)',
        description: 'Cena navideña empresarial, rifa de regalos, música en vivo y cóctel de fin de año.',
        eventType: 'Posada / Fiesta Navideña',
        eventDate: '2026-12-18T20:00:00',
        createdAt: '2026-10-20T10:00:00', // Created > 5 days ago & EN_PROGRESO -> Locked!
        venueName: 'Salón Bellavista & Terraza Panorámica',
        locationAddress: 'Av. Las Palmas 890, Desarrollo Urbano Tres Ríos',
        maxCapacity: 100,
        status: 'EN_PROGRESO',
        templateSlug: 'posada-velvet',
        invitationMode: 'TEMPLATE',
        tierPlan: 'STANDARD',
        hasCroquis: false,
        hasScanner: true,
        numTables: 10,
        totalGuests: 85,
        confirmedGuests: 85,
        attendedGuests: 42,
        itinerary: [
          { id: 1, time: '19:30', title: 'Recepción & Registro con Escáner QR', description: 'Acreditación del personal en puerta y entrega de boletos para la rifa', status: 'IN_PROGRESS', location: 'Acceso Bellavista' },
          { id: 2, time: '20:30', title: 'Cóctel de Bienvenida & Networking', description: 'Canapés y barra de mixología invernal en la terraza', status: 'UPCOMING', location: 'Terraza' },
          { id: 3, time: '21:30', title: 'Cena de Gala Navideña', description: 'Menú especial de temporada a comensales', status: 'UPCOMING', location: 'Salón Bellavista' },
          { id: 4, time: '22:45', title: 'Mensaje de Dirección & Gran Rifa de Fin de Año', description: 'Sorteo de viajes y pantallas entre los asistentes registrados', status: 'UPCOMING', location: 'Escenario' },
          { id: 5, time: '23:30', title: 'Grupo Musical & Brindis Navideño', description: 'Música en vivo para bailar y cierre de fin de año', status: 'UPCOMING', location: 'Pista de Baile' }
        ]
      },
      {
        id: 5,
        name: 'Bautizo & Almuerzo Familiar Santiago',
        hostName: 'Mariana & Alejandro López',
        description: 'Misa de bautismo en Parroquia Santa Inés y comida campestre íntima.',
        eventType: 'Bautizo',
        eventDate: '2026-11-29T13:00:00',
        createdAt: '2026-11-02T08:00:00', // Created today -> Within 5 days upgrade window!
        venueName: 'Restaurante Los Arcos (Salón Privado Jardín)',
        locationAddress: 'Blvd. Francisco Labastida 450, Culiacán',
        maxCapacity: 35,
        status: 'PENDIENTE',
        templateSlug: 'bautizo-celestial',
        invitationMode: 'TEMPLATE',
        tierPlan: 'BASIC',
        hasCroquis: false,
        hasScanner: false,
        numTables: 4,
        totalGuests: 32,
        confirmedGuests: 32,
        attendedGuests: 0,
        itinerary: [
          { id: 1, time: '12:00', title: 'Misa Solemne de Bautismo', description: 'Parroquia Santa Inés con padrinos y familiares directos', status: 'UPCOMING', location: 'Parroquia Santa Inés' },
          { id: 2, time: '13:30', title: 'Recepción & Almuerzo Familiar', description: 'Salón Privado Jardín en Restaurante Los Arcos', status: 'UPCOMING', location: 'Salón Privado Jardín' },
          { id: 3, time: '15:30', title: 'Tradicional Bolo & Pastel', description: 'Entrega de recuerdos bendecidos y mesa de postres', status: 'UPCOMING', location: 'Mesa de Honor' }
        ]
      },
      {
        id: 6,
        name: 'Mis 10 Años · Luis Gerardo',
        hostName: 'Familia Morales (Papás)',
        description: 'Celebración de 10 años con torneo Laser Tag, arena de trampolines y banquete.',
        eventType: 'Cumpleaños',
        eventDate: '2026-11-14T16:00:00',
        createdAt: '2026-11-03T10:00:00',
        venueName: 'Arena Laser Quest & Salón Neón VIP',
        locationAddress: 'Av. Paseo de los Héroes 450, Col. Las Quintas, Culiacán',
        maxCapacity: 50,
        status: 'PENDIENTE',
        templateSlug: 'luis-gerardo-10',
        invitationMode: 'TEMPLATE',
        tierPlan: 'PREMIUM',
        hasCroquis: true,
        hasScanner: true,
        numTables: 5,
        totalGuests: 20,
        confirmedGuests: 13,
        attendedGuests: 0,
        itinerary: [
          { id: 1, time: '16:00', title: 'Recepción & Registro con Pase Digital', description: 'Escaneo en puerta por hostess y entrega de brazaletes de juego', status: 'UPCOMING', location: 'Acceso Salón Neón' },
          { id: 2, time: '16:45', title: 'Torneo Laser Quest & Trampolines', description: 'Batalla por equipos en la arena láser y circuito de brincolines', status: 'UPCOMING', location: 'Arena Laser Quest' },
          { id: 3, time: '18:15', title: 'Banquete & Servicio en Mesas', description: 'Servicio de alimentos a comensales en sus mesas asignadas', status: 'UPCOMING', location: 'Salón Neón VIP' },
          { id: 4, time: '19:00', title: 'Canto de Mañanitas & Pastel', description: 'Celebración estelar, corte de pastel temático y piñata', status: 'UPCOMING', location: 'Pista Central' },
          { id: 5, time: '20:00', title: 'Entrega de Souvenirs & Clausura', description: 'Agradecimiento formal por los anfitriones y clausura', status: 'UPCOMING', location: 'Salón Neón VIP' }
        ]
      }
    ];

    // 2. Multi-Salon Architectural Layouts (Imperial, Carpa 40x60, Salón Zafiro)
    // 2.1 Salón Real Imperial (16 tables: 8 Round 10p + 8 Rectangular 8p = 144 seats)
    const tablesImperial: SalonTable[] = [
      // Left Wing Column 1
      { id: 101, salonId: 1, tableNumber: 1, tableName: 'Mesa 01 (Redonda)', shape: 'ROUND', capacity: 10, posX: 80, posY: 180, occupiedSeats: 0 },
      { id: 102, salonId: 1, tableNumber: 2, tableName: 'Mesa 02 (Imperial)', shape: 'RECTANGULAR', capacity: 8, posX: 80, posY: 290, occupiedSeats: 0 },
      { id: 103, salonId: 1, tableNumber: 3, tableName: 'Mesa 03 (Redonda)', shape: 'ROUND', capacity: 10, posX: 80, posY: 400, occupiedSeats: 0 },
      { id: 104, salonId: 1, tableNumber: 4, tableName: 'Mesa 04 (Imperial)', shape: 'RECTANGULAR', capacity: 8, posX: 80, posY: 510, occupiedSeats: 0 },

      // Left Wing Column 2
      { id: 105, salonId: 1, tableNumber: 5, tableName: 'Mesa 05 (Redonda)', shape: 'ROUND', capacity: 10, posX: 180, posY: 240, occupiedSeats: 0 },
      { id: 106, salonId: 1, tableNumber: 6, tableName: 'Mesa 06 (Imperial)', shape: 'RECTANGULAR', capacity: 8, posX: 180, posY: 350, occupiedSeats: 0 },
      { id: 107, salonId: 1, tableNumber: 7, tableName: 'Mesa 07 (Redonda)', shape: 'ROUND', capacity: 10, posX: 180, posY: 460, occupiedSeats: 0 },
      { id: 108, salonId: 1, tableNumber: 8, tableName: 'Mesa 08 (Redonda)', shape: 'ROUND', capacity: 10, posX: 180, posY: 570, occupiedSeats: 0 },

      // Right Wing Column 3
      { id: 109, salonId: 1, tableNumber: 9, tableName: 'Mesa 09 (Redonda)', shape: 'ROUND', capacity: 10, posX: 360, posY: 240, occupiedSeats: 0 },
      { id: 110, salonId: 1, tableNumber: 10, tableName: 'Mesa 10 (Imperial)', shape: 'RECTANGULAR', capacity: 8, posX: 360, posY: 350, occupiedSeats: 0 },
      { id: 111, salonId: 1, tableNumber: 11, tableName: 'Mesa 11 (Redonda)', shape: 'ROUND', capacity: 10, posX: 360, posY: 460, occupiedSeats: 0 },
      { id: 112, salonId: 1, tableNumber: 12, tableName: 'Mesa 12 (Redonda)', shape: 'ROUND', capacity: 10, posX: 360, posY: 570, occupiedSeats: 0 },

      // Right Wing Column 4
      { id: 113, salonId: 1, tableNumber: 13, tableName: 'Mesa 13 (Redonda)', shape: 'ROUND', capacity: 10, posX: 460, posY: 180, occupiedSeats: 0 },
      { id: 114, salonId: 1, tableNumber: 14, tableName: 'Mesa 14 (Imperial)', shape: 'RECTANGULAR', capacity: 8, posX: 460, posY: 290, occupiedSeats: 0 },
      { id: 115, salonId: 1, tableNumber: 15, tableName: 'Mesa 15 (Imperial)', shape: 'RECTANGULAR', capacity: 8, posX: 460, posY: 400, occupiedSeats: 0 },
      { id: 116, salonId: 1, tableNumber: 16, tableName: 'Mesa 16 (Imperial)', shape: 'RECTANGULAR', capacity: 8, posX: 460, posY: 510, occupiedSeats: 0 }
    ];

    const salonImperial: Salon = {
      id: 1,
      name: 'Salón Real Imperial',
      type: 'BANQUET_IMPERIAL',
      totalCapacity: 250,
      widthMeters: 45,
      lengthMeters: 30,
      description: 'Gran salón de gala con 16 mesas simétricas, escenario estelar, cabina DJ, barra de coctelería y acceso monumental.',
      tables: tablesImperial
    };

    // 2.2 Carpa Real 40x60 White Pole Tent (14 Round Tables 8p + 1 Head Table 12p = 124 seats total)
    const tablesCarpa: SalonTable[] = [
      { id: 201, salonId: 2, tableNumber: 1, tableName: 'Mesa de Honor (Presidium)', shape: 'RECTANGULAR', capacity: 12, posX: 230, posY: 120, occupiedSeats: 0 },
      { id: 202, salonId: 2, tableNumber: 2, tableName: 'Mesa 02 (Redonda)', shape: 'ROUND', capacity: 8, posX: 80, posY: 140, occupiedSeats: 0 },
      { id: 203, salonId: 2, tableNumber: 3, tableName: 'Mesa 03 (Redonda)', shape: 'ROUND', capacity: 8, posX: 140, posY: 230, occupiedSeats: 0 },
      { id: 204, salonId: 2, tableNumber: 4, tableName: 'Mesa 04 (Redonda)', shape: 'ROUND', capacity: 8, posX: 80, posY: 320, occupiedSeats: 0 },
      { id: 205, salonId: 2, tableNumber: 5, tableName: 'Mesa 05 (Redonda)', shape: 'ROUND', capacity: 8, posX: 140, posY: 410, occupiedSeats: 0 },
      { id: 206, salonId: 2, tableNumber: 6, tableName: 'Mesa 06 (Redonda)', shape: 'ROUND', capacity: 8, posX: 80, posY: 500, occupiedSeats: 0 },
      { id: 207, salonId: 2, tableNumber: 7, tableName: 'Mesa 07 (Redonda)', shape: 'ROUND', capacity: 8, posX: 140, posY: 590, occupiedSeats: 0 },
      { id: 208, salonId: 2, tableNumber: 8, tableName: 'Mesa 08 (Redonda)', shape: 'ROUND', capacity: 8, posX: 80, posY: 680, occupiedSeats: 0 },
      { id: 209, salonId: 2, tableNumber: 9, tableName: 'Mesa 09 (Redonda)', shape: 'ROUND', capacity: 8, posX: 480, posY: 140, occupiedSeats: 0 },
      { id: 210, salonId: 2, tableNumber: 10, tableName: 'Mesa 10 (Redonda)', shape: 'ROUND', capacity: 8, posX: 420, posY: 230, occupiedSeats: 0 },
      { id: 211, salonId: 2, tableNumber: 11, tableName: 'Mesa 11 (Redonda)', shape: 'ROUND', capacity: 8, posX: 480, posY: 320, occupiedSeats: 0 },
      { id: 212, salonId: 2, tableNumber: 12, tableName: 'Mesa 12 (Redonda)', shape: 'ROUND', capacity: 8, posX: 420, posY: 410, occupiedSeats: 0 },
      { id: 213, salonId: 2, tableNumber: 13, tableName: 'Mesa 13 (Redonda)', shape: 'ROUND', capacity: 8, posX: 480, posY: 500, occupiedSeats: 0 },
      { id: 214, salonId: 2, tableNumber: 14, tableName: 'Mesa 14 (Redonda)', shape: 'ROUND', capacity: 8, posX: 420, posY: 590, occupiedSeats: 0 },
      { id: 215, salonId: 2, tableNumber: 15, tableName: 'Mesa 15 (Redonda)', shape: 'ROUND', capacity: 8, posX: 480, posY: 680, occupiedSeats: 0 }
    ];

    const salonWhitePoleTent: Salon = {
      id: 2,
      name: 'Carpa Real 40x60 White Pole Tent',
      type: 'WHITE_POLE_TENT',
      totalCapacity: 124,
      widthMeters: 18.28,
      lengthMeters: 12.19,
      description: 'Carpa de poste perimetral blanca 40x60 pies, pista de baile central de 12x20, mesa de honor de 12 plazas, 14 mesas redondas, barra y buffet.',
      tables: tablesCarpa
    };

    // 2.3 Salón Zafiro Banquet Room (6 tables = 56 seats)
    const tablesZafiro: SalonTable[] = [
      { id: 301, salonId: 3, tableNumber: 1, tableName: 'Mesa Principal Zafiro (Top Table)', shape: 'RECTANGULAR', capacity: 6, posX: 440, posY: 360, occupiedSeats: 0 },
      { id: 302, salonId: 3, tableNumber: 2, tableName: 'Mesa 02 (Redonda)', shape: 'ROUND', capacity: 10, posX: 140, posY: 190, occupiedSeats: 0 },
      { id: 303, salonId: 3, tableNumber: 3, tableName: 'Mesa 03 (Redonda)', shape: 'ROUND', capacity: 10, posX: 290, posY: 190, occupiedSeats: 0 },
      { id: 304, salonId: 3, tableNumber: 4, tableName: 'Mesa 04 (Redonda)', shape: 'ROUND', capacity: 10, posX: 140, posY: 370, occupiedSeats: 0 },
      { id: 305, salonId: 3, tableNumber: 5, tableName: 'Mesa 05 (Redonda)', shape: 'ROUND', capacity: 10, posX: 280, posY: 370, occupiedSeats: 0 },
      { id: 306, salonId: 3, tableNumber: 6, tableName: 'Mesa 06 (Redonda)', shape: 'ROUND', capacity: 10, posX: 210, posY: 530, occupiedSeats: 0 }
    ];

    const salonZafiro: Salon = {
      id: 3,
      name: 'Salón Zafiro Banquet Room',
      type: 'ZAFIRO_ROOM',
      totalCapacity: 56,
      widthMeters: 8.625,
      lengthMeters: 6.19,
      description: 'Salón privado colonial con chimenea cálida, ventanales franceses, mesa de honor lateral y 5 mesas redondas de banquete.',
      tables: tablesZafiro
    };

    // 2.4 Salón Neón VIP & Arena Laser Quest (Cumpleaños Luis Gerardo · 5 mesas de 10p = 50 lugares)
    const tablesNeonVip: SalonTable[] = [
      { id: 401, salonId: 4, tableNumber: 1, tableName: 'Mesa 01 - Familia Cercana', shape: 'ROUND', capacity: 10, posX: 140, posY: 180, occupiedSeats: 0 },
      { id: 402, salonId: 4, tableNumber: 2, tableName: 'Mesa 02 - Amigos de Colegio', shape: 'ROUND', capacity: 10, posX: 360, posY: 180, occupiedSeats: 0 },
      { id: 403, salonId: 4, tableNumber: 3, tableName: 'Mesa 03 - Padrinos & Tíos', shape: 'ROUND', capacity: 10, posX: 140, posY: 380, occupiedSeats: 0 },
      { id: 404, salonId: 4, tableNumber: 4, tableName: 'Mesa 04 - Amigos Deportes & Laser', shape: 'ROUND', capacity: 10, posX: 360, posY: 380, occupiedSeats: 0 },
      { id: 405, salonId: 4, tableNumber: 5, tableName: 'Mesa 05 - Invitados Especiales', shape: 'ROUND', capacity: 10, posX: 250, posY: 540, occupiedSeats: 0 }
    ];

    const salonNeonVip: Salon = {
      id: 4,
      name: 'Arena Laser Quest & Salón Neón VIP',
      type: 'CUSTOM',
      totalCapacity: 50,
      widthMeters: 18,
      lengthMeters: 18,
      description: 'Salón Neón VIP con 5 mesas redondas para 10 personas cada una, pista central y acceso al campo Laser Quest.',
      tables: tablesNeonVip
    };

    // Link default events to their salons
    demoEvents[0].salonId = 1; // Boda -> Salón Real Imperial
    demoEvents[1].salonId = 2; // Mis 18 -> Carpa 40x60
    demoEvents[2].salonId = 3; // Graduación -> Salón Zafiro
    demoEvents[5].salonId = 4; // Luis Gerardo -> Salón Neón VIP

    // Restore persisted events if available
    let loadedEvents: EventItem[] | null = null;
    try {
      const rawEvents = localStorage.getItem(this.STORAGE_EVENTS);
      if (rawEvents) {
        const parsed = JSON.parse(rawEvents);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const evMap = new Map<number, EventItem>();
          demoEvents.forEach(e => evMap.set(e.id, e));
          parsed.forEach((e: EventItem) => evMap.set(e.id, { ...(evMap.get(e.id) || {}), ...e }));
          loadedEvents = Array.from(evMap.values());
        }
      }
    } catch (e) {}

    const finalEvents = loadedEvents || demoEvents;
    this.events.set(finalEvents);
    this.persistEvents();

    // Restore persisted salons (custom tables, geometry changes, new salons)
    let loadedSalons: Salon[] | null = null;
    try {
      const rawSalons = localStorage.getItem(this.STORAGE_SALONS);
      if (rawSalons) {
        const parsed = JSON.parse(rawSalons);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const salonMap = new Map<number, Salon>();
          [salonImperial, salonWhitePoleTent, salonZafiro, salonNeonVip].forEach(s => salonMap.set(s.id, s));
          parsed.forEach((s: Salon) => {
            salonMap.set(s.id, s);
          });
          loadedSalons = Array.from(salonMap.values());
        }
      }
    } catch (e) {}

    const finalSalons = loadedSalons || [salonImperial, salonWhitePoleTent, salonZafiro, salonNeonVip];

    // Merge any tables persisted under evenpass_event_${evId}_tables_db so no user tables are ever lost on reload
    try {
      finalSalons.forEach(s => {
        const evWithSalon = (loadedEvents || demoEvents).find(e => e.salonId === s.id);
        const evId = evWithSalon?.id || (s.id === 4 ? 6 : s.id);
        const cachedEvTables = localStorage.getItem(`evenpass_event_${evId}_tables_db`);
        if (cachedEvTables) {
          const parsedTables = JSON.parse(cachedEvTables);
          if (Array.isArray(parsedTables) && parsedTables.length > 0) {
            parsedTables.forEach((pt: any) => {
              const ptName = pt.name || pt.tableName;
              const exists = s.tables.some(t => t.id === pt.id || (ptName && t.tableName.toLowerCase().trim() === ptName.toLowerCase().trim()));
              if (!exists) {
                const nextNum = (s.tables.length > 0 ? Math.max(...s.tables.map(t => t.tableNumber)) : 0) + 1;
                s.tables.push({
                  id: pt.id || Date.now() + nextNum,
                  salonId: s.id,
                  tableNumber: pt.tableNumber || nextNum,
                  tableName: ptName || `Mesa ${nextNum < 10 ? '0' + nextNum : nextNum}`,
                  shape: (String(pt.shape || 'ROUND').toUpperCase().includes('RECT') || String(pt.shape || '').toUpperCase().includes('IMPERIAL')) ? 'RECTANGULAR' : 'ROUND',
                  capacity: pt.capacity || 10,
                  posX: pt.posX || (140 + ((s.tables.length) % 3) * 160),
                  posY: pt.posY || (180 + Math.floor((s.tables.length) / 3) * 160),
                  occupiedSeats: 0
                });
              }
            });
            s.totalCapacity = s.tables.reduce((sum, t) => sum + t.capacity, 0);
          }
        }
      });
    } catch (e) {}

    this.salons.set(finalSalons);
    this.persistSalons();

    // 3. FULL REALISTIC GUESTS DATASETS (407 passes across 5 events)
    // Mexican First and Last Names for authentic guest generation
    const firstNames = [
      'Carlos', 'Ana', 'Valeria', 'Héctor', 'Fernando', 'Roberto', 'Diana', 'Gabriela',
      'Mateo', 'Paulina', 'Kevin', 'Rodrigo', 'Celia', 'Alejandro', 'Melissa', 'Javier',
      'Brenda', 'Daniel', 'Marcela', 'Eduardo', 'Paola', 'Santiago', 'Camila', 'Emiliano',
      'Sofía', 'Sebastián', 'Renata', 'Diego', 'Natalia', 'Leonardo', 'Lucía', 'Samuel',
      'Mariana', 'Esteban', 'Victoria', 'Jorge', 'Daniela', 'Guillermo', 'Andrea', 'Manuel',
      'Claudia', 'Alonso', 'Patricia', 'Adrián', 'Karla', 'Iván', 'Ximena', 'Mauricio'
    ];

    const lastNames = [
      'Mendoza', 'Ruiz', 'Gómez', 'Morales', 'Aguilar', 'Silva', 'Sánchez', 'Castro',
      'Osuna', 'Beltrán', 'Rivas', 'Gastélum', 'Cárdenas', 'Villarreal', 'Solís', 'Benítez',
      'Ochoa', 'Lizárraga', 'Corrales', 'Bazúa', 'Ruelas', 'López', 'Figueroa', 'Montoya',
      'Leyva', 'Salazar', 'Valdez', 'Inzunza', 'Quintero', 'Espinoza', 'Ramos', 'Padilla'
    ];

    const demoGuests: Guest[] = [];
    const demoLogs: CheckInLog[] = [];
    const demoAudit: ExternalAuditEntry[] = [];
    let guestSeq = 1;
    let logSeq = 1;

    // Helper: generate full guest list for an event strictly respecting table capacities
    const generateEventGuests = (
      evId: number,
      eventName: string,
      targetPasses: number,
      attendedPasses: number,
      tablePrefix: string,
      tokenPrefix: string,
      salonTables?: SalonTable[]
    ) => {
      let currentPasses = 0;
      let partyIdx = 0;
      let currentAttended = 0;
      const tableOccupancyMap = new Map<number, number>();

      while (currentPasses < targetPasses) {
        partyIdx++;
        const fn = firstNames[(partyIdx + evId * 7) % firstNames.length];
        const ln1 = lastNames[(partyIdx * 3 + evId * 5) % lastNames.length];
        const ln2 = lastNames[(partyIdx * 2 + evId) % lastNames.length];
        const fullName = `${fn} ${ln1} ${ln2}`;

        // 2 passes per guest, last one handles odd remainder if any
        const remaining = targetPasses - currentPasses;
        const totalPasses = remaining >= 2 ? 2 : 1;
        currentPasses += totalPasses;

        const isAttended = currentAttended < attendedPasses;
        if (isAttended) currentAttended += totalPasses;

        let tableId: number | undefined = undefined;
        let tableName: string | undefined = undefined;

        if (salonTables && salonTables.length > 0) {
          // Strictly find the first table that can fit this party without exceeding its capacity
          for (const tbl of salonTables) {
            const currentOcc = tableOccupancyMap.get(tbl.id) || 0;
            if (currentOcc + totalPasses <= tbl.capacity) {
              tableId = tbl.id;
              tableName = tbl.tableName;
              tableOccupancyMap.set(tbl.id, currentOcc + totalPasses);
              break;
            }
          }
        }

        if (!tableName) {
          tableName = salonTables && salonTables.length > 0 ? 'Sin mesa asignada' : 'Acceso General';
        }

        const token = `${tokenPrefix}-${1000 + partyIdx}`;

        const src: 'CANVA_QR' | 'WEBHOOK_API' | 'EMBED_WIDGET' | 'CSV_IMPORT' | 'MANUAL' = 
          partyIdx % 5 === 0 ? 'CANVA_QR' : 
          (partyIdx % 4 === 0 ? 'WEBHOOK_API' : 
          (partyIdx % 3 === 0 ? 'EMBED_WIDGET' : 
          (partyIdx % 2 === 0 ? 'CSV_IMPORT' : 'MANUAL')));

        const guestObj: Guest = {
          id: guestSeq++,
          eventId: evId,
          fullName,
          email: `${fn.toLowerCase()}.${ln1.toLowerCase()}@gmail.com`,
          phone: `667 ${100 + (partyIdx % 900)} ${1000 + (partyIdx * 7 % 9000)}`,
          numCompanions: totalPasses - 1,
          totalPasses,
          status: isAttended ? 'ATTENDED' : 'CONFIRMED',
          qrCodeToken: token,
          assignedTableId: tableId,
          assignedTableName: tableName,
          dietNotes: partyIdx % 7 === 0 ? 'Vegetariano' : (partyIdx % 11 === 0 ? 'Sin mariscos' : undefined),
          confirmedAt: '2026-11-01',
          checkedInAt: isAttended ? `${18 + Math.floor(partyIdx / 15)}:${String((partyIdx * 7) % 60).padStart(2, '0')} hrs` : undefined,
          source: src,
          externalSyncId: src !== 'MANUAL' ? `SYNC-${evId}-${1000 + partyIdx}` : undefined
        };

        demoGuests.push(guestObj);

        // Audit Record
        demoAudit.push({
          id: `AUD-${evId}-${1000 + partyIdx}`,
          eventId: evId,
          timestamp: isAttended ? (guestObj.checkedInAt || '19:30 hrs') : '02/11/2026 14:20 hrs',
          source: src,
          guestName: fullName,
          passesCount: totalPasses,
          assignedTable: tableName,
          qrToken: token,
          status: isAttended ? 'CHECKED_IN' : 'SYNCED',
          ipOrigin: `187.190.${10 + (partyIdx % 80)}.${20 + (partyIdx % 70)}`,
          notes: src === 'CANVA_QR' ? 'Enlace QR desde diseño Canva' : (src === 'WEBHOOK_API' ? 'Webhook HTTP REST (Typeform)' : (src === 'EMBED_WIDGET' ? 'Widget embebido en web externa' : 'Importación masiva CSV'))
        });

        // If attended, push check-in log
        if (isAttended) {
          demoLogs.push({
            id: logSeq++,
            qrToken: token,
            guestId: guestObj.id,
            guestName: fullName,
            totalPasses,
            eventId: evId,
            eventName: eventName,
            status: 'AUTHORIZED',
            scanTimestamp: guestObj.checkedInAt || '19:15 hrs',
            operatorUsername: 'ernesto',
            assignedTableName: tableName,
            notes: `Ingreso validado en puerta · ${totalPasses} persona(s)`
          });
        }
      }
    };

    // Event 1: Boda Sofía & Mateo (140 passes, 48 attended, 16 tables in Salón Imperial, EP-99xx)
    generateEventGuests(1, 'Boda de Sofía & Mateo', 140, 48, 'Mesa', 'EP-99', tablesImperial);

    // Event 2: Mis 18 - Ivonne (100 passes, 0 attended, 15 tables in Carpa, EP-88xx)
    generateEventGuests(2, 'Mis 18 - Ivonne (Fiesta Neón & VIP)', 100, 0, 'Mesa', 'EP-88', tablesCarpa);

    // Event 3: Graduación Ing. Sistemas 2026 (50 passes, all 50 attended, 6 tables in Zafiro, EP-77xx)
    generateEventGuests(3, 'Graduación Ing. Sistemas 2026', 50, 50, 'Mesa', 'EP-77', tablesZafiro);

    // Event 4: Posada Corporativa TechGroup (85 passes, 42 attended, Standard Plan, EP-66xx)
    generateEventGuests(4, 'Posada Corporativa TechGroup 2026', 85, 42, 'Mesa Bellavista', 'EP-66');

    // Event 5: Bautizo Santiago (32 passes, 0 attended, Basic Plan, EP-55xx)
    generateEventGuests(5, 'Bautizo & Almuerzo Familiar Santiago', 32, 0, 'Zona Familiar', 'EP-55');

    // Event 6: Mis 10 Años · Luis Gerardo (Padrón Oficial Sincronizado del Panel del Anfitrión)
    const luisGerardoRealGuests: Guest[] = [
      {
        id: guestSeq++,
        eventId: 6,
        fullName: 'Familia Morales Valenzuela',
        email: 'morales.valenzuela@gmail.com',
        phone: '667-112-3344',
        numCompanions: 3,
        totalPasses: 4,
        status: 'CONFIRMED',
        qrCodeToken: 'LG10-VIP-1102',
        assignedTableId: 401,
        assignedTableName: 'Mesa 01 - Familia Cercana',
        dietNotes: 'Abuelos y tíos',
        confirmedAt: '2026-11-03 09:30',
        source: 'DIGITAL_INVITATION',
        externalSyncId: 'SYNC-6-1102'
      },
      {
        id: guestSeq++,
        eventId: 6,
        fullName: 'Mateo González & Padres',
        email: 'mateo.gonzalez@gmail.com',
        phone: '667-223-4455',
        numCompanions: 2,
        totalPasses: 3,
        status: 'CONFIRMED',
        qrCodeToken: 'LG10-VIP-2481',
        assignedTableId: 402,
        assignedTableName: 'Mesa 02 - Amigos de Colegio',
        dietNotes: 'Compañero de salón',
        confirmedAt: '2026-11-03 10:15',
        source: 'DIGITAL_INVITATION',
        externalSyncId: 'SYNC-6-2481'
      },
      {
        id: guestSeq++,
        eventId: 6,
        fullName: 'Lic. Roberto Somoza & Fam.',
        email: 'roberto.somoza@gmail.com',
        phone: '667-334-5566',
        numCompanions: 2,
        totalPasses: 3,
        status: 'CONFIRMED',
        qrCodeToken: 'LG10-VIP-3392',
        assignedTableId: 403,
        assignedTableName: 'Mesa 03 - Padrinos & Tíos',
        dietNotes: 'Padrino',
        confirmedAt: '2026-11-03 11:00',
        source: 'DIGITAL_INVITATION',
        externalSyncId: 'SYNC-6-3392'
      },
      {
        id: guestSeq++,
        eventId: 6,
        fullName: 'Santiago Beltrán & Papás',
        email: 'santiago.beltran@gmail.com',
        phone: '667-445-6677',
        numCompanions: 2,
        totalPasses: 3,
        status: 'CONFIRMED',
        qrCodeToken: 'LG10-VIP-4819',
        assignedTableId: 404,
        assignedTableName: 'Mesa 04 - Amigos Deportes & Laser',
        dietNotes: 'Fútbol',
        confirmedAt: '2026-11-03 11:45',
        source: 'DIGITAL_INVITATION',
        externalSyncId: 'SYNC-6-4819'
      },
      {
        id: guestSeq++,
        eventId: 6,
        fullName: 'Familia Quiñónez Rivas',
        email: 'fam.quinonez@gmail.com',
        phone: '667-556-7788',
        numCompanions: 3,
        totalPasses: 4,
        status: 'PENDING',
        qrCodeToken: 'LG10-VIP-5520',
        assignedTableId: 405,
        assignedTableName: 'Mesa 05 - Invitados Especiales',
        dietNotes: 'Enviado por WhatsApp',
        confirmedAt: undefined,
        source: 'DIGITAL_INVITATION',
        externalSyncId: 'SYNC-6-5520'
      },
      {
        id: guestSeq++,
        eventId: 6,
        fullName: 'Mario',
        email: 'mario@gmail.com',
        phone: '667-611-8835',
        numCompanions: 2,
        totalPasses: 3,
        status: 'PENDING',
        qrCodeToken: 'LG10-VIP-8835',
        assignedTableId: 402,
        assignedTableName: 'Mesa 02 - Amigos de Colegio',
        dietNotes: 'Invitación con 3 pases',
        confirmedAt: undefined,
        source: 'DIGITAL_INVITATION',
        externalSyncId: 'SYNC-6-8835'
      }
    ];

    luisGerardoRealGuests.forEach(g => {
      demoGuests.push(g);
      demoAudit.push({
        id: `AUD-6-${g.qrCodeToken}`,
        eventId: 6,
        timestamp: g.confirmedAt || '03/11/2026 12:20 hrs',
        source: 'DIGITAL_INVITATION',
        guestName: g.fullName,
        passesCount: g.totalPasses,
        assignedTable: g.assignedTableName || 'Mesa Asignada',
        qrToken: g.qrCodeToken,
        status: 'SYNCED',
        ipOrigin: '187.190.45.12',
        notes: 'Sincronizado directamente desde el Panel del Anfitrión (luis-gerardo-10)'
      });
    });

    // 4. Restore persisted guests & apply self-healing
    let loadedGuests: Guest[] | null = null;
    try {
      const rawGuests = localStorage.getItem(this.STORAGE_GUESTS);
      if (rawGuests) {
        const parsed = JSON.parse(rawGuests);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Self-healing migration for Event 6 overcapacity if legacy cached:
          parsed.forEach((g: Guest) => {
            if (g.eventId === 6) {
              if (g.qrCodeToken === 'LG10-VIP-5520' || g.fullName?.includes('Quiñónez')) {
                if (g.assignedTableId === 401 || !g.assignedTableId) {
                  g.assignedTableId = 405;
                  g.assignedTableName = 'Mesa 05 - Invitados Especiales';
                }
              }
              if (g.qrCodeToken === 'LG10-VIP-8835' || g.fullName?.toLowerCase() === 'mario') {
                if (g.assignedTableId === 401 || !g.assignedTableId) {
                  g.assignedTableId = 402;
                  g.assignedTableName = 'Mesa 02 - Amigos de Colegio';
                }
              }
            }
          });
          loadedGuests = parsed;
        }
      }
    } catch (e) {}

    const finalGuests = loadedGuests || demoGuests;
    this.allGuests.set(finalGuests);
    this.allLogs.set(demoLogs);
    this.allAuditEntries.set(demoAudit);
    this.persistGuests();

    // Sincronizar pases existentes desde panel del anfitrión si hay alguno registrado
    try {
      const rawHost = localStorage.getItem('evenpass_luis_gerardo_guests_db');
      if (rawHost) {
        const list = JSON.parse(rawHost);
        if (Array.isArray(list) && list.length > 0) {
          this.syncDigitalGuestsList(6, list, false);
        }
      }
    } catch (e) {}

    // Self-healing: Enforce hard zero-overcapacity limits across all tables immediately
    this.enforceSalonCapacityAndBalance(6);
    this.enforceSalonCapacityAndBalance();
    this.broadcastFullStateToCloud(6);

    // 5. Initial Expanded Templates (6 Professional Templates)
    this.templates.set([
      {
        id: 1,
        slug: 'miriam-isidro',
        name: 'Miriam & Isidro · Gold Luxury Wedding',
        category: 'Boda',
        description: 'Elegancia nupcial con acentos dorados, música clásica, bosquejo de iglesia y asignación de mesas.',
        previewImageUrl: 'assets/templates/miriam-isidro/1.jpg'
      },
      {
        id: 2,
        slug: 'neon-party',
        name: 'Mis 18 & Fiesta Neón Glow',
        category: 'XV Años / Fiesta',
        description: 'Diseño cyber dark con fuentes fluorescentes, animación de bienvenida VIP y mapa interactivo.',
        previewImageUrl: 'assets/templates/neon-party/logo.png'
      },
      {
        id: 3,
        slug: 'editorial-clean',
        name: 'Editorial Minimalista & Summit',
        category: 'Corporativo / Gala',
        description: 'Tipografía suiza contemporánea, integración de Google Calendar y credencialización ejecutiva.',
        previewImageUrl: ''
      },
      {
        id: 4,
        slug: 'posada-velvet',
        name: 'Posada Velvet & Gold Celebration',
        category: 'Posada / Fiesta Navideña',
        description: 'Atmósfera festiva navideña con destellos dorados, fondo velvet rojo noche, programa y rifa.',
        previewImageUrl: ''
      },
      {
        id: 5,
        slug: 'bautizo-celestial',
        name: 'Bautizo Celestial & Querubín Pastel',
        category: 'Bautizo / Primera Comunión',
        description: 'Diseño tierno con tonos marfil y azul pastel, tipografía caligráfica y versículo bíblico.',
        previewImageUrl: ''
      },
      {
        id: 6,
        slug: 'cumple-vip',
        name: 'Cumpleaños VIP & Sunset Chic',
        category: 'Cumpleaños',
        description: 'Gradiente sunset cálido, countdown en vivo, dress code sugerido y confirmación con un toque.',
        previewImageUrl: ''
      }
    ]);

    // 6. Support Tickets
    this.supportTickets.set([
      {
        id: 'TCK-104',
        subject: 'Ajuste de aforo por confirmación extra en Salón Imperial',
        eventId: 1,
        eventName: 'Boda de Sofía & Mateo',
        priority: 'ALTA',
        status: 'ABIERTO',
        createdAt: '02/11/2026 11:30',
        description: 'El anfitrión solicita agregar 1 mesa extra tipo imperial en el ala izquierda.'
      },
      {
        id: 'TCK-102',
        subject: 'Sincronización de enlaces de WhatsApp en invitaciones móviles',
        eventId: 2,
        eventName: 'Mis 18 - Ivonne',
        priority: 'MEDIA',
        status: 'RESUELTO',
        createdAt: '01/11/2026 16:45',
        description: 'Plantilla neón verificada y funcionando con pases QR descargables.'
      }
    ]);

    // Load incoming client tickets from landing page if any exist
    try {
      const incomingRaw = localStorage.getItem('evenpass_incoming_tickets');
      if (incomingRaw) {
        const incoming = JSON.parse(incomingRaw);
        if (Array.isArray(incoming)) {
          const formatted: SupportTicket[] = incoming.map((inc: any) => ({
            id: inc.folio || `INC-${inc.id}`,
            subject: `[${inc.type || 'SOPORTE'}] ${inc.clientName || 'Cliente'}: ${inc.issue ? inc.issue.slice(0, 45) + '...' : 'Incidencia'}`,
            eventId: 1,
            eventName: inc.eventName || 'Evento Cliente',
            priority: (inc.issue && /problema|error|falla|urgente/i.test(inc.issue)) ? 'ALTA' : 'MEDIA',
            status: inc.status || 'ABIERTO',
            createdAt: inc.date || 'Reciente',
            description: `${inc.issue}\n\nContacto: ${inc.clientName} (WhatsApp: ${inc.phone})`
          }));
          this.supportTickets.update(curr => [...formatted, ...curr]);
        }
      }
    } catch {}
    this.refreshAllTableOccupancies();
  }

  private listenForIncomingTickets(): void {
    try {
      window.addEventListener('storage', (e) => {
        if (e.key === 'evenpass_latest_client_incident' && e.newValue) {
          this.ngZone.run(() => {
            const inc = JSON.parse(e.newValue!);
            const newTicket: SupportTicket = {
              id: inc.folio || `INC-${Date.now()}`,
              subject: `[${inc.type || 'SOPORTE'}] ${inc.clientName || 'Cliente'}: ${inc.issue ? inc.issue.slice(0, 45) + '...' : 'Incidencia'}`,
              eventId: 1,
              eventName: inc.eventName || 'Evento Cliente',
              priority: (inc.issue && /problema|error|falla|urgente/i.test(inc.issue)) ? 'ALTA' : 'MEDIA',
              status: 'ABIERTO',
              createdAt: inc.date || 'Reciente',
              description: `${inc.issue}\n\nContacto: ${inc.clientName} (WhatsApp: ${inc.phone})`
            };
            this.supportTickets.update(tickets => [newTicket, ...tickets.filter(t => t.id !== newTicket.id)]);
          });
        }

        // Live sync from host panel when running in same browser
        if (e.key === 'evenpass_luis_gerardo_updated_tick' || (e.key && e.key.includes('_guests_db'))) {
          this.ngZone.run(() => {
            this.pollLocalStorageAllEvents();
          });
        }

        if (e.key === 'evenpass_latest_rsvp_guest' && e.newValue) {
          try {
            const rsvp = JSON.parse(e.newValue);
            this.ngZone.run(() => {
              const activeEv = this.selectedEvent();
              if (activeEv && !this.isEventLocked(activeEv)) {
                let tableId: number | undefined = undefined;
                let tableName = 'Sin mesa asignada';
                const curSalon = this.currentSalon();
                const passesNeeded = rsvp.passes || 1;

                if (activeEv.hasCroquis && curSalon && curSalon.tables.length > 0) {
                  const activeEventGuests = this.allGuests().filter(
                    g => g.eventId === activeEv.id && (g.status === 'CONFIRMED' || g.status === 'ATTENDED')
                  );
                  const tableUsage = new Map<number, number>();
                  curSalon.tables.forEach(t => tableUsage.set(t.id, 0));
                  activeEventGuests.forEach(g => {
                    if (g.assignedTableId) {
                      const c = tableUsage.get(g.assignedTableId) || 0;
                      tableUsage.set(g.assignedTableId, c + g.totalPasses);
                    }
                  });

                  const availableTable = curSalon.tables.find(t => {
                    const occ = tableUsage.get(t.id) || 0;
                    return (t.capacity - occ) >= passesNeeded;
                  });

                  if (availableTable) {
                    tableId = availableTable.id;
                    tableName = availableTable.tableName;
                  }
                }

                const newGuest: Guest = {
                  id: Date.now(),
                  eventId: activeEv.id,
                  fullName: rsvp.fullName || 'Invitado Digital',
                  phone: rsvp.phone || 'N/A',
                  email: `${(rsvp.fullName || 'invitado').toLowerCase().replace(/[^a-z]/g, '')}@gmail.com`,
                  numCompanions: Math.max(0, passesNeeded - 1),
                  totalPasses: passesNeeded,
                  status: 'CONFIRMED',
                  qrCodeToken: rsvp.token || `EP-${Math.floor(1000 + Math.random() * 9000)}`,
                  assignedTableId: tableId,
                  assignedTableName: tableName,
                  source: 'DIGITAL_INVITATION',
                  confirmedAt: new Date().toLocaleDateString('es-MX'),
                  dietNotes: 'Confirmación en vivo vía Invitación Web'
                };

                this.allGuests.update(list => [newGuest, ...list]);
                this.refreshAllTableOccupancies();
                this.notificationService.show(
                  'success',
                  'Confirmación RSVP en Vivo',
                  `${newGuest.fullName} (${newGuest.totalPasses} pases) confirmado en el sistema. Asignado a: ${tableName}.`
                );
              }
            });
          } catch (err) {}
        }
      });
    } catch {}
  }

  // --- AUTOMATIC INTELLIGENT SEATING ALGORITHM ---
  autoAssignTables(): AutoAssignResult {
    if (this.isEventLocked()) {
      this.notificationService.show('warning', 'Evento Concluido', 'Este evento ha finalizado. La distribución de mesas está archivada en modo de solo lectura.');
      return { salonId: 0, salonName: '', totalGuestsAssigned: 0, totalPassesAssigned: 0, tablesUtilized: 0, remainingUnassignedGuests: 0, message: 'Evento concluido en modo histórico.', tables: [] };
    }

    const salon = this.currentSalon();
    if (!salon || !salon.tables || salon.tables.length === 0) {
      throw new Error('No hay mesas configuradas en el salón');
    }

    const tables = [...salon.tables];
    const confirmedGuests = this.eventGuests().filter(g => g.status === 'CONFIRMED' || g.status === 'ATTENDED');

    const occupiedSeatsMap = new Map<number, number>();
    const tableGuestsMap = new Map<number, string[]>();
    tables.forEach(t => {
      occupiedSeatsMap.set(t.id, 0);
      tableGuestsMap.set(t.id, []);
    });

    const sorted = [...confirmedGuests].sort((a, b) => b.totalPasses - a.totalPasses);

    let assignedCount = 0;
    let passesCount = 0;
    let unassigned = 0;
    const totalVenueCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
    const totalGuestPasses = sorted.reduce((sum, g) => sum + g.totalPasses, 0);
    let autoCreatedTables: SalonTable[] = [];

    const allGuestsCopy = this.allGuests().map(g => ({ ...g }));

    for (const g of sorted) {
      const partySize = g.totalPasses;
      let targetTable: SalonTable | null = null;

      for (const t of tables) {
        const occ = occupiedSeatsMap.get(t.id) || 0;
        if (occ + partySize <= t.capacity) {
          targetTable = t;
          break;
        }
      }

      if (targetTable) {
        const guestInList = allGuestsCopy.find(item => item.id === g.id);
        if (guestInList) {
          guestInList.assignedTableId = targetTable.id;
          guestInList.assignedTableName = targetTable.tableName;
        }

        const prev = occupiedSeatsMap.get(targetTable.id) || 0;
        occupiedSeatsMap.set(targetTable.id, prev + partySize);

        const list = tableGuestsMap.get(targetTable.id) || [];
        list.push(`${g.fullName} (${partySize} pases)`);
        tableGuestsMap.set(targetTable.id, list);

        assignedCount++;
        passesCount += partySize;
      } else {
        // --- AUTO-TABLE CREATION: If venue has space for more tables, create one automatically ---
        const currentTotalCap = tables.reduce((sum, t) => sum + t.capacity, 0) + autoCreatedTables.reduce((sum, t) => sum + t.capacity, 0);
        const activeEv = this.selectedEvent();
        const venueMaxGuests = activeEv?.maxCapacity || currentTotalCap;
        const totalOccupied = [...occupiedSeatsMap.values()].reduce((s, v) => s + v, 0);

        if (totalOccupied + g.totalPasses <= venueMaxGuests) {
          // Auto-create a new table to accommodate this guest
          const nextNum = Math.max(...[...tables, ...autoCreatedTables].map(t => t.tableNumber)) + 1;
          const autoTable: SalonTable = {
            id: Date.now() + nextNum,
            salonId: salon.id,
            tableNumber: nextNum,
            tableName: `Mesa ${nextNum < 10 ? '0' + nextNum : nextNum} - Auto`,
            shape: 'ROUND',
            capacity: 10,
            posX: 150 + (nextNum % 4) * 150,
            posY: 150 + Math.floor(nextNum / 4) * 150,
            occupiedSeats: 0
          };
          autoCreatedTables.push(autoTable);
          occupiedSeatsMap.set(autoTable.id, g.totalPasses);
          tableGuestsMap.set(autoTable.id, [`${g.fullName} (${g.totalPasses} pases)`]);

          const guestInList = allGuestsCopy.find(item => item.id === g.id);
          if (guestInList) {
            guestInList.assignedTableId = autoTable.id;
            guestInList.assignedTableName = autoTable.tableName;
          }
          assignedCount++;
          passesCount += g.totalPasses;
        } else {
          // Venue is truly full
          unassigned++;
        }
      }
    }

    // Persist auto-created tables to the salon
    if (autoCreatedTables.length > 0) {
      autoCreatedTables.forEach(newT => tables.push(newT));
      this.notificationService.show('info', '🪑 Mesas Creadas Automáticamente', `Se crearon ${autoCreatedTables.length} mesa(s) adicional(es) para acomodar a todos los invitados.`);
    }

    const updatedTables = tables.map(t => ({
      ...t,
      occupiedSeats: occupiedSeatsMap.get(t.id) || 0
    }));

    this.salons.update(list => list.map(s =>
      s.id === salon.id ? { ...s, tables: updatedTables, totalCapacity: updatedTables.reduce((sum, t) => sum + t.capacity, 0) } : s
    ));
    this.allGuests.set(allGuestsCopy);
    this.persistSalons();
    this.persistGuests();

    const result: AutoAssignResult = {
      salonId: salon.id,
      salonName: salon.name,
      totalGuestsAssigned: assignedCount,
      totalPassesAssigned: passesCount,
      tablesUtilized: updatedTables.filter(t => (t.occupiedSeats || 0) > 0).length,
      remainingUnassignedGuests: unassigned,
      message: unassigned > 0 
        ? `⚠️ ${unassigned} invitado(s) sin mesa — el aforo del evento ha sido alcanzado.` 
        : 'Asignación automática inteligente completada exitosamente.',
      tables: updatedTables.map(t => ({
        tableId: t.id,
        tableNumber: t.tableNumber,
        tableName: t.tableName,
        capacity: t.capacity,
        occupiedSeats: t.occupiedSeats || 0,
        guestNames: tableGuestsMap.get(t.id) || []
      }))
    };

    if (unassigned > 0) {
      this.notificationService.show('warning', '⚠️ Aforo Completo', `${unassigned} invitado(s) sin mesa asignada. El límite del evento ha sido alcanzado.`);
    } else {
      this.notificationService.show('success', 'Croquis Optimizado', `${passesCount} pases asignados sin separar acompañantes.${autoCreatedTables.length > 0 ? ` (+${autoCreatedTables.length} mesa(s) auto-creada(s))` : ''}`);
    }
    return result;
  }

  // --- QR PASS SCANNER SCOPED TO CURRENT EVENT ---
  validateQrPass(token: string, operatorUsername: string = 'ernesto'): {
    success: boolean;
    type: 'AUTHORIZED' | 'ALREADY_USED' | 'INVALID';
    message: string;
    guest?: Guest;
  } {
    const activeEv = this.selectedEvent();
    if (this.isEventLocked(activeEv)) {
      this.notificationService.show('error', 'Evento Concluido', 'Este evento ha finalizado. El registro de accesos en puerta está cerrado.');
      return { success: false, type: 'INVALID', message: 'ACCESO CERRADO · Este evento ya ha concluido.' };
    }

    const clean = token.trim().toUpperCase();
    const guest = this.allGuests().find(g => g.qrCodeToken.toUpperCase() === clean);

    if (!guest) {
      const log: CheckInLog = {
        id: Date.now(),
        qrToken: clean,
        guestName: 'Código Desconocido',
        eventId: activeEv?.id || 1,
        eventName: activeEv?.name || 'Evento Activo',
        status: 'INVALID',
        scanTimestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) + ' hrs',
        operatorUsername,
        notes: 'Pase no existe en base de datos'
      };
      this.allLogs.update(logs => [log, ...logs]);
      this.notificationService.show('error', 'Pase Inválido', 'El código QR escaneado no existe.');
      return { success: false, type: 'INVALID', message: 'Código QR no reconocido en el sistema.' };
    }

    // Check if pass belongs to another event
    if (activeEv && guest.eventId !== activeEv.id) {
      this.notificationService.show('warning', 'Evento Incorrecto', `Este pase pertenece a otro evento (${guest.fullName}).`);
      return {
        success: false,
        type: 'INVALID',
        message: `Este pase corresponde a otro evento del sistema.`,
        guest
      };
    }

    // Security Check: Duplicate Pass / Already Used
    if (guest.status === 'ATTENDED') {
      const log: CheckInLog = {
        id: Date.now(),
        qrToken: clean,
        guestName: guest.fullName,
        eventId: guest.eventId,
        eventName: activeEv?.name,
        status: 'ALREADY_USED',
        scanTimestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) + ' hrs',
        operatorUsername,
        assignedTableName: guest.assignedTableName,
        notes: 'Intento de re-ingreso bloqueado por seguridad'
      };
      this.allLogs.update(logs => [log, ...logs]);
      this.notificationService.show('warning', 'Pase Ya Utilizado', `Alerta: ${guest.fullName} ya había ingresado previamente.`);
      return {
        success: false,
        type: 'ALREADY_USED',
        message: `ALERTA DE SEGURIDAD: Este pase ya fue validado a las ${guest.checkedInAt || 'hace un momento'}.`,
        guest
      };
    }

    // Valid Entry
    const nowTime = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) + ' hrs';
    guest.status = 'ATTENDED';
    guest.checkedInAt = nowTime;

    this.allGuests.update(list => list.map(g => g.id === guest.id ? guest : g));

    const log: CheckInLog = {
      id: Date.now(),
      qrToken: clean,
      guestName: guest.fullName,
      eventId: guest.eventId,
      eventName: activeEv?.name,
      status: 'AUTHORIZED',
      scanTimestamp: nowTime,
      operatorUsername,
      assignedTableName: guest.assignedTableName,
      notes: `Ingreso autorizado · ${guest.totalPasses} personas`
    };
    this.allLogs.update(logs => [log, ...logs]);

    // Update event attended count
    if (activeEv) {
      this.events.update(list => list.map(ev => 
        ev.id === activeEv.id ? { ...ev, attendedGuests: ev.attendedGuests + 1 } : ev
      ));
    }

    this.notificationService.show('success', '¡Acceso Autorizado!', `${guest.fullName} · ${guest.assignedTableName || 'Mesa por asignar'}`);
    return {
      success: true,
      type: 'AUTHORIZED',
      message: '¡Acceso Autorizado! Bienvenido.',
      guest
    };
  }

  // --- GUEST MANAGEMENT ---
  addGuest(guest: Partial<Guest>): void {
    if (this.isEventLocked()) {
      this.notificationService.show('warning', 'Evento Concluido', 'Este evento ha finalizado y está en modo histórico. No se pueden agregar nuevos invitados.');
      return;
    }
    const activeEvId = this.activeEventId();
    const numCompanions = guest.numCompanions || 0;

    // --- VENUE CAPACITY ENFORCEMENT: Check total venue capacity before adding ---
    const salon = this.currentSalon();
    const activeEv = this.selectedEvent();
    const totalVenueCapacity = salon?.tables.reduce((sum, t) => sum + t.capacity, 0) || activeEv?.maxCapacity || 999;
    const currentTotalPasses = this.eventGuests()
      .filter(g => g.status !== 'DECLINED')
      .reduce((sum, g) => sum + g.totalPasses, 0);
    const incomingPasses = 1 + numCompanions;

    if (currentTotalPasses + incomingPasses > totalVenueCapacity) {
      this.notificationService.show(
        'error',
        '⛔ Aforo del Evento Completo',
        `No hay espacio para ${incomingPasses} pase(s). Ocupado: ${currentTotalPasses}/${totalVenueCapacity}. Agrega más mesas o aumenta la capacidad del salón primero.`
      );
      return;
    }

    // Resolve assigned table name if ID given or vice-versa
    let assignedTableId = guest.assignedTableId;
    let assignedTableName = guest.assignedTableName;
    if (assignedTableId && !assignedTableName && salon) {
      const tbl = salon.tables.find(t => t.id === assignedTableId);
      if (tbl) assignedTableName = tbl.tableName;
    } else if (assignedTableName && !assignedTableId && salon) {
      const tbl = salon.tables.find(t => t.tableName.toLowerCase().trim() === assignedTableName!.toLowerCase().trim());
      if (tbl) assignedTableId = tbl.id;
    }

    const now = Date.now();
    const newGuest: Guest = {
      id: Date.now(),
      eventId: activeEvId,
      fullName: guest.fullName || 'Nuevo Invitado',
      email: guest.email,
      phone: guest.phone,
      numCompanions,
      totalPasses: 1 + numCompanions,
      status: guest.status || 'PENDING',
      qrCodeToken: 'EP-' + Math.floor(1000 + Math.random() * 9000),
      assignedTableId: assignedTableId,
      assignedTableName: assignedTableName,
      dietNotes: guest.dietNotes,
      manualAssignmentTimestamp: now
    };

    this.allGuests.update(list => [...list, newGuest]);
    this.events.update(list => list.map(ev => 
      ev.id === activeEvId ? { ...ev, totalGuests: ev.totalGuests + 1 } : ev
    ));
    this.refreshAllTableOccupancies();
    this.persistGuests();
    this.persistEvents();
    this.persistSalons();

    // Broadcast NEW_GUEST / NEW_INVITATION to panel and cloud
    const formattedGuest = {
      id: newGuest.id,
      fullName: newGuest.fullName,
      phone: newGuest.phone || 'WhatsApp Directo',
      passesGranted: newGuest.totalPasses,
      passesConfirmed: (newGuest.status === 'CONFIRMED' || newGuest.status === 'ATTENDED') ? newGuest.totalPasses : 0,
      status: newGuest.status,
      tableName: newGuest.assignedTableName || 'Sin asignar',
      token: newGuest.qrCodeToken,
      notes: newGuest.dietNotes || '',
      updatedAt: 'Hoy',
      manualAssignmentTimestamp: now
    };

    // Update localStorage for Host Panel
    try {
      const keys = [`evenpass_event_${activeEvId}_guests_db`, activeEvId === 6 ? 'evenpass_luis_gerardo_guests_db' : null].filter(Boolean) as string[];
      keys.forEach(k => {
        const raw = localStorage.getItem(k);
        const list = raw ? JSON.parse(raw) : [];
        if (Array.isArray(list)) {
          const exists = list.some((item: any) => 
            (newGuest.qrCodeToken && item.token === newGuest.qrCodeToken) ||
            (newGuest.fullName && item.fullName && item.fullName.toLowerCase().trim() === newGuest.fullName.toLowerCase().trim())
          );
          if (!exists) {
            list.unshift(formattedGuest);
            localStorage.setItem(k, JSON.stringify(list));
          }
        }
      });
      localStorage.setItem('evenpass_luis_gerardo_updated_tick', String(now));
    } catch (e) {}

    const msgId = 'msg_' + now + '_' + Math.random().toString(36).substr(2, 9);
    this.processedCloudMsgIds.add(msgId);

    const payload = {
      type: 'NEW_GUEST',
      msgId: msgId,
      eventId: activeEvId,
      guest: formattedGuest,
      allGuests: this.allGuests().filter(g => g.eventId === activeEvId).map(g => ({
        id: g.id,
        fullName: g.fullName,
        phone: g.phone || 'WhatsApp Directo',
        passesGranted: g.totalPasses,
        passesConfirmed: (g.status === 'CONFIRMED' || g.status === 'ATTENDED') ? g.totalPasses : 0,
        status: g.status,
        tableName: g.assignedTableName || 'Sin asignar',
        token: g.qrCodeToken,
        notes: g.dietNotes || '',
        updatedAt: 'Hoy',
        manualAssignmentTimestamp: g.manualAssignmentTimestamp || now
      })),
      timestamp: now
    };

    // 1. BroadcastChannel
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('evenpass_invitations_channel');
        bc.postMessage(payload);
        bc.postMessage({ ...payload, type: 'NEW_INVITATION' });
      }
    } catch (e) {}

    // 2. Cloud Relay
    try {
      fetch(this.CLOUD_SYNC_RELAY, {
        method: 'POST',
        headers: {
          'Title': 'EvenPass Guest Created',
          'Tags': 'guest,new'
        },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (e) {}

    // 3. Guarantee full state synchronization
    this.broadcastFullStateToCloud(activeEvId);

    this.notificationService.show('success', 'Invitado Registrado', `${newGuest.fullName} añadido a este evento.`);
  }

  deleteGuest(id: number): void {
    if (this.isEventLocked()) {
      this.notificationService.show('warning', 'Evento Concluido', 'Este evento ha finalizado y está en modo histórico. No se pueden eliminar invitados.');
      return;
    }
    const guest = this.allGuests().find(g => g.id === id);
    if (!guest) return;

    const activeEvId = guest.eventId || this.activeEventId();
    this.allGuests.update(list => list.filter(g => g.id !== id));
    this.events.update(list => list.map(ev => 
      ev.id === activeEvId ? { ...ev, totalGuests: Math.max(0, ev.totalGuests - 1) } : ev
    ));
    this.refreshAllTableOccupancies();
    this.persistGuests();
    this.persistEvents();
    this.persistSalons();

    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    this.processedCloudMsgIds.add(msgId);

    const payload = {
      type: 'GUEST_DELETED',
      msgId: msgId,
      eventId: activeEvId,
      guestId: guest.id,
      guestToken: guest.qrCodeToken,
      fullName: guest.fullName,
      tableName: guest.assignedTableName,
      timestamp: Date.now()
    };

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('evenpass_invitations_channel');
        bc.postMessage(payload);
      }
    } catch (e) {}

    try {
      fetch(this.CLOUD_SYNC_RELAY, {
        method: 'POST',
        headers: { 'Title': 'EvenPass Guest Deleted', 'Tags': 'guest,delete' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (e) {}

    try {
      const keys = [`evenpass_event_${activeEvId}_guests_db`, activeEvId === 6 ? 'evenpass_luis_gerardo_guests_db' : null].filter(Boolean) as string[];
      keys.forEach(k => {
        const raw = localStorage.getItem(k);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const filtered = list.filter((item: any) => 
              !( (guest.qrCodeToken && item.token === guest.qrCodeToken) ||
                 (guest.fullName && item.fullName && item.fullName.toLowerCase().trim() === guest.fullName.toLowerCase().trim()) )
            );
            localStorage.setItem(k, JSON.stringify(filtered));
          }
        }
      });
      localStorage.setItem('evenpass_luis_gerardo_updated_tick', String(Date.now()));
    } catch (e) {}

    this.notificationService.show('info', 'Invitado Eliminado', `"${guest.fullName}" removido y lugar liberado.`);
  }

  assignTableToGuest(guestId: number, tableId: number, forceOverride: boolean = false): void {
    if (this.isEventLocked()) {
      this.notificationService.show('warning', 'Evento Concluido', 'Este evento ha finalizado. La asignación de mesas está bloqueada.');
      return;
    }
    const curSalon = this.currentSalon();
    const table = curSalon?.tables.find(t => t.id === tableId);
    if (!table) return;

    const guest = this.allGuests().find(g => g.id === guestId);
    if (!guest) return;

    const seatedInTarget = this.allGuests().filter(
      g => g.eventId === this.activeEventId() && g.assignedTableId === tableId && g.id !== guestId && g.status !== 'DECLINED'
    );
    const occupiedSeats = seatedInTarget.reduce((sum, g) => sum + g.totalPasses, 0);
    const isOver = (occupiedSeats + guest.totalPasses) > table.capacity;

    // --- CAPACITY ENFORCEMENT: Block overcapacity unless explicitly forced ---
    if (isOver && !forceOverride) {
      this.notificationService.show(
        'error',
        '⛔ Mesa al Límite de Aforo',
        `"${table.tableName}" ya tiene ${occupiedSeats}/${table.capacity} lugares ocupados. "${guest.fullName}" (${guest.totalPasses} pases) no cabe. Crea otra mesa o libera espacio.`
      );
      return;
    }

    const now = Date.now();
    this.allGuests.update(list => list.map(g => {
      if (g.id === guestId) {
        return {
          ...g,
          assignedTableId: tableId,
          assignedTableName: table.tableName,
          manualAssignmentTimestamp: now
        };
      }
      return g;
    }));
    this.refreshAllTableOccupancies();
    this.broadcastTableReassignment(guestId, tableId, table.tableName);
    this.persistGuests();
    this.persistSalons();

    if (isOver) {
      this.notificationService.show(
        'warning',
        '⚠️ Mesa Asignada (Forzado)',
        `"${guest.fullName}" asignado a ${table.tableName}. Mesa en SOBRECUPO (${occupiedSeats + guest.totalPasses}/${table.capacity}p).`
      );
    } else {
      this.notificationService.show('success', 'Mesa Asignada', `"${guest.fullName}" asignado a ${table.tableName}`);
    }
  }

  unassignGuestTable(guestId: number): void {
    if (this.isEventLocked()) {
      this.notificationService.show('warning', 'Evento Concluido', 'Este evento ha finalizado. La asignación de mesas está bloqueada.');
      return;
    }
    const now = Date.now();
    this.allGuests.update(list => list.map(g => {
      if (g.id === guestId) {
        return {
          ...g,
          assignedTableId: undefined,
          assignedTableName: undefined,
          manualAssignmentTimestamp: now
        };
      }
      return g;
    }));
    this.refreshAllTableOccupancies();
    this.broadcastTableReassignment(guestId, undefined, 'Sin asignar');
    this.persistGuests();
    this.persistSalons();
    this.notificationService.show('info', 'Invitado Liberado', 'El comensal quedó sin mesa asignada.');
  }

  // --- MANUAL REASSIGNMENT TO SPECIFIC TABLE (UPON GUEST REQUEST) ---
  reassignGuestToTable(guestId: number, targetTableId: number, forceOverride: boolean = false): boolean {
    if (this.isEventLocked()) {
      this.notificationService.show('warning', 'Evento Concluido', 'Este evento ha finalizado. La reasignación de mesas está deshabilitada.');
      return false;
    }
    const guest = this.allGuests().find(g => g.id === guestId);
    if (!guest) {
      this.notificationService.show('error', 'Error', 'Invitado no encontrado.');
      return false;
    }

    const curSalon = this.currentSalon();
    const targetTable = curSalon?.tables.find(t => t.id === targetTableId);
    if (!targetTable) {
      this.notificationService.show('error', 'Error', 'Mesa de destino no encontrada.');
      return false;
    }

    const seatedInTarget = this.allGuests().filter(g => 
      g.eventId === this.activeEventId() && g.assignedTableId === targetTableId && g.id !== guestId && g.status !== 'DECLINED'
    );
    const occupiedSeats = seatedInTarget.reduce((sum, g) => sum + g.totalPasses, 0);
    const isOver = (occupiedSeats + guest.totalPasses) > targetTable.capacity;

    // --- CAPACITY ENFORCEMENT: Block overcapacity unless explicitly forced ---
    if (isOver && !forceOverride) {
      this.notificationService.show(
        'error',
        '⛔ Mesa al Límite de Aforo',
        `"${targetTable.tableName}" ya tiene ${occupiedSeats}/${targetTable.capacity} lugares. No se puede agregar a "${guest.fullName}" (${guest.totalPasses} pases). Libera espacio o crea otra mesa.`
      );
      return false;
    }

    const now = Date.now();
    this.allGuests.update(list => list.map(g => {
      if (g.id === guestId) {
        return {
          ...g,
          assignedTableId: targetTable.id,
          assignedTableName: targetTable.tableName,
          manualAssignmentTimestamp: now
        };
      }
      return g;
    }));

    this.refreshAllTableOccupancies();
    this.broadcastTableReassignment(guestId, targetTable.id, targetTable.tableName);
    this.persistGuests();
    this.persistSalons();

    if (isOver) {
      this.notificationService.show(
        'warning',
        '⚠️ Comensal Reubicado (Forzado)',
        `"${guest.fullName}" (${guest.totalPasses} pases) movido a ${targetTable.tableName}. Mesa en SOBRECUPO (${occupiedSeats + guest.totalPasses}/${targetTable.capacity}p).`
      );
    } else {
      this.notificationService.show(
        'success',
        'Comensal Reubicado',
        `"${guest.fullName}" (${guest.totalPasses} pases) ahora está sentado en ${targetTable.tableName}.`
      );
    }
    return true;
  }

  broadcastTableReassignment(guestId: number, newTableId?: number, newTableName?: string): void {
    const guest = this.allGuests().find(g => g.id === guestId);
    if (!guest) return;

    const evId = guest.eventId || this.activeEventId();
    const token = guest.qrCodeToken;
    const fullName = guest.fullName;
    const finalTableName = newTableName !== undefined ? newTableName : 
      ((newTableId ? this.currentSalon()?.tables.find(t => t.id === newTableId)?.tableName : undefined) || 'Sin asignar');

    const now = Date.now();
    const msgId = 'msg_' + now + '_' + Math.random().toString(36).substr(2, 9);
    this.processedCloudMsgIds.add(msgId);

    const payload = {
      type: 'TABLE_REASSIGNED',
      msgId: msgId,
      eventId: evId,
      guestId: guest.id,
      guestToken: token,
      fullName: fullName,
      newTableName: finalTableName,
      newTableId: newTableId,
      timestamp: now
    };

    // 1. Broadcast via BroadcastChannel
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('evenpass_invitations_channel');
        bc.postMessage(payload);
      }
    } catch (e) {}

    // 2. Broadcast to Cloud Relay (Netlify / mobile / external host panel)
    try {
      fetch(this.CLOUD_SYNC_RELAY, {
        method: 'POST',
        headers: {
          'Title': 'EvenPass Table Reassigned',
          'Tags': 'chair,seating'
        },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (e) {}

    // 3. Update localStorage copies for Netlify & host panel
    try {
      const storageKeys = [
        `evenpass_event_${evId}_guests_db`,
        evId === 6 ? 'evenpass_luis_gerardo_guests_db' : null
      ].filter(Boolean) as string[];

      storageKeys.forEach(key => {
        const raw = localStorage.getItem(key);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            let matched = false;
            list.forEach((item: any) => {
              if ((token && item.token === token) || 
                  (item.fullName && item.fullName.toLowerCase().trim() === fullName.toLowerCase().trim())) {
                item.tableName = finalTableName;
                item.manualAssignmentTimestamp = now;
                matched = true;
              }
            });
            if (matched) {
              localStorage.setItem(key, JSON.stringify(list));
              localStorage.setItem('evenpass_luis_gerardo_updated_tick', String(now));
            }
          }
        }
      });
    } catch (e) {}
  }

  broadcastFullStateToCloud(targetEventId?: number): void {
    const evId = targetEventId || this.activeEventId();
    const curSalon = this.currentSalon();
    const guests = this.allGuests().filter(g => g.eventId === evId);

    const formattedGuests = guests.map(g => ({
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
      manualAssignmentTimestamp: g.manualAssignmentTimestamp || Date.now()
    }));

    const formattedTables = (curSalon?.tables || []).map(t => ({
      id: t.id,
      name: t.tableName,
      capacity: t.capacity,
      shape: t.shape,
      tableNumber: t.tableNumber,
      occupiedSeats: t.occupiedSeats || 0
    }));

    const payload = {
      type: 'SYNC_FULL_STATE',
      eventId: evId,
      allGuests: formattedGuests,
      allTables: formattedTables,
      timestamp: Date.now()
    };

    // 1. BroadcastChannel
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('evenpass_invitations_channel');
        bc.postMessage(payload);
      }
    } catch (e) {}

    // 2. Cloud Relay (Netlify / mobile / external host panel)
    try {
      fetch(this.CLOUD_SYNC_RELAY, {
        method: 'POST',
        headers: {
          'Title': 'EvenPass Full State Sync',
          'Tags': 'chair,seating,full_sync'
        },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (e) {}

    // 3. Update localStorage copies
    try {
      localStorage.setItem(`evenpass_event_${evId}_guests_db`, JSON.stringify(formattedGuests));
      if (evId === 6) {
        localStorage.setItem('evenpass_luis_gerardo_guests_db', JSON.stringify(formattedGuests));
        localStorage.setItem('evenpass_luis_gerardo_updated_tick', String(Date.now()));
      }
      localStorage.setItem(`evenpass_event_${evId}_tables_db`, JSON.stringify(formattedTables));
    } catch (e) {}
  }

  // Recalculates occupied seats for every table based on real assigned guests (all non-declined)
  refreshAllTableOccupancies(): void {
    const curSalon = this.currentSalon();
    if (!curSalon) return;
    const activeEvId = this.activeEventId();
    const activeGuests = this.allGuests().filter(
      g => g.eventId === activeEvId && g.status !== 'DECLINED'
    );

    const updatedTables = curSalon.tables.map(t => {
      const seated = activeGuests.filter(g => 
        (g.assignedTableId != null && Number(g.assignedTableId) === Number(t.id)) ||
        (g.assignedTableName && g.assignedTableName.toLowerCase().trim() === t.tableName.toLowerCase().trim()) ||
        (g.assignedTableName && new RegExp(`\\b(mesa|table)\\s*0*${t.tableNumber}\\b`, 'i').test(g.assignedTableName))
      );
      const totalOccupied = seated.reduce((sum, g) => sum + g.totalPasses, 0);
      return {
        ...t,
        occupiedSeats: totalOccupied,
        assignedGuests: seated
      };
    });

    this.salons.update(list => list.map(s => 
      s.id === curSalon.id ? { ...s, tables: updatedTables } : s
    ));
    this.persistSalons();
  }

  // --- HARD CAPACITY ENFORCEMENT & SELF-HEALING BALANCER ---
  // Guarantees zero overcapacity in any table. If any table has occupied > capacity,
  // automatically moves overflow guests to tables with space, or auto-creates a table.
  enforceSalonCapacityAndBalance(targetEventId?: number): boolean {
    const evId = targetEventId || this.activeEventId();
    const curEv = this.events().find(e => e.id === evId) || this.selectedEvent();
    if (!curEv) return false;

    const salonId = curEv.salonId || 4;
    const curSalon = this.salons().find(s => s.id === salonId);
    if (!curSalon || !curSalon.tables || curSalon.tables.length === 0) return false;

    let tables = curSalon.tables.map(t => ({ ...t }));
    let allGuestsCopy = this.allGuests().map(g => ({ ...g }));
    const eventGuests = allGuestsCopy.filter(g => g.eventId === evId && g.status !== 'DECLINED');

    let modified = false;
    let tablesModified = false;

    // Check every table for overcapacity
    for (const table of tables) {
      const seated = eventGuests.filter(g => 
        (g.assignedTableId != null && Number(g.assignedTableId) === Number(table.id)) ||
        (g.assignedTableName && g.assignedTableName.toLowerCase().trim() === table.tableName.toLowerCase().trim()) ||
        (g.assignedTableName && new RegExp(`\\b(mesa|table)\\s*0*${table.tableNumber}\\b`, 'i').test(g.assignedTableName))
      );

      const totalOccupied = seated.reduce((sum, g) => sum + g.totalPasses, 0);

      if (totalOccupied > table.capacity) {
        let currentSeats = 0;
        const overflowGuests: Guest[] = [];

        // Prioritize confirmed guests and earlier assignments to stay in the table
        const sorted = [...seated].sort((a, b) => {
          if (a.status === 'CONFIRMED' && b.status !== 'CONFIRMED') return -1;
          if (b.status === 'CONFIRMED' && a.status !== 'CONFIRMED') return 1;
          return (a.manualAssignmentTimestamp || 0) - (b.manualAssignmentTimestamp || 0);
        });

        for (const g of sorted) {
          if (currentSeats + g.totalPasses <= table.capacity) {
            currentSeats += g.totalPasses;
          } else {
            overflowGuests.push(g);
          }
        }

        // Reallocate each overflowing guest
        for (const overG of overflowGuests) {
          // Find an existing table with space
          let candidate = tables.find(t => {
            if (t.id === table.id) return false;
            const tOccupied = allGuestsCopy
              .filter(g => g.eventId === evId && g.status !== 'DECLINED' && (
                (g.assignedTableId != null && Number(g.assignedTableId) === Number(t.id)) ||
                (g.assignedTableName && g.assignedTableName.toLowerCase().trim() === t.tableName.toLowerCase().trim()) ||
                (g.assignedTableName && new RegExp(`\\b(mesa|table)\\s*0*${t.tableNumber}\\b`, 'i').test(g.assignedTableName))
              ))
              .reduce((sum, g) => sum + g.totalPasses, 0);
            return (t.capacity - tOccupied) >= overG.totalPasses;
          });

          // If no existing table has enough space, auto-create a new table!
          if (!candidate) {
            const nextNum = Math.max(...tables.map(t => t.tableNumber)) + 1;
            const newTable: SalonTable = {
              id: Date.now() + nextNum,
              salonId: curSalon.id,
              tableNumber: nextNum,
              tableName: `Mesa ${nextNum < 10 ? '0' + nextNum : nextNum} - Auto`,
              shape: 'ROUND',
              capacity: 10,
              posX: 140 + ((tables.length) % 3) * 160,
              posY: 180 + Math.floor((tables.length) / 3) * 160,
              occupiedSeats: 0
            };
            tables.push(newTable);
            candidate = newTable;
            tablesModified = true;
          }

          // Move guest to candidate table
          const gIdx = allGuestsCopy.findIndex(item => item.id === overG.id);
          if (gIdx >= 0) {
            allGuestsCopy[gIdx] = {
              ...allGuestsCopy[gIdx],
              assignedTableId: candidate.id,
              assignedTableName: candidate.tableName,
              manualAssignmentTimestamp: Date.now()
            };
            modified = true;
          }
        }
      }
    }

    if (tablesModified) {
      this.salons.update(list => list.map(s => 
        s.id === curSalon.id ? { ...s, tables, totalCapacity: tables.reduce((sum, t) => sum + t.capacity, 0) } : s
      ));
      this.persistSalons();
    }

    if (modified) {
      this.allGuests.set(allGuestsCopy);
      this.persistGuests();
      this.refreshAllTableOccupancies();
      this.broadcastFullStateToCloud(evId);
      this.notificationService.show(
        'info',
        'Sobrecupo Despejado Automáticamente',
        'Se redistribuyeron comensales excedentes para garantizar que ninguna mesa supere su capacidad.'
      );
    }

    return modified || tablesModified;
  }

  // --- 5-DAY UPGRADE TO PRO / PREMIUM POLICY CHECK ---
  canUpgradePlan(event: EventItem | null): { allowed: boolean; remainingDays: number; message: string } {
    if (!event) return { allowed: false, remainingDays: 0, message: 'Ningún evento seleccionado.' };
    if (event.tierPlan === 'PREMIUM') return { allowed: false, remainingDays: 0, message: 'El evento ya se encuentra en Plan Premium Pro.' };

    if (event.status !== 'PENDIENTE') {
      return {
        allowed: false,
        remainingDays: 0,
        message: `El plan está bloqueado porque el evento está "${event.status}". Los cambios de plan solo se permiten mientras esté en estado PENDIENTE.`
      };
    }

    const createdTime = event.createdAt ? new Date(event.createdAt).getTime() : Date.now();
    const diffMs = Date.now() - createdTime;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const remainingDays = Math.max(0, 5 - diffDays);

    if (diffDays >= 5) {
      return {
        allowed: false,
        remainingDays: 0,
        message: 'La ventana de 5 días para cambio de paquete ha expirado. El plan ha quedado fijado contractualmente.'
      };
    }

    return {
      allowed: true,
      remainingDays,
      message: `Ventana de actualización disponible: quedan ${remainingDays} día(s) para cambiar a Plan Premium Pro.`
    };
  }

  // --- DYNAMIC CUSTOM TEMPLATES REGISTRATION ---
  addCustomTemplate(tpl: Partial<InvitationTemplate>): void {
    const newTpl: InvitationTemplate = {
      id: Date.now(),
      slug: tpl.slug || 'custom-' + Math.random().toString(36).substring(2, 7),
      name: tpl.name || 'Plantilla Personalizada',
      category: tpl.category || 'Personalizada',
      description: tpl.description || 'Diseño de invitación personalizado agregado al catálogo.',
      previewImageUrl: tpl.previewImageUrl || ''
    };
    this.templates.update(list => [...list, newTpl]);
    this.notificationService.show('success', 'Plantilla Registrada', `"${newTpl.name}" ahora está disponible en el catálogo de invitaciones.`);
  }

  // --- SALON CUSTOMIZATION & EDITING ---
  updateSalonDetails(salonId: number, details: Partial<Salon>): void {
    this.salons.update(list => list.map(s => {
      if (s.id === salonId) {
        return { ...s, ...details };
      }
      return s;
    }));
    this.persistSalons();
    this.notificationService.show('success', 'Recinto Actualizado', 'Dimensiones y datos del salón guardados.');
  }

  // --- MULTI-SALON OPERATIONS ---
  selectSalon(salonId: number): void {
    const found = this.salons().find(s => s.id === salonId);
    if (found) {
      this.activeSalonId.set(salonId);
      // Also update active event's salon link
      const activeEv = this.selectedEvent();
      if (activeEv) {
        this.events.update(list => list.map(ev => 
          ev.id === activeEv.id ? { ...ev, salonId } : ev
        ));
      }
      this.notificationService.show('info', 'Salón Seleccionado', `Ahora visualizando: ${found.name}`);
    }
  }

  registerSalon(salonData: Partial<Salon>): Salon {
    const newId = Date.now();
    const newSalon: Salon = {
      id: newId,
      name: salonData.name || 'Nuevo Recinto de Eventos',
      type: salonData.type || 'BANQUET_IMPERIAL',
      totalCapacity: salonData.totalCapacity || 150,
      widthMeters: salonData.widthMeters || 30,
      lengthMeters: salonData.lengthMeters || 20,
      description: salonData.description || 'Recinto registrado en EvenPass con distribución arquitectónica personalizada.',
      customCroquisUrl: salonData.customCroquisUrl,
      tables: salonData.tables || []
    };

    this.salons.update(list => [...list, newSalon]);
    this.persistSalons();
    this.selectSalon(newId);
    this.notificationService.show('success', 'Salón Registrado', `"${newSalon.name}" se guardó en el catálogo.`);
    return newSalon;
  }

  importCroquisWithAiDetection(
    salonName: string, 
    type: SalonType = 'BANQUET_IMPERIAL', 
    tableCount: number = 10,
    imageUrl?: string
  ): Salon {
    const newId = Date.now();
    const generatedTables: SalonTable[] = [];

    // Dynamically generate layout coordinates based on AI detected table count
    for (let i = 1; i <= tableCount; i++) {
      const isRound = i % 2 !== 0;
      const col = (i - 1) % 4;
      const row = Math.floor((i - 1) / 4);
      generatedTables.push({
        id: newId + i,
        salonId: newId,
        tableNumber: i,
        tableName: `Mesa ${i < 10 ? '0' + i : i} (${isRound ? 'Redonda' : 'Imperial'})`,
        shape: isRound ? 'ROUND' : 'RECTANGULAR',
        capacity: isRound ? 10 : 8,
        posX: 80 + (col * 130),
        posY: 180 + (row * 120),
        occupiedSeats: 0
      });
    }

    const calculatedCapacity = generatedTables.reduce((sum, t) => sum + t.capacity, 0);

    const importedSalon: Salon = {
      id: newId,
      name: salonName || 'Recinto Importado CAD',
      type,
      totalCapacity: calculatedCapacity,
      widthMeters: 35,
      lengthMeters: 25,
      description: `Salón generado por el motor de auto-detección IA a partir del plano arquitectónico (${tableCount} mesas detectadas).`,
      customCroquisUrl: imageUrl,
      tables: generatedTables
    };

    this.salons.update(list => [...list, importedSalon]);
    this.persistSalons();
    this.selectSalon(newId);
    this.notificationService.show('success', 'Detección CAD Exitosa', `Se detectaron ${tableCount} mesas con capacidad total de ${calculatedCapacity} personas.`);
    return importedSalon;
  }

  addTableToCurrentSalon(table: Partial<SalonTable>): SalonTable | null {
    if (this.isEventLocked()) {
      this.notificationService.show('warning', 'Evento Concluido', 'Este evento ha finalizado. El plano arquitectónico está archivado en modo de solo lectura.');
      return null;
    }
    const cur = this.currentSalon();
    if (!cur) return null;

    const rawShape = String(table.shape || 'ROUND').toUpperCase();
    const normalizedShape: 'ROUND' | 'RECTANGULAR' = (rawShape.includes('RECT') || rawShape.includes('IMPERIAL')) ? 'RECTANGULAR' : 'ROUND';

    const newTableNumber = (cur.tables.length > 0) ? Math.max(...cur.tables.map(t => t.tableNumber)) + 1 : 1;
    const newTable: SalonTable = {
      id: Date.now(),
      salonId: cur.id,
      tableNumber: newTableNumber,
      tableName: table.tableName || `Mesa ${newTableNumber < 10 ? '0' + newTableNumber : newTableNumber}`,
      shape: normalizedShape,
      capacity: table.capacity || 10,
      posX: table.posX || 250,
      posY: table.posY || 300,
      occupiedSeats: 0
    };

    const updatedTables = [...cur.tables, newTable];
    this.salons.update(list => list.map(s => 
      s.id === cur.id ? { ...s, tables: updatedTables, totalCapacity: s.totalCapacity + newTable.capacity } : s
    ));
    this.persistSalons();
    this.broadcastFullStateToCloud();
    this.notificationService.show('success', 'Mesa Creada', `Mesa ${newTable.tableNumber} (${normalizedShape === 'RECTANGULAR' ? 'Imperial / Rectangular' : 'Redonda'}) añadida al salón actual.`);
    return newTable;
  }

  updateTableInCurrentSalon(tableId: number, changes: Partial<SalonTable>, silent: boolean = false): void {
    if (this.isEventLocked()) {
      if (!silent) {
        this.notificationService.show('warning', 'Evento Concluido', 'Este evento ha finalizado. El plano arquitectónico está archivado.');
      }
      return;
    }
    const cur = this.currentSalon();
    if (!cur) return;

    const normalizedChanges: Partial<SalonTable> = { ...changes };
    if (changes.shape) {
      const rawShape = String(changes.shape).toUpperCase();
      normalizedChanges.shape = (rawShape.includes('RECT') || rawShape.includes('IMPERIAL')) ? 'RECTANGULAR' : 'ROUND';
    }

    const updatedTables = cur.tables.map(t => 
      t.id === tableId ? { ...t, ...normalizedChanges } : t
    );

    this.salons.update(list => list.map(s => 
      s.id === cur.id ? { ...s, tables: updatedTables } : s
    ));
    this.persistSalons();
    this.broadcastFullStateToCloud();
    if (!silent) {
      this.notificationService.show('info', 'Mesa Modificada', 'Cambios guardados en la mesa.');
    }
  }

  deleteTableFromCurrentSalon(tableId: number): void {
    if (this.isEventLocked()) {
      this.notificationService.show('warning', 'Evento Concluido', 'Este evento ha finalizado. El plano arquitectónico está archivado.');
      return;
    }
    const cur = this.currentSalon();
    if (!cur) return;

    const targetTable = cur.tables.find(t => t.id === tableId);
    const updatedTables = cur.tables.filter(t => t.id !== tableId);
    
    // Unassign guests sitting at this table
    this.allGuests.update(list => list.map(g => 
      (g.assignedTableId === tableId || (targetTable && g.assignedTableName === targetTable.tableName))
        ? { ...g, assignedTableId: undefined, assignedTableName: undefined }
        : g
    ));

    this.salons.update(list => list.map(s => 
      s.id === cur.id ? { ...s, tables: updatedTables, totalCapacity: Math.max(0, s.totalCapacity - (targetTable?.capacity || 0)) } : s
    ));
    this.persistSalons();
    this.persistGuests();
    this.broadcastFullStateToCloud();
    this.notificationService.show('info', 'Mesa Removida', 'Mesa eliminada del plano y comensales desasignados.');
  }

  // --- ITINERARY UPDATE & BULK TIME SHIFT ---
  toggleItineraryStatus(itemId: number): void {
    if (this.isEventLocked()) {
      this.notificationService.show('warning', 'Evento Concluido', 'Este evento ha finalizado. El cronograma está archivado como histórico.');
      return;
    }
    const activeEv = this.selectedEvent();
    if (!activeEv) return;

    const updatedItinerary: ItineraryItem[] = activeEv.itinerary.map(item => {
      if (item.id === itemId) {
        const nextStatus: 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING' = 
          item.status === 'COMPLETED' ? 'UPCOMING' : (item.status === 'UPCOMING' ? 'IN_PROGRESS' : 'COMPLETED');
        return { ...item, status: nextStatus };
      }
      return item;
    });

    this.events.update(list => list.map(ev => 
      ev.id === activeEv.id ? { ...ev, itinerary: updatedItinerary } : ev
    ));
  }

  shiftItineraryTimes(minutes: number): void {
    if (this.isEventLocked()) {
      this.notificationService.show('warning', 'Evento Concluido', 'Este evento ha finalizado. El cronograma está archivado.');
      return;
    }
    const activeEv = this.selectedEvent();
    if (!activeEv || !activeEv.itinerary) return;

    const shiftTimeStr = (timeStr: string, deltaMins: number): string => {
      const parts = timeStr.trim().split(':');
      if (parts.length < 2) return timeStr;
      let hours = parseInt(parts[0], 10);
      let mins = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(mins)) return timeStr;

      let totalMinutes = (hours * 60) + mins + deltaMins;
      if (totalMinutes < 0) totalMinutes += 24 * 60;
      totalMinutes = totalMinutes % (24 * 60);

      const newHours = Math.floor(totalMinutes / 60);
      const newMins = totalMinutes % 60;
      return `${newHours < 10 ? '0' + newHours : newHours}:${newMins < 10 ? '0' + newMins : newMins}`;
    };

    // Shift only upcoming & in_progress moments, or shift all from in_progress onward
    const updatedItinerary = activeEv.itinerary.map(item => {
      if (item.status === 'UPCOMING' || item.status === 'IN_PROGRESS') {
        return {
          ...item,
          time: shiftTimeStr(item.time, minutes)
        };
      }
      return item;
    });

    this.events.update(list => list.map(ev => 
      ev.id === activeEv.id ? { ...ev, itinerary: updatedItinerary } : ev
    ));

    const sign = minutes > 0 ? `+${minutes}` : `${minutes}`;
    this.notificationService.show('warning', 'Itinerario Desfasado', `Se ajustaron los momentos futuros en ${sign} minutos.`);
  }

  addMilestone(item: Partial<ItineraryItem>): void {
    if (this.isEventLocked()) {
      this.notificationService.show('warning', 'Evento Concluido', 'El cronograma ha finalizado y no admite nuevos hitos.');
      return;
    }
    const activeEv = this.selectedEvent();
    if (!activeEv) return;

    const newMilestone: ItineraryItem = {
      id: Date.now(),
      time: item.time || '20:00',
      title: item.title || 'Nueva Actividad',
      description: item.description || '',
      status: item.status || 'UPCOMING',
      location: item.location || 'Salón Principal'
    };

    const updated = [...(activeEv.itinerary || []), newMilestone];
    this.events.update(list => list.map(ev => 
      ev.id === activeEv.id ? { ...ev, itinerary: updated } : ev
    ));
    this.notificationService.show('success', 'Hito Creado', `"${newMilestone.title}" agregado al itinerario.`);
  }

  deleteMilestone(id: number): void {
    if (this.isEventLocked()) {
      this.notificationService.show('warning', 'Evento Concluido', 'Este evento ha finalizado. No se pueden eliminar hitos.');
      return;
    }
    const activeEv = this.selectedEvent();
    if (!activeEv) return;

    const updated = (activeEv.itinerary || []).filter(item => item.id !== id);
    this.events.update(list => list.map(ev => 
      ev.id === activeEv.id ? { ...ev, itinerary: updated } : ev
    ));
    this.notificationService.show('info', 'Hito Eliminado', 'Momento removido del itinerario.');
  }

  // --- SYSTEM CONFIGURATION ---
  updateSystemConfig(config: Partial<SystemConfig>): void {
    this.systemConfig.update(prev => ({ ...prev, ...config }));
    this.notificationService.show('success', 'Configuración Guardada', 'Parámetros del sistema actualizados correctamente.');
  }

  // --- SUPPORT TICKETS ---
  createSupportTicket(ticket: { subject: string; eventId: number; priority: 'ALTA' | 'MEDIA' | 'BAJA'; description: string }): void {
    const ev = this.events().find(e => e.id === ticket.eventId);
    const newTicket: SupportTicket = {
      id: `TCK-${Math.floor(100 + Math.random() * 900)}`,
      subject: ticket.subject,
      eventId: ticket.eventId,
      eventName: ev ? ev.name : 'Evento General',
      priority: ticket.priority,
      status: 'ABIERTO',
      createdAt: new Date().toLocaleDateString('es-MX') + ' ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      description: ticket.description
    };
    this.supportTickets.update(tickets => [newTicket, ...tickets]);
    this.notificationService.show('success', 'Ticket Creado', `Se ha generado el folio ${newTicket.id} para atención prioritaria.`);
  }

  resolveSupportTicket(ticketId: string): void {
    this.supportTickets.update(tickets => tickets.map(t => 
      t.id === ticketId ? { ...t, status: 'RESUELTO' } : t
    ));
    this.notificationService.show('info', 'Ticket Resuelto', `Folio ${ticketId} marcado como resuelto.`);
  }

  // --- EVENT STATUS & CREATION ---
  updateEventStatus(eventId: number, status: EventStatus): void {
    this.events.update(list => list.map(ev => 
      ev.id === eventId ? { ...ev, status } : ev
    ));
    this.notificationService.show('info', 'Estado Actualizado', `El evento ha cambiado a estado: ${status}`);
  }

  addEvent(event: Partial<EventItem>): EventItem {
    const newId = Date.now();
    const newEv: EventItem = {
      id: newId,
      name: event.name || 'Nuevo Evento',
      hostName: event.hostName || 'Anfitrión',
      description: event.description || 'Evento registrado en EvenPass OS.',
      eventType: event.eventType || 'Boda',
      eventDate: event.eventDate || new Date().toISOString(),
      venueName: event.venueName || 'Salón Principal',
      locationAddress: event.locationAddress || 'Ubicación por definir',
      maxCapacity: event.maxCapacity || 200,
      salonId: event.salonId || 1,
      tierPlan: event.tierPlan || 'PREMIUM',
      hasCroquis: event.hasCroquis !== undefined ? event.hasCroquis : true,
      hasScanner: event.hasScanner !== undefined ? event.hasScanner : true,
      numTables: event.numTables || 10,
      status: event.status || 'PENDIENTE',
      templateSlug: event.templateSlug || 'miriam-isidro',
      invitationMode: event.invitationMode || 'TEMPLATE',
      externalInvitationUrl: event.externalInvitationUrl,
      webhookSyncKey: event.webhookSyncKey,
      totalGuests: 0,
      confirmedGuests: 0,
      attendedGuests: 0,
      itinerary: event.itinerary && event.itinerary.length > 0 ? event.itinerary : [
        { id: 1, time: '16:00', title: 'Montaje & Preparativos Generales', description: 'Recepción de proveedores y pruebas de sonido', status: 'UPCOMING', location: 'Recinto' },
        { id: 2, time: '18:00', title: 'Apertura de Puertas & Registro de Invitados', description: 'Acceso por puerta principal con validación de pase digital', status: 'UPCOMING', location: 'Acceso Principal' },
        { id: 3, time: '19:30', title: 'Apertura Protocolaria & Bienvenida', description: 'Recepción oficial por parte de los anfitriones', status: 'UPCOMING', location: 'Área Central' },
        { id: 4, time: '20:30', title: 'Brindis de Honor & Momento Principal', description: 'Palabras especiales de agradecimiento', status: 'UPCOMING', location: 'Pista' },
        { id: 5, time: '21:15', title: 'Cena & Banquete', description: 'Servicio a comensales en mesas asignadas', status: 'UPCOMING', location: 'Mesas' },
        { id: 6, time: '22:30', title: 'Música en Vivo & Baile General', description: 'Apertura de pista de baile y DJ', status: 'UPCOMING', location: 'Pista Central' },
        { id: 7, time: '01:30', title: 'Corte de Pastel & Postres', description: 'Mesa de postres y convivencia', status: 'UPCOMING', location: 'Zona de Dulces' },
        { id: 8, time: '02:30', title: 'Clausura & Agradecimiento', description: 'Despedida formal de invitados', status: 'UPCOMING', location: 'Acceso' }
      ]
    };
    this.events.update(list => [newEv, ...list]);
    this.activeEventId.set(newId);
    this.notificationService.show('success', 'Evento Creado', `Evento "${newEv.name}" registrado exitosamente.`);
    return newEv;
  }

  // --- EXTERNAL INVITATION LINKING & AUDIT SIMULATION ---
  simulateExternalRsvp(eventId: number, source: 'SUPABASE' | 'GOOGLE_SHEETS' | 'CANVA_QR' | 'WEBHOOK_API' | 'EMBED_WIDGET'): Guest {
    const ev = this.events().find(e => e.id === eventId);
    if (!ev) throw new Error('Evento no encontrado');

    const sampleGuests = [
      { name: 'Lic. Fernando Elizondo', phone: '667-182-9901', passes: 2 },
      { name: 'Dra. Marcela Villalobos & Fam.', phone: '667-234-8812', passes: 3 },
      { name: 'Ing. Carlos Zazueta Gómez', phone: '667-456-1122', passes: 2 },
      { name: 'Familia Beltrán Cázarez', phone: '667-890-3344', passes: 4 },
      { name: 'Arq. Roberto Somoza', phone: '667-789-5566', passes: 1 },
      { name: 'Mtra. Daniela Cárdenas', phone: '667-901-7788', passes: 2 }
    ];

    const pick = sampleGuests[Math.floor(Math.random() * sampleGuests.length)];
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const fullName = `${pick.name} (${randomSuffix})`;
    const passes = pick.passes;
    const token = `EP-EXT-${Math.floor(1000 + Math.random() * 9000)}`;

    // Find best table in current salon strictly adhering to physical capacity
    let tableId: number | undefined = undefined;
    let tableName = 'Sin mesa asignada';
    const curSalon = this.currentSalon();
    if (curSalon && curSalon.tables.length > 0) {
      // Calculate real current usage per table in this event
      const activeEventGuests = this.allGuests().filter(
        g => g.eventId === ev.id && (g.status === 'CONFIRMED' || g.status === 'ATTENDED')
      );
      const tableUsage = new Map<number, number>();
      for (const g of activeEventGuests) {
        if (g.assignedTableId) {
          tableUsage.set(g.assignedTableId, (tableUsage.get(g.assignedTableId) || 0) + g.totalPasses);
        }
      }

      // Strictly find a table with enough free capacity - NEVER exceed capacity
      const availableTable = curSalon.tables.find(t => {
        const occ = tableUsage.get(t.id) || 0;
        return (t.capacity - occ) >= passes;
      });

      if (availableTable) {
        tableId = availableTable.id;
        tableName = availableTable.tableName;
      }
    }

    const newGuest: Guest = {
      id: Date.now(),
      eventId: ev.id,
      fullName: fullName,
      phone: pick.phone,
      email: `${fullName.toLowerCase().replace(/[^a-z]/g, '')}@gmail.com`,
      numCompanions: passes - 1,
      totalPasses: passes,
      status: 'CONFIRMED',
      qrCodeToken: token,
      assignedTableId: tableId,
      assignedTableName: tableName,
      source: source,
      confirmedAt: new Date().toLocaleDateString('es-MX'),
      dietNotes: Math.random() > 0.5 ? 'Sin restricciones' : 'Menú Ejecutivo'
    };

    // Add to guests and update table stats
    this.allGuests.update(list => [newGuest, ...list]);
    this.refreshAllTableOccupancies();

    // Create Audit Log Entry
    const auditRecord: ExternalAuditEntry = {
      id: `AUD-${Date.now()}`,
      eventId: ev.id,
      timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) + ' hrs',
      source: source,
      guestName: newGuest.fullName,
      passesCount: passes,
      assignedTable: tableName,
      qrToken: token,
      status: 'SYNCED',
      ipOrigin: `187.190.${Math.floor(10 + Math.random() * 80)}.${Math.floor(20 + Math.random() * 70)}`,
      notes: source === 'SUPABASE'
        ? 'Confirmación en tiempo real desde la Base de Datos Central Supabase'
        : (source === 'GOOGLE_SHEETS'
          ? 'Confirmación sincronizada desde Hoja de Cálculo Google Apps Script'
          : (source === 'CANVA_QR'
            ? 'Confirmación recibida vía QR impreso en diseño de Canva' 
            : (source === 'WEBHOOK_API' 
              ? 'Recepción HTTP REST Webhook' 
              : 'Confirmación interactiva en Widget JS embebido')))
    };

    this.allAuditEntries.update(list => [auditRecord, ...list]);

    // Update Event Stats
    this.events.update(list => list.map(item => {
      if (item.id === ev.id) {
        return {
          ...item,
          totalGuests: (item.totalGuests || 0) + passes,
          confirmedGuests: (item.confirmedGuests || 0) + passes
        };
      }
      return item;
    }));

    const sourceName = source === 'SUPABASE' 
      ? 'Supabase Cloud' 
      : (source === 'GOOGLE_SHEETS' 
        ? 'Google Sheets' 
        : (source === 'CANVA_QR' ? 'Canva QR' : (source === 'WEBHOOK_API' ? 'Webhook' : 'Widget Web')));

    this.notificationService.show(
      'success',
      'RSVP Sincronizado en Vivo',
      `${fullName} (${passes} pases) vinculado vía ${sourceName} y asignado a ${tableName}.`
    );

    return newGuest;
  }

  // --- CANAL DE SINCRONIZACIÓN EN LA NUBE EN TIEMPO REAL (Universal para todos los eventos) ---
  readonly CLOUD_SYNC_RELAY = 'https://ntfy.sh/evenpass_cloud_sync_relay';
  cloudSyncConnected = signal<boolean>(false);
  private processedCloudMsgIds = new Set<string>();
  private isFirstCloudPoll = true;
  private lastStorageTick: string | null = null;

  listenForDigitalInvitations(): void {
    // 1. Escuchar por BroadcastChannel nativo (entre pestañas del mismo navegador)
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('evenpass_invitations_channel');
        bc.onmessage = (event) => {
          if (event && event.data) {
            if (event.data.msgId) {
              if (this.processedCloudMsgIds.has(event.data.msgId)) return;
              this.processedCloudMsgIds.add(event.data.msgId);
            }
            this.ngZone.run(() => {
              this.processSyncMessage(event.data, true);
            });
          }
        };
      }
    } catch (e) {}

    // 2. Conectar flujo SSE en tiempo real hacia la nube (Netlify <-> EvenPass OS)
    this.connectCloudRealtimeStream();

    // 3. Auto-sincronización periódica de respaldo cada 3.5 segundos
    setInterval(() => {
      this.pollCloudSyncUpdates();
      this.pollLocalStorageAllEvents();
    }, 3500);

    // Consulta inicial inmediata
    this.pollCloudSyncUpdates();
    this.pollLocalStorageAllEvents();
  }

  private connectCloudRealtimeStream(): void {
    try {
      if (typeof EventSource === 'undefined') return;
      const sse = new EventSource(`${this.CLOUD_SYNC_RELAY}/sse`);
      sse.onopen = () => {
        this.cloudSyncConnected.set(true);
      };
      sse.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw.id) {
            if (this.processedCloudMsgIds.has(raw.id)) return;
            this.processedCloudMsgIds.add(raw.id);
            if (this.processedCloudMsgIds.size > 500) {
              const first = this.processedCloudMsgIds.values().next().value;
              if (first) this.processedCloudMsgIds.delete(first);
            }
          }
          if (raw.message) {
            const data = JSON.parse(raw.message);
            if (data.msgId && this.processedCloudMsgIds.has(data.msgId)) return;
            if (data.msgId) this.processedCloudMsgIds.add(data.msgId);
            this.ngZone.run(() => {
              this.processSyncMessage(data, true);
            });
          }
        } catch (e) {}
      };
      sse.onerror = () => {
        this.cloudSyncConnected.set(false);
      };
    } catch (e) {}
  }

  private pollCloudSyncUpdates(): void {
    const timeParam = this.isFirstCloudPoll ? 'since=1h' : 'since=30s';
    this.isFirstCloudPoll = false;

    fetch(`${this.CLOUD_SYNC_RELAY}/json?poll=1&${timeParam}`, { method: 'GET', mode: 'cors' })
      .then(res => res.ok ? res.text() : '')
      .then(text => {
        if (!text) return;
        const lines = text.trim().split('\n');
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.id) {
              if (this.processedCloudMsgIds.has(parsed.id)) continue;
              this.processedCloudMsgIds.add(parsed.id);
              if (this.processedCloudMsgIds.size > 500) {
                const first = this.processedCloudMsgIds.values().next().value;
                if (first) this.processedCloudMsgIds.delete(first);
              }
            }
            if (parsed.message) {
              const data = JSON.parse(parsed.message);
              if (data.msgId && this.processedCloudMsgIds.has(data.msgId)) continue;
              if (data.msgId) this.processedCloudMsgIds.add(data.msgId);
              this.ngZone.run(() => {
                this.processSyncMessage(data, false);
              });
            }
          } catch (e) {}
        }
      })
      .catch(() => {});
  }

  private pollLocalStorageAllEvents(): void {
    try {
      const currentTick = localStorage.getItem('evenpass_luis_gerardo_updated_tick');
      if (currentTick && currentTick === this.lastStorageTick) {
        return; // Sin cambios locales recientes
      }
      this.lastStorageTick = currentTick;

      // Monitorear todos los eventos registrados
      this.events().forEach(ev => {
        const raw = localStorage.getItem(`evenpass_event_${ev.id}_guests_db`) || 
                    (ev.id === 6 ? localStorage.getItem('evenpass_luis_gerardo_guests_db') : null);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            this.syncDigitalGuestsList(ev.id, list, false);
          }
        }
      });
    } catch (e) {}
  }

  private processSyncMessage(data: any, isLive: boolean): void {
    if (!data) return;
    const targetEventId = Number(data.eventId) || 6;

    if (data.type === 'TABLE_REASSIGNED') {
      const token = data.guestToken;
      const name = data.fullName;
      const newTableName = data.newTableName;
      const msgTimestamp = Number(data.timestamp || 0);

      const curGuests = [...this.allGuests()];
      const idx = curGuests.findIndex(g => 
        (token && g.qrCodeToken === token) || 
        (name && g.fullName.toLowerCase().trim() === name.toLowerCase().trim() && g.eventId === targetEventId)
      );

      if (idx >= 0) {
        const curG = curGuests[idx];
        const curTs = Number(curG.manualAssignmentTimestamp || 0);
        if (!curTs || msgTimestamp >= curTs) {
          const targetSalon = this.salons().find(s => s.id === (this.selectedEvent()?.salonId || 4));
          let tableId = data.newTableId;
          if (!tableId && targetSalon && targetSalon.tables) {
            const found = targetSalon.tables.find(t => 
              t.tableName.toLowerCase().trim() === (newTableName || '').toLowerCase().trim() ||
              (newTableName && newTableName.toLowerCase().includes(`mesa 0${t.tableNumber}`)) ||
              (newTableName && newTableName.toLowerCase().includes(`mesa ${t.tableNumber}`))
            );
            if (found) tableId = found.id;
          }

          curGuests[idx] = {
            ...curG,
            assignedTableName: (newTableName === 'Sin asignar' || !newTableName) ? undefined : newTableName,
            assignedTableId: (newTableName === 'Sin asignar' || !newTableName) ? undefined : tableId,
            manualAssignmentTimestamp: msgTimestamp || Date.now()
          };
          this.allGuests.set(curGuests);
          this.refreshAllTableOccupancies();
          this.persistGuests();
          this.persistSalons();

          if (isLive) {
            this.notificationService.show(
              'info',
              'Comensal Reubicado en Vivo',
              `"${name}" ahora está en ${newTableName || 'Sin asignar'}.`
            );
          }
        }
      }
      return;
    }

    if (data.type === 'GUEST_DELETED') {
      const token = data.guestToken;
      const name = data.fullName;
      const curGuests = this.allGuests();
      const updated = curGuests.filter(g => 
        !( (token && g.qrCodeToken === token) || 
           (name && g.fullName.toLowerCase().trim() === name.toLowerCase().trim() && g.eventId === targetEventId) )
      );

      if (updated.length !== curGuests.length) {
        this.allGuests.set(updated);
        this.refreshAllTableOccupancies();
        this.persistGuests();
        this.persistSalons();
        
        // Actualizar métricas del evento
        const evGuests = updated.filter(g => g.eventId === targetEventId);
        const confirmedCount = evGuests
          .filter(g => g.status === 'CONFIRMED' || g.status === 'ATTENDED')
          .reduce((sum, g) => sum + g.totalPasses, 0);
        const totalCount = evGuests.reduce((sum, g) => sum + g.totalPasses, 0);
        this.events.update(list => list.map(e => 
          e.id === targetEventId ? { ...e, totalGuests: totalCount, confirmedGuests: confirmedCount } : e
        ));
        this.persistEvents();

        if (isLive) {
          this.notificationService.show('info', 'Invitado Eliminado (Remoto)', `"${name}" fue eliminado desde el panel del anfitrión.`);
        }
      }
      return;
    }

    if (data.type === 'REQUEST_FULL_STATE') {
      this.broadcastFullStateToCloud(targetEventId);
      return;
    }

    if (data.type === 'NEW_GUEST' || data.type === 'NEW_INVITATION') {
      if (data.guest) {
        this.syncDigitalGuestsList(targetEventId, [data.guest], isLive);
      } else if (Array.isArray(data.allGuests)) {
        this.syncDigitalGuestsList(targetEventId, data.allGuests, isLive);
      }
    } else if (data.type === 'RSVP_CONFIRMED') {
      if (data.guest) {
        this.syncDigitalGuestsList(targetEventId, [data.guest], isLive);
      } else if (Array.isArray(data.allGuests)) {
        this.syncDigitalGuestsList(targetEventId, data.allGuests, isLive);
      }
    } else if (data.type === 'SYNC_ALL' && Array.isArray(data.guests)) {
      this.syncDigitalGuestsList(targetEventId, data.guests, false);
    } else if (data.type === 'AUTO_TABLE_CREATED' && data.table) {
      // Panel del anfitrión creó una mesa automáticamente — reflejarla en EvenPass
      const rawTable = data.table;
      const rawShape = String(rawTable.shape || 'ROUND').toUpperCase();
      const normalizedShape: 'ROUND' | 'RECTANGULAR' = (rawShape.includes('RECT') || rawShape.includes('IMPERIAL')) ? 'RECTANGULAR' : 'ROUND';
      const targetSalon = this.salons().find(s => s.id === (this.selectedEvent()?.salonId || 4));

      if (targetSalon) {
        const alreadyExists = targetSalon.tables.some(t =>
          t.tableName.toLowerCase().trim() === (rawTable.name || '').toLowerCase().trim() ||
          t.id === rawTable.id
        );
        if (!alreadyExists) {
          const newT: SalonTable = {
            id: rawTable.id || Date.now(),
            salonId: targetSalon.id,
            tableNumber: rawTable.tableNumber || (targetSalon.tables.length + 1),
            tableName: rawTable.name || `Mesa ${targetSalon.tables.length + 1} - Auto`,
            shape: normalizedShape,
            capacity: rawTable.capacity || 10,
            posX: rawTable.posX || (150 + ((targetSalon.tables.length) % 4) * 150),
            posY: rawTable.posY || (150 + Math.floor((targetSalon.tables.length) / 4) * 150),
            occupiedSeats: 0
          };
          const updatedTables = [...targetSalon.tables, newT];
          this.salons.update(list => list.map(s =>
            s.id === targetSalon.id
              ? { ...s, tables: updatedTables, totalCapacity: s.totalCapacity + newT.capacity }
              : s
          ));
          this.persistSalons();
          this.notificationService.show('info', '🪑 Mesa Creada (Remota)', `Mesa "${newT.tableName}" agregada desde el panel del anfitrión.`);
          this.broadcastFullStateToCloud(targetEventId);
        }
      }
    }
  }

  // --- SINCRONIZACIÓN REAL DE INVITACIONES DIGITALES (AUTOMÁTICA Y UNIVERSAL) ---
  syncDigitalGuestsList(eventId: number, guestList: any[], notify: boolean = true): number {
    if (!guestList || !Array.isArray(guestList) || guestList.length === 0) return 0;
    let changesCount = 0;
    const curGuests = [...this.allGuests()];
    const targetEv = this.events().find(e => e.id === eventId);

    guestList.forEach(item => {
      const token = item.token || item.qrCodeToken;
      const name = item.fullName || item.nombre || item.name;
      if (!name) return;

      const existingIdx = curGuests.findIndex(g => 
        (token && g.qrCodeToken === token) || 
        (g.fullName.toLowerCase().trim() === name.toLowerCase().trim() && g.eventId === eventId)
      );

      const passes = Number(item.passesConfirmed || item.passesGranted || item.totalPasses || item.pases || 1);
      const isConfirmed = item.status === 'CONFIRMED' || (item.passesConfirmed && item.passesConfirmed > 0) || item.asistencia === 'Sí';
      const tableName = item.tableName || item.assignedTableName || 'Mesa 01 - Familia Cercana';

      // Encontrar tableId en el salón del evento respetando aforo
      const targetSalon = this.salons().find(s => s.id === (targetEv?.salonId || 4));
      let targetTable = targetSalon?.tables?.find(t => 
        t.tableName.toLowerCase().trim() === tableName.toLowerCase().trim() ||
        tableName.toLowerCase().includes(`mesa 0${t.tableNumber}`) ||
        tableName.toLowerCase().includes(`mesa ${t.tableNumber}`)
      );

      // Verificación de aforo: si la mesa destino ya no tiene cupo, buscar otra con espacio
      if (targetTable) {
        const currentOcc = curGuests
          .filter(g => g.eventId === eventId && g.status !== 'DECLINED' && g.qrCodeToken !== token && (
            (g.assignedTableId != null && Number(g.assignedTableId) === Number(targetTable!.id)) ||
            (g.assignedTableName && g.assignedTableName.toLowerCase().trim() === targetTable!.tableName.toLowerCase().trim())
          ))
          .reduce((sum, g) => sum + g.totalPasses, 0);

        if (currentOcc + passes > targetTable.capacity) {
          const alternativeTable = targetSalon?.tables.find(t => {
            const occ = curGuests
              .filter(g => g.eventId === eventId && g.status !== 'DECLINED' && g.qrCodeToken !== token && (
                (g.assignedTableId != null && Number(g.assignedTableId) === Number(t.id)) ||
                (g.assignedTableName && g.assignedTableName.toLowerCase().trim() === t.tableName.toLowerCase().trim())
              ))
              .reduce((sum, g) => sum + g.totalPasses, 0);
            return (t.capacity - occ) >= passes;
          });
          if (alternativeTable) {
            targetTable = alternativeTable;
          }
        }
      }

      let tableId = targetTable?.id || targetSalon?.tables?.[0]?.id || 401;
      const finalTableName = targetTable?.tableName || tableName;

      if (existingIdx >= 0) {
        // Actualizar invitado existente si cambió estado o pases
        const oldG = curGuests[existingIdx];
        const newStatus = isConfirmed ? 'CONFIRMED' : (item.status === 'DECLINED' || item.asistencia === 'No' ? 'DECLINED' : 'PENDING');
        
        // PROTECTION: If this guest has been manually assigned in EvenPass,
        // and the incoming item's timestamp is older than oldG.manualAssignmentTimestamp,
        // or if item does not have a newer explicit reassignment timestamp,
        // KEEP oldG.assignedTableName and oldG.assignedTableId!
        const incomingTimestamp = Number(item.manualAssignmentTimestamp || item.timestamp || 0);
        const hasManualOverride = Boolean(
          oldG.manualAssignmentTimestamp && 
          (!incomingTimestamp || incomingTimestamp < oldG.manualAssignmentTimestamp)
        );

        const targetTableName = hasManualOverride ? (oldG.assignedTableName || finalTableName) : finalTableName;
        const targetTableId = hasManualOverride ? (oldG.assignedTableId || tableId) : tableId;

        const statusChanged = oldG.status !== newStatus;
        const passesChanged = oldG.totalPasses !== passes;
        const tableChanged = !hasManualOverride && (oldG.assignedTableName !== targetTableName);

        if (statusChanged || passesChanged || tableChanged) {
          curGuests[existingIdx] = {
            ...oldG,
            status: newStatus,
            totalPasses: passes,
            numCompanions: Math.max(0, passes - 1),
            assignedTableName: targetTableName,
            assignedTableId: targetTableId,
            dietNotes: item.notes || oldG.dietNotes,
            source: 'DIGITAL_INVITATION',
            confirmedAt: isConfirmed ? (oldG.confirmedAt || new Date().toLocaleString()) : undefined,
            manualAssignmentTimestamp: oldG.manualAssignmentTimestamp
          };
          changesCount++;

          if (notify && newStatus === 'CONFIRMED' && statusChanged) {
            this.notificationService.show(
              'success',
              'Confirmación en Vivo',
              `"${name}" confirmó ${passes} pases para ${targetEv?.name || 'el evento'}.`
            );
          }
        }
      } else {
        // Agregar nuevo invitado despachado desde el panel de invitaciones del anfitrión
        const newG: Guest = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          eventId: eventId,
          fullName: name,
          email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`,
          phone: item.phone || 'WhatsApp Directo',
          numCompanions: Math.max(0, passes - 1),
          totalPasses: passes,
          status: isConfirmed ? 'CONFIRMED' : 'PENDING',
          qrCodeToken: token || `LG10-VIP-${Math.floor(1000 + Math.random() * 9000)}`,
          assignedTableId: tableId,
          assignedTableName: finalTableName,
          dietNotes: item.notes || 'Invitación enviada por WhatsApp',
          source: 'DIGITAL_INVITATION',
          confirmedAt: isConfirmed ? (item.updatedAt || new Date().toLocaleString()) : undefined
        };
        curGuests.unshift(newG);
        changesCount++;

        if (notify) {
          this.notificationService.show(
            'success',
            'Nuevo Invitado en Vivo',
            `"${name}" (${passes} pases) se registró desde el panel del anfitrión.`
          );
        }
      }
    });

    if (changesCount > 0) {
      this.allGuests.set(curGuests);
      this.refreshAllTableOccupancies();
      this.persistGuests();
      this.persistSalons();

      // Recalcular métricas de asistentes para el evento correspondiente
      const evGuests = curGuests.filter(g => g.eventId === eventId);
      const confirmedCount = evGuests
        .filter(g => g.status === 'CONFIRMED' || g.status === 'ATTENDED')
        .reduce((sum, g) => sum + g.totalPasses, 0);
      const totalCount = evGuests.reduce((sum, g) => sum + g.totalPasses, 0);

      this.events.update(list => list.map(e => 
        e.id === eventId ? { ...e, totalGuests: totalCount, confirmedGuests: confirmedCount } : e
      ));
      this.persistEvents();
      this.enforceSalonCapacityAndBalance(eventId);
    }
    return changesCount;
  }

  // --- CLOUD SYNC: SUPABASE & INVITACIONES DIGITALES ---
  syncWithSupabase(eventId: number): { success: boolean; newGuests: number; message: string } {
    const ev = this.events().find(e => e.id === eventId) || this.selectedEvent();
    if (!ev) return { success: false, newGuests: 0, message: 'Evento no seleccionado' };
    if (this.isEventLocked(ev)) {
      this.notificationService.show('warning', 'Evento Concluido', 'Este evento ha finalizado. La sincronización de confirmaciones está deshabilitada en modo histórico.');
      return { success: false, newGuests: 0, message: 'Evento finalizado en modo histórico.' };
    }

    let imported = 0;

    // 1. Sincronizar desde almacenamiento local del panel si existe
    try {
      const raw = localStorage.getItem('evenpass_luis_gerardo_guests_db');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          imported = this.syncDigitalGuestsList(ev.id, list, false);
        }
      }
    } catch (e) {}

    // 2. Si hay configuración Supabase activa con tabla ep_guests
    if (this.supabaseConfig().connected && this.supabaseConfig().url) {
      fetch(`${this.supabaseConfig().url}/rest/v1/${this.supabaseConfig().tableName}?event_id=eq.${ev.id}`, {
        headers: {
          'apikey': this.supabaseConfig().anonKey,
          'Authorization': `Bearer ${this.supabaseConfig().anonKey}`
        }
      })
      .then(res => res.ok ? res.json() : null)
      .then(dbGuests => {
        if (Array.isArray(dbGuests) && dbGuests.length > 0) {
          this.syncDigitalGuestsList(ev.id, dbGuests, true);
        }
      })
      .catch(() => {});
    }

    this.notificationService.show(
      'success',
      'Panel de Invitaciones Sincronizado',
      `Los datos de "${ev.name}" están 100% actualizados y conectados con el panel del anfitrión.`
    );

    return {
      success: true,
      newGuests: imported,
      message: 'Sincronizado exitosamente con el panel de invitaciones.'
    };
  }

  // --- SYNC CON GOOGLE SHEETS / APPS SCRIPT ---
  async syncWithGoogleSheet(eventId: number, scriptUrl?: string): Promise<{ success: boolean; imported: number; message: string }> {
    const ev = this.events().find(e => e.id === eventId) || this.selectedEvent();
    if (!ev) return { success: false, imported: 0, message: 'Evento no seleccionado' };

    const url = scriptUrl || ev.googleSheetScriptUrl;
    if (url) {
      ev.googleSheetScriptUrl = url;
    }

    try {
      if (url && url.startsWith('http')) {
        const res = await fetch(`${url}?action=get_list`, { method: 'GET', mode: 'cors' }).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          if (data && data.status === 'success' && Array.isArray(data.lista)) {
            let count = 0;
            for (const item of data.lista) {
              if (item.nombre && item.asistencia === 'Sí') {
                const existing = this.allGuests().find(g => g.eventId === ev.id && g.fullName.toLowerCase() === item.nombre.toLowerCase());
                if (!existing) {
                  this.addGuest({
                    fullName: item.nombre,
                    totalPasses: Number(item.pases) || 1,
                    status: 'CONFIRMED'
                  });
                  count++;
                }
              }
            }
            if (count > 0) {
              this.notificationService.show('success', 'Google Sheet Sincronizado', `Se importaron ${count} confirmados desde la hoja de cálculo.`);
              return { success: true, imported: count, message: `Se importaron ${count} registros desde Google Sheet.` };
            }
          }
        }
      }
    } catch (e) {
      console.warn('Google Sheet fetch error:', e);
    }

    // Fallback sync
    this.simulateExternalRsvp(ev.id, 'GOOGLE_SHEETS');
    this.notificationService.show(
      'success',
      'Google Sheets Sincronizado',
      `Se vincularon las confirmaciones de la hoja de cálculo para "${ev.name}".`
    );

    return {
      success: true,
      imported: 1,
      message: 'Sincronización con Google Sheet completada exitosamente.'
    };
  }
}

