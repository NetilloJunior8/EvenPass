-- ============================================================================
-- EVENPASS OS · ESQUEMA DE BASE DE DATOS POSTGRESQL PARA SUPABASE
-- Versión de Producción · Compatible con Spring Boot 3 & Supabase Cloud
-- Tablas principales: ep_* (JPA / Spring Boot) + Vistas de conveniencia
-- ============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. TABLA: USUARIOS Y ADMINISTRADORES (ep_users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ep_users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL, -- ROLE_ADMIN, ROLE_ORGANIZER, ROLE_STAFF
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. TABLA: EVENTOS (ep_events)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ep_events (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL DEFAULT 'Boda',
    event_date TIMESTAMPTZ NOT NULL,
    venue_name VARCHAR(150) DEFAULT 'Salón Principal',
    location_address VARCHAR(255),
    max_capacity INT DEFAULT 250,
    status VARCHAR(30) DEFAULT 'PUBLISHED', -- DRAFT, PUBLISHED, IN_PROGRESS, FINISHED
    template_slug VARCHAR(100) DEFAULT 'miriam-isidro',
    organizer_id BIGINT REFERENCES ep_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. TABLA: RECINTOS Y SALONES ARQUITECTÓNICOS (ep_salons)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ep_salons (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    total_capacity INT DEFAULT 250,
    width_meters INT DEFAULT 30,
    length_meters INT DEFAULT 20,
    layout_config_json TEXT,
    event_id BIGINT REFERENCES ep_events(id) ON DELETE SET NULL
);

-- ============================================================================
-- 5. TABLA: MESAS DEL PLANO CAD (ep_salon_tables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ep_salon_tables (
    id BIGSERIAL PRIMARY KEY,
    salon_id BIGINT NOT NULL REFERENCES ep_salons(id) ON DELETE CASCADE,
    table_number INT NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    shape VARCHAR(20) DEFAULT 'ROUND', -- 'ROUND', 'RECTANGULAR', 'SQUARE'
    capacity INT DEFAULT 10,
    pos_x DOUBLE PRECISION DEFAULT 0.0,
    pos_y DOUBLE PRECISION DEFAULT 0.0
);

-- ============================================================================
-- 6. TABLA: INVITADOS Y CONFIRMACIONES RSVP (ep_guests)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ep_guests (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES ep_events(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(30),
    num_companions INT DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, CONFIRMED, DECLINED, ATTENDED
    qr_code_token VARCHAR(64) UNIQUE NOT NULL,
    assigned_table_id BIGINT REFERENCES ep_salon_tables(id) ON DELETE SET NULL,
    diet_notes TEXT,
    confirmed_at TIMESTAMPTZ,
    checked_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. TABLA: CATÁLOGO DE PLANTILLAS DE INVITACIÓN (ep_invitation_templates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ep_invitation_templates (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    preview_image_url VARCHAR(255),
    theme_config_json TEXT
);

-- ============================================================================
-- 8. TABLA: LOGS DE ESCANEO EN PUERTA & ANTI-REPLAY (ep_checkin_logs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ep_checkin_logs (
    id BIGSERIAL PRIMARY KEY,
    qr_token VARCHAR(64) NOT NULL,
    guest_name VARCHAR(100) NOT NULL,
    event_id BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL, -- AUTHORIZED, ALREADY_USED, INVALID
    scan_timestamp TIMESTAMPTZ DEFAULT NOW(),
    operator_username VARCHAR(50),
    assigned_table_name VARCHAR(50),
    notes VARCHAR(255)
);

-- ============================================================================
-- 9. ÍNDICES DE ALTO RENDIMIENTO
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_ep_guests_event_id ON ep_guests(event_id);
CREATE INDEX IF NOT EXISTS idx_ep_guests_qr_token ON ep_guests(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_ep_guests_status ON ep_guests(status);
CREATE INDEX IF NOT EXISTS idx_ep_tables_salon_id ON ep_salon_tables(salon_id);
CREATE INDEX IF NOT EXISTS idx_ep_checkin_event_id ON ep_checkin_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_ep_events_status ON ep_events(status);

-- ============================================================================
-- 10. POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS) PARA SUPABASE
-- ============================================================================
ALTER TABLE ep_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ep_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public RSVP insert ep_guests" ON ep_guests;
CREATE POLICY "Public RSVP insert ep_guests" 
ON ep_guests FOR INSERT 
TO public 
WITH CHECK (true);

DROP POLICY IF EXISTS "Public view ep_events" ON ep_events;
CREATE POLICY "Public view ep_events" 
ON ep_events FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Public view ep_guests" ON ep_guests;
CREATE POLICY "Public view ep_guests" 
ON ep_guests FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Public update ep_guests" ON ep_guests;
CREATE POLICY "Public update ep_guests" 
ON ep_guests FOR UPDATE 
TO public 
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 11. DATOS SEMILLA BASE (Salones, Eventos, Plantillas y Usuarios)
-- ============================================================================

-- Usuarios Administradores y Operadores
-- Password hash: 'admin123' / 'demo123' con BCrypt
INSERT INTO ep_users (id, username, full_name, email, role, password, active)
VALUES 
(1, 'ernesto', 'ERNESTO', 'ernesto@evenpass.io', 'ROLE_ADMIN', '$2a$10$wO8q9V8m4P1yK7B.uQGZteJm6r9tQ3i2Z.s0s6P1X7B.uQGZteJm6', true),
(2, 'luis', 'LUIS', 'luis@evenpass.io', 'ROLE_ADMIN', '$2a$10$wO8q9V8m4P1yK7B.uQGZteJm6r9tQ3i2Z.s0s6P1X7B.uQGZteJm6', true),
(3, 'linda', 'LINDA', 'linda@evenpass.io', 'ROLE_ADMIN', '$2a$10$wO8q9V8m4P1yK7B.uQGZteJm6r9tQ3i2Z.s0s6P1X7B.uQGZteJm6', true),
(4, 'organizador', 'Laura Méndez', 'organizador@evenpass.io', 'ROLE_ORGANIZER', '$2a$10$wO8q9V8m4P1yK7B.uQGZteJm6r9tQ3i2Z.s0s6P1X7B.uQGZteJm6', true),
(5, 'staff', 'Personal de Entrada', 'puerta@evenpass.io', 'ROLE_STAFF', '$2a$10$wO8q9V8m4P1yK7B.uQGZteJm6r9tQ3i2Z.s0s6P1X7B.uQGZteJm6', true)
ON CONFLICT (id) DO NOTHING;

-- Catálogo de Plantillas
INSERT INTO ep_invitation_templates (id, slug, name, category, description, preview_image_url, theme_config_json)
VALUES 
(1, 'miriam-isidro', 'Miriam & Isidro · Gold Luxury Wedding', 'Boda', 'Diseño nupcial de gala con acentos dorados, música clásica y detalles de iglesia y recepción.', 'assets/templates/miriam-isidro/1.jpg', '{"color": "#D4AF37", "font": "Cormorant Garamond", "music": true}'),
(2, 'neon-party', 'Mis 18 & Fiesta Neón Glow', 'XV Años / Fiesta', 'Diseño oscuro moderno con tipografía fluorescente y overlay animado VIP.', 'assets/templates/neon-party/index.html', '{"color": "#FF2A85", "font": "Montserrat", "neon": true}'),
(3, 'editorial-clean', 'Editorial Minimalista & Summit', 'Corporativo / Gala', 'Tipografía suiza contemporánea, integración de agenda y credencial.', '', '{"color": "#2563EB", "font": "Plus Jakarta Sans"}')
ON CONFLICT (id) DO NOTHING;

-- Eventos Principales
INSERT INTO ep_events (id, name, description, event_type, event_date, venue_name, location_address, max_capacity, status, template_slug, organizer_id)
VALUES 
(1, 'Boda de Sofía & Mateo (Miriam & Isidro)', 'Ceremonia religiosa en Catedral y recepción de gala en Hacienda Los Olivos.', 'Boda', NOW() + INTERVAL '21 days', 'Hacienda Los Olivos', 'Carretera a Imala Km 4.5, Culiacán, Sin.', 250, 'PUBLISHED', 'miriam-isidro', 1),
(2, 'Mis 18 - Ivonne (VIP Neon Party)', 'Fiesta de cumpleaños y graduación temática neón.', 'XV Años', NOW() + INTERVAL '30 days', 'Sky Lounge Terrace', 'Blvd. Pedro Infante 2200, Culiacán', 180, 'PUBLISHED', 'neon-party', 1)
ON CONFLICT (id) DO NOTHING;

-- Salón Principal
INSERT INTO ep_salons (id, name, total_capacity, width_meters, length_meters, layout_config_json, event_id)
VALUES 
(1, 'Salón Real Imperial', 250, 40, 25, '{"zones": ["Escenario", "Pista de Baile", "Barra", "Entrada"]}', 1)
ON CONFLICT (id) DO NOTHING;

-- Mesas del Salón
INSERT INTO ep_salon_tables (id, salon_id, table_number, table_name, shape, capacity, pos_x, pos_y)
VALUES 
(1, 1, 1, 'Mesa 01 - Presídium / Familia', 'ROUND', 10, 20.0, 25.0),
(2, 1, 2, 'Mesa 02 - Familia Novio', 'ROUND', 10, 20.0, 55.0),
(3, 1, 3, 'Mesa 03 - Padrinos', 'ROUND', 8, 20.0, 80.0),
(4, 1, 4, 'Mesa 04 - Amigos Universidad', 'ROUND', 10, 80.0, 25.0),
(5, 1, 5, 'Mesa 05 - Amigos Trabajo', 'ROUND', 10, 80.0, 55.0),
(6, 1, 6, 'Mesa 06 - Familiares Foráneos', 'ROUND', 8, 80.0, 80.0)
ON CONFLICT (id) DO NOTHING;

-- Invitados de Demostración
INSERT INTO ep_guests (id, event_id, full_name, email, phone, num_companions, status, qr_code_token, assigned_table_id, confirmed_at, checked_in_at)
VALUES 
(1, 1, 'Ana Valentina Ruiz', 'ana@gmail.com', '667 123 4567', 1, 'ATTENDED', 'EP-9901', 1, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 hour'),
(2, 1, 'Carlos Eduardo Mendoza', 'carlos@gmail.com', '667 234 5678', 1, 'CONFIRMED', 'EP-9902', 1, NOW() - INTERVAL '2 days', NULL),
(3, 1, 'Valeria Gómez', 'valeria@gmail.com', '667 345 6789', 2, 'CONFIRMED', 'EP-9903', 2, NOW() - INTERVAL '1 day', NULL),
(4, 1, 'Héctor Morales', 'hector@gmail.com', '667 456 7890', 1, 'CONFIRMED', 'EP-9904', 4, NOW() - INTERVAL '5 hours', NULL),
(5, 1, 'Diana Laura Sánchez', 'diana@gmail.com', '667 567 8901', 0, 'PENDING', 'EP-9905', NULL, NULL, NULL),
(6, 1, 'Fernando Aguilar', 'fernando@gmail.com', '667 678 9012', 3, 'CONFIRMED', 'EP-9906', 4, NOW() - INTERVAL '3 days', NULL),
(7, 1, 'Roberto Silva', 'roberto@gmail.com', '667 789 0123', 1, 'CONFIRMED', 'EP-9907', 5, NOW() - INTERVAL '1 day', NULL),
(8, 1, 'Gabriela Castro', 'gaby@gmail.com', '667 890 1234', 1, 'DECLINED', 'EP-9908', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Logs de Check-In
INSERT INTO ep_checkin_logs (id, qr_token, guest_name, event_id, status, operator_username, assigned_table_name, notes)
VALUES 
(1, 'EP-9901', 'Ana Valentina Ruiz', 1, 'AUTHORIZED', 'ernesto', 'Mesa 01 - Presídium / Familia', 'Ingreso correcto · 2 personas')
ON CONFLICT (id) DO NOTHING;

-- Sincronizar secuencias
SELECT setval('ep_users_id_seq', COALESCE((SELECT MAX(id) FROM ep_users), 1));
SELECT setval('ep_events_id_seq', COALESCE((SELECT MAX(id) FROM ep_events), 1));
SELECT setval('ep_salons_id_seq', COALESCE((SELECT MAX(id) FROM ep_salons), 1));
SELECT setval('ep_salon_tables_id_seq', COALESCE((SELECT MAX(id) FROM ep_salon_tables), 1));
SELECT setval('ep_guests_id_seq', COALESCE((SELECT MAX(id) FROM ep_guests), 1));
SELECT setval('ep_invitation_templates_id_seq', COALESCE((SELECT MAX(id) FROM ep_invitation_templates), 1));
SELECT setval('ep_checkin_logs_id_seq', COALESCE((SELECT MAX(id) FROM ep_checkin_logs), 1));

-- ============================================================================
-- 12. VISTAS DE COMPATIBILIDAD (Para consultas directas sin prefijo ep_)
-- ============================================================================
CREATE OR REPLACE VIEW guests AS SELECT * FROM ep_guests;
CREATE OR REPLACE VIEW events AS SELECT * FROM ep_events;
CREATE OR REPLACE VIEW salons AS SELECT * FROM ep_salons;
CREATE OR REPLACE VIEW salon_tables AS SELECT * FROM ep_salon_tables;
CREATE OR REPLACE VIEW users AS SELECT * FROM ep_users;
CREATE OR REPLACE VIEW invitation_templates AS SELECT * FROM ep_invitation_templates;
CREATE OR REPLACE VIEW check_in_logs AS SELECT * FROM ep_checkin_logs;
