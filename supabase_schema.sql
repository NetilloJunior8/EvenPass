-- ============================================================================
-- EVENPASS OS · ESQUEMA DE BASE DE DATOS POSTGRESQL PARA SUPABASE
-- Versión de Producción · Compatible con Spring Boot 3 & Supabase Cloud
-- ============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. TABLA: RECINTOS Y SALONES ARQUITECTÓNICOS (salons)
-- ============================================================================
CREATE TABLE IF NOT EXISTS salons (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'BANQUET_IMPERIAL',
    total_capacity INT NOT NULL DEFAULT 150,
    width_meters NUMERIC(6,2) DEFAULT 30.0,
    length_meters NUMERIC(6,2) DEFAULT 20.0,
    description TEXT,
    custom_croquis_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. TABLA: MESAS DEL PLANO CAD (salon_tables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS salon_tables (
    id BIGSERIAL PRIMARY KEY,
    salon_id BIGINT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    table_number INT NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    shape VARCHAR(30) NOT NULL DEFAULT 'ROUND', -- 'ROUND', 'RECTANGULAR', 'SQUARE'
    capacity INT NOT NULL DEFAULT 10,
    pos_x NUMERIC(8,2) NOT NULL DEFAULT 200,
    pos_y NUMERIC(8,2) NOT NULL DEFAULT 200,
    occupied_seats INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_salon_table_number UNIQUE (salon_id, table_number)
);

-- ============================================================================
-- 4. TABLA: EVENTOS (events)
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    host_name VARCHAR(150) NOT NULL,
    description TEXT,
    event_type VARCHAR(80) NOT NULL DEFAULT 'Boda',
    event_date TIMESTAMPTZ NOT NULL,
    venue_name VARCHAR(150) NOT NULL DEFAULT 'Salón Principal',
    location_address TEXT,
    max_capacity INT NOT NULL DEFAULT 200,
    salon_id BIGINT REFERENCES salons(id) ON DELETE SET NULL,
    tier_plan VARCHAR(30) NOT NULL DEFAULT 'PREMIUM', -- 'BASIC', 'STANDARD', 'PREMIUM'
    has_croquis BOOLEAN NOT NULL DEFAULT TRUE,
    has_scanner BOOLEAN NOT NULL DEFAULT TRUE,
    num_tables INT NOT NULL DEFAULT 10,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE', -- 'PENDIENTE', 'EN_PROGRESO', 'FINALIZADO'
    template_slug VARCHAR(100) DEFAULT 'miriam-isidro',
    invitation_mode VARCHAR(50) DEFAULT 'TEMPLATE', -- 'TEMPLATE', 'EXTERNAL'
    external_invitation_url TEXT,
    webhook_sync_key VARCHAR(120),
    google_sheet_script_url TEXT,
    total_guests INT NOT NULL DEFAULT 0,
    confirmed_guests INT NOT NULL DEFAULT 0,
    attended_guests INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. TABLA: INVITADOS Y CONFIRMACIONES RSVP (guests)
-- Tabla central donde todas las invitaciones digitales registran comensales
-- ============================================================================
CREATE TABLE IF NOT EXISTS guests (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    full_name VARCHAR(180) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(50),
    num_companions INT NOT NULL DEFAULT 0,
    total_passes INT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'CONFIRMED', 'DECLINED', 'ATTENDED'
    qr_code_token VARCHAR(80) UNIQUE NOT NULL,
    assigned_table_id BIGINT REFERENCES salon_tables(id) ON DELETE SET NULL,
    assigned_table_name VARCHAR(100),
    diet_notes TEXT,
    source VARCHAR(40) DEFAULT 'MANUAL', -- 'MANUAL', 'CSV_IMPORT', 'CANVA_QR', 'WEBHOOK_API', 'EMBED_WIDGET'
    checked_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. TABLA: USUARIOS Y OPERADORES DE PLATAFORMA (users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    role VARCHAR(40) NOT NULL DEFAULT 'ROLE_ORGANIZER', -- 'ROLE_ADMIN', 'ROLE_ORGANIZER', 'ROLE_STAFF'
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. TABLA: CATÁLOGO DE PLANTILLAS DE INVITACIÓN (invitation_templates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invitation_templates (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(80) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL,
    description TEXT,
    preview_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. TABLA: ITINERARIO DEL EVENTO (itinerary_items)
-- ============================================================================
CREATE TABLE IF NOT EXISTS itinerary_items (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    time VARCHAR(20) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'UPCOMING', -- 'COMPLETED', 'IN_PROGRESS', 'UPCOMING'
    location VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. TABLA: LOGS DE ESCANEO EN PUERTA & ANTI-REPLAY (check_in_logs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS check_in_logs (
    id BIGSERIAL PRIMARY KEY,
    qr_token VARCHAR(80) NOT NULL,
    guest_id BIGINT REFERENCES guests(id) ON DELETE SET NULL,
    guest_name VARCHAR(180) NOT NULL,
    total_passes INT NOT NULL DEFAULT 1,
    event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    event_name VARCHAR(200),
    status VARCHAR(40) NOT NULL, -- 'AUTHORIZED', 'ALREADY_USED', 'INVALID', 'NOT_FOUND'
    scan_timestamp TIMESTAMPTZ DEFAULT NOW(),
    operator_username VARCHAR(80),
    assigned_table_name VARCHAR(100),
    notes TEXT
);

-- ============================================================================
-- 10. TABLA: TICKETS DE SOPORTE & CONCIERGE (support_tickets)
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(50) PRIMARY KEY,
    subject VARCHAR(200) NOT NULL,
    event_id BIGINT REFERENCES events(id) ON DELETE SET NULL,
    event_name VARCHAR(200),
    priority VARCHAR(30) NOT NULL DEFAULT 'MEDIA', -- 'ALTA', 'MEDIA', 'BAJA'
    status VARCHAR(30) NOT NULL DEFAULT 'ABIERTO', -- 'ABIERTO', 'RESUELTO'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11. ÍNDICES DE ALTO RENDIMIENTO
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_guests_event_id ON guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_qr_token ON guests(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_guests_status ON guests(status);
CREATE INDEX IF NOT EXISTS idx_tables_salon_id ON salon_tables(salon_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_event_id ON itinerary_items(event_id);
CREATE INDEX IF NOT EXISTS idx_check_in_logs_event_id ON check_in_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- ============================================================================
-- 12. TRIGGERS AUTOMÁTICOS: RECÁLCULO DE AFORO Y ASISTENCIA POR EVENTO
-- ============================================================================
CREATE OR REPLACE FUNCTION update_event_guest_counts()
RETURNS TRIGGER AS $$
DECLARE
    target_event_id BIGINT;
BEGIN
    target_event_id := COALESCE(NEW.event_id, OLD.event_id);
    
    UPDATE events
    SET 
        total_guests = COALESCE((SELECT COUNT(*) FROM guests WHERE event_id = target_event_id), 0),
        confirmed_guests = COALESCE((SELECT SUM(total_passes) FROM guests WHERE event_id = target_event_id AND status IN ('CONFIRMED', 'ATTENDED')), 0),
        attended_guests = COALESCE((SELECT SUM(total_passes) FROM guests WHERE event_id = target_event_id AND status = 'ATTENDED'), 0)
    WHERE id = target_event_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalc_guest_counts ON guests;
CREATE TRIGGER trg_recalc_guest_counts
AFTER INSERT OR UPDATE OR DELETE ON guests
FOR EACH ROW EXECUTE FUNCTION update_event_guest_counts();

-- ============================================================================
-- 13. POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS) PARA SUPABASE
-- Permite que formularios RSVP externos inserten comensales sin credenciales de admin
-- ============================================================================
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Política 1: Inserción pública de RSVPs desde invitaciones web/móvil
DROP POLICY IF EXISTS "Public RSVP insert" ON guests;
CREATE POLICY "Public RSVP insert" 
ON guests FOR INSERT 
TO public 
WITH CHECK (true);

-- Política 2: Lectura pública de evento por ID (para mostrar portada de invitación)
DROP POLICY IF EXISTS "Public view events" ON events;
CREATE POLICY "Public view events" 
ON events FOR SELECT 
TO public 
USING (true);

-- Política 3: Acceso total para usuarios autenticados / operadores EvenPass
DROP POLICY IF EXISTS "Authenticated full access guests" ON guests;
CREATE POLICY "Authenticated full access guests" 
ON guests FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ============================================================================
-- 14. DATOS SEMILLA BASE (Salones, Eventos, Plantillas y Usuarios)
-- ============================================================================

-- Salones Arquitectónicos Iniciales
INSERT INTO salons (id, name, type, total_capacity, width_meters, length_meters, description)
VALUES 
(1, 'Salón Real Imperial', 'BANQUET_IMPERIAL', 250, 45.0, 30.0, 'Recinto monumental con escenario estelar, cabina DJ, barra y 16 mesas simétricas.'),
(2, 'Carpa Real 40x60 White Pole Tent', 'POLE_TENT', 200, 40.0, 60.0, 'Carpa perimetral elegante con pista de baile central, mesa de honor de 12 plazas y 14 mesas redondas.'),
(3, 'Salón Zafiro Banquet Room', 'BANQUET_IMPERIAL', 50, 6.19, 8.62, 'Recinto íntimo con chimenea arquitectónica, ventanales franceses y 5 mesas de banquete.')
ON CONFLICT (id) DO NOTHING;

-- Mesas para Salón Real Imperial (16 mesas)
INSERT INTO salon_tables (id, salon_id, table_number, table_name, shape, capacity, pos_x, pos_y)
VALUES
(101, 1, 1, 'Mesa 01 (VIP Redonda)', 'ROUND', 10, 100, 180),
(102, 1, 2, 'Mesa 02 (VIP Redonda)', 'ROUND', 10, 240, 180),
(103, 1, 3, 'Mesa 03 (VIP Redonda)', 'ROUND', 10, 380, 180),
(104, 1, 4, 'Mesa 04 (VIP Redonda)', 'ROUND', 10, 520, 180),
(105, 1, 5, 'Mesa 05 (VIP Redonda)', 'ROUND', 10, 100, 320),
(106, 1, 6, 'Mesa 06 (VIP Redonda)', 'ROUND', 10, 240, 320),
(107, 1, 7, 'Mesa 07 (VIP Redonda)', 'ROUND', 10, 380, 320),
(108, 1, 8, 'Mesa 08 (VIP Redonda)', 'ROUND', 10, 520, 320),
(109, 1, 9, 'Mesa 09 (Imperial)', 'RECTANGULAR', 8, 100, 480),
(110, 1, 10, 'Mesa 10 (Imperial)', 'RECTANGULAR', 8, 240, 480),
(111, 1, 11, 'Mesa 11 (Imperial)', 'RECTANGULAR', 8, 380, 480),
(112, 1, 12, 'Mesa 12 (Imperial)', 'RECTANGULAR', 8, 520, 480),
(113, 1, 13, 'Mesa 13 (Imperial)', 'RECTANGULAR', 8, 100, 620),
(114, 1, 14, 'Mesa 14 (Imperial)', 'RECTANGULAR', 8, 240, 620),
(115, 1, 15, 'Mesa 15 (Imperial)', 'RECTANGULAR', 8, 380, 620),
(116, 1, 16, 'Mesa 16 (Imperial)', 'RECTANGULAR', 8, 520, 620)
ON CONFLICT (id) DO NOTHING;

-- Plantillas del Catálogo
INSERT INTO invitation_templates (id, slug, name, category, description)
VALUES 
(1, 'miriam-isidro', 'Miriam & Isidro · Gold Luxury Wedding', 'Boda', 'Elegancia nupcial con acentos dorados, música clásica, bosquejo de iglesia y asignación de mesas.'),
(2, 'neon-party', 'Mis 18 & Fiesta Neón Glow', 'XV Años / Fiesta', 'Diseño cyber dark con fuentes fluorescentes, animación de bienvenida VIP y mapa interactivo.'),
(3, 'editorial-clean', 'Editorial Minimalista & Summit', 'Corporativo / Gala', 'Tipografía suiza contemporánea, integración de agenda y credencialización ejecutiva.'),
(4, 'posada-velvet', 'Posada Velvet & Gold Celebration', 'Posada / Navideña', 'Atmósfera festiva navideña con destellos dorados, fondo velvet rojo noche, programa y rifa.'),
(5, 'bautizo-celestial', 'Bautizo Celestial & Querubín Pastel', 'Bautizo', 'Diseño tierno con tonos marfil y azul pastel, tipografía caligráfica y versículo bíblico.'),
(6, 'cumple-vip', 'Cumpleaños VIP & Sunset Chic', 'Cumpleaños', 'Gradiente sunset cálido, countdown en vivo, dress code sugerido y confirmación con 1 tap.')
ON CONFLICT (id) DO NOTHING;

-- Usuarios Operadores Base
INSERT INTO users (id, username, full_name, email, role, password_hash)
VALUES 
(1, 'ernesto', 'ERNESTO', 'ernesto@evenpass.io', 'ROLE_ADMIN', '$2a$10$wO8q9V8m4P1yK7B.uQGZteJm6r9tQ3i2Z.s0s6P1X7B.uQGZteJm6'),
(2, 'luis', 'LUIS', 'luis@evenpass.io', 'ROLE_ADMIN', '$2a$10$wO8q9V8m4P1yK7B.uQGZteJm6r9tQ3i2Z.s0s6P1X7B.uQGZteJm6'),
(3, 'linda', 'LINDA', 'linda@evenpass.io', 'ROLE_ADMIN', '$2a$10$wO8q9V8m4P1yK7B.uQGZteJm6r9tQ3i2Z.s0s6P1X7B.uQGZteJm6'),
(4, 'coordinador_eventos', 'Coordinador de Eventos', 'coordinacion@evenpass.io', 'ROLE_ORGANIZER', '$2a$10$wO8q9V8m4P1yK7B.uQGZteJm6r9tQ3i2Z.s0s6P1X7B.uQGZteJm6'),
(5, 'hostess_escaneo', 'Hostess de Recepción & Escáner', 'hostess@evenpass.io', 'ROLE_STAFF', '$2a$10$wO8q9V8m4P1yK7B.uQGZteJm6r9tQ3i2Z.s0s6P1X7B.uQGZteJm6')
ON CONFLICT (id) DO NOTHING;

-- Eventos de Muestra
INSERT INTO events (id, name, host_name, description, event_type, event_date, venue_name, max_capacity, salon_id, tier_plan, has_croquis, has_scanner, status, template_slug)
VALUES 
(1, 'Boda de Sofía & Mateo', 'Familia Garza López', 'Ceremonia civil y banquete nupcial de gala en Salón Imperial.', 'Boda', '2026-11-20 18:00:00+00', 'Salón Real Imperial', 250, 1, 'PREMIUM', true, true, 'EN_PROGRESO', 'miriam-isidro'),
(2, 'Mis 18 - Ivonne (Fiesta Neón & VIP)', 'Ivonne Martínez & Padres', 'Fiesta de 18 años con iluminación UV, DJ en vivo y pista perimetral.', 'XV Años / Fiesta', '2026-11-28 20:00:00+00', 'Carpa Real 40x60 White Pole Tent', 200, 2, 'PREMIUM', true, true, 'PENDIENTE', 'neon-party'),
(3, 'Graduación Ing. Sistemas 2026', 'Comité de Graduación Generación 2022-2026', 'Cena de gala y entrega de reconocimientos académicos.', 'Graduación', '2026-12-05 19:30:00+00', 'Salón Zafiro Banquet Room', 50, 3, 'PREMIUM', true, true, 'FINALIZADO', 'editorial-clean')
ON CONFLICT (id) DO NOTHING;
