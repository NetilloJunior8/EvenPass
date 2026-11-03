export interface User {
  id?: number;
  username: string;
  email: string;
  fullName: string;
  role: 'ROLE_ADMIN' | 'ROLE_ORGANIZER' | 'ROLE_STAFF';
  token?: string;
  active?: boolean;
}

export type EventStatus = 'PENDIENTE' | 'EN_PROGRESO' | 'FINALIZADO';

export interface ItineraryItem {
  id: number;
  time: string;
  title: string;
  description: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING';
  location?: string;
}

export interface EventItem {
  id: number;
  name: string;
  hostName: string;
  description?: string;
  eventType: string; // Boda, XV Años, Gala, Corporativo, Graduación
  eventDate: string;
  venueName: string;
  locationAddress: string;
  maxCapacity: number;
  status: EventStatus;
  templateSlug?: string;
  invitationMode?: 'TEMPLATE' | 'EXTERNAL_URL' | 'NONE';
  externalInvitationUrl?: string;
  webhookSyncKey?: string;
  googleSheetScriptUrl?: string;
  supabaseTable?: string;
  totalGuests: number;
  confirmedGuests: number;
  attendedGuests: number;
  itinerary: ItineraryItem[];
  salonId?: number;
  salonLayoutId?: number;
  tierPlan?: 'BASIC' | 'STANDARD' | 'PREMIUM';
  hasCroquis?: boolean;
  hasScanner?: boolean;
  numTables?: number;
  createdAt?: string;
  planLocked?: boolean;
}

export type SalonType = 'BANQUET_IMPERIAL' | 'WHITE_POLE_TENT' | 'ZAFIRO_ROOM' | 'CUSTOM';

export interface SalonTable {
  id: number;
  salonId?: number;
  tableNumber: number;
  tableName: string;
  shape: 'ROUND' | 'RECTANGULAR';
  capacity: number;
  posX: number;
  posY: number;
  occupiedSeats?: number;
  assignedGuests?: Guest[];
}

export interface Salon {
  id: number;
  name: string;
  type: SalonType;
  totalCapacity: number;
  widthMeters: number;
  lengthMeters: number;
  eventId?: number;
  description?: string;
  customCroquisUrl?: string;
  tables: SalonTable[];
}

export interface Guest {
  id: number;
  eventId: number;
  fullName: string;
  email?: string;
  phone?: string;
  numCompanions: number;
  totalPasses: number;
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'ATTENDED';
  qrCodeToken: string;
  assignedTableId?: number;
  assignedTableName?: string;
  dietNotes?: string;
  confirmedAt?: string;
  checkedInAt?: string;
  source?: 'SUPABASE' | 'GOOGLE_SHEETS' | 'CANVA_QR' | 'WEBHOOK_API' | 'EMBED_WIDGET' | 'CSV_IMPORT' | 'MANUAL';
  externalSyncId?: string;
}

export interface ExternalAuditEntry {
  id: string;
  eventId: number;
  timestamp: string;
  source: 'SUPABASE' | 'GOOGLE_SHEETS' | 'CANVA_QR' | 'WEBHOOK_API' | 'EMBED_WIDGET' | 'CSV_IMPORT' | 'MANUAL';
  guestName: string;
  passesCount: number;
  assignedTable: string;
  qrToken: string;
  status: 'SYNCED' | 'CHECKED_IN' | 'DUPLICATE_BLOCKED';
  ipOrigin?: string;
  notes?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  tableName: string;
  connected: boolean;
  autoSync: boolean;
}

export interface CheckInLog {
  id: number;
  qrToken?: string;
  guestId?: number;
  guestName: string;
  totalPasses?: number;
  eventId: number;
  eventName?: string;
  status: 'AUTHORIZED' | 'ALREADY_USED' | 'INVALID';
  scanTimestamp: string;
  operatorUsername?: string;
  assignedTableName?: string;
  notes?: string;
}

export interface InvitationTemplate {
  id: number;
  slug: string;
  name: string;
  category: string;
  description: string;
  previewImageUrl: string;
  themeConfigJson?: string;
}

export interface AutoAssignResult {
  salonId: number;
  salonName: string;
  totalGuestsAssigned: number;
  totalPassesAssigned: number;
  tablesUtilized: number;
  remainingUnassignedGuests: number;
  message: string;
  tables: {
    tableId: number;
    tableNumber: number;
    tableName: string;
    capacity: number;
    occupiedSeats: number;
    guestNames: string[];
  }[];
}

export interface SupportTicket {
  id: string;
  subject: string;
  eventId: number;
  eventName: string;
  priority: 'ALTA' | 'MEDIA' | 'BAJA';
  status: 'ABIERTO' | 'EN_REVISION' | 'RESUELTO';
  createdAt: string;
  description: string;
}

export interface SystemConfig {
  platformName: string;
  requireApproval: boolean;
  autoTableAssignment: boolean;
  enableQrAntiReplay: boolean;
  allowManualCheckIn: boolean;
  whatsappMessageTemplate: string;
}
