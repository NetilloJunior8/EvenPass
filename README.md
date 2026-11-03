# 🎟️ EvenPass — Plataforma SaaS de Gestión de Eventos, Croquis de Salones y Control de Acceso QR

**EvenPass** es una plataforma SaaS integral y moderna diseñada para revolucionar la organización de eventos (bodas, XV años, graduaciones y galas corporativas). Combina invitaciones digitales interactivas, confirmación RSVP en vivo, un diseñador de **croquis de salón en 2D con algoritmo de asignación automática de mesas**, y un **escáner de acceso QR de alta velocidad con bloqueo anti-duplicados**.

---

## 📸 Estructura Visual Basada en el Diseño Proporcionado

La interfaz fue diseñada respetando fielmente la estructura y estética minimalista de las capturas de pantalla solicitadas:

1. **Pantalla de Inicio de Sesión (Login)**:
   - Panel dividido (*Split Card*) con fondo sutil y modo claro/oscuro.
   - **Lado izquierdo**: Avatar/Mascota de la plataforma (*Passito Concierge*), logotipo oficial de EvenPass, subtítulo *GESTOR OPERATIVO & LOGÍSTICA*, y viñetas de valor (*Operaciones en tiempo real*, *Sesión encriptada y segura*, *Control integral de salones y mesas*).
   - **Lado derecho**: Formulario de credenciales con iconos de usuario y contraseña con botón para revelar clave (*eye toggle*), botón de acción `Ingresar al Sistema →` y sello de seguridad SSL.
2. **Dashboard de Operaciones**:
   - **Sidebar izquierdo colapsable**: Logotipo, menú con contadores dinámicos (*Panel Principal*, *Salones & Croquis*, *Mis Eventos*, *Invitados & RSVP*, *Plantillas*, *Escáner QR Puerta*, *Administrar Usuarios*, *Guía de Uso*), insignia de monitorización y botón para alternar **Modo Oscuro / Modo Claro**.
   - **Barra Superior**: Título contextual, soporte/chat, campana de notificaciones con insignia numérica (`9`), indicador en vivo de base de datos (`● Conectado a PostgreSQL 16`), switch de tema, perfil de usuario (`ERNESTO - Administrador`) y botón de cerrar sesión.
   - **Tarjetas KPI con acento de color**: Eventos en Catálogo, Pases por Confirmar, Confirmaciones Sincronizadas y Pases Validados en Puerta.
   - **Widgets centrales**: Tarjeta de lanzamiento rápido de escáner QR y gráfico radial tipo dona de *Salud del Evento / Confirmaciones* (86% confirmado).
   - **Secciones inferiores de 3 columnas**: Últimos pases validados, últimos pendientes operativos con insignias de estado (*Urgente*, *Pendiente*, *Completada*) y distribución de mesas del salón.

---

## 🏛️ Croquis de Salón & Asignación Automática Inteligente

EvenPass elimina la necesidad de asignar mesas de forma manual o en hojas de cálculo:
- **Visualizador 2D interactivo**: Representación del salón con **Escenario principal / Banda en vivo**, **Pista de baile central**, mesas circulares/rectangulares y **Entrada con escáner QR**.
- **Algoritmo de Bin-Packing Inteligente (`CroquisSeatingService`)**:
  - Al presionar el botón `⚡ Asignar Mesas Automáticamente`, el sistema analiza a todos los invitados confirmados y sus acompañantes.
  - **Mantiene juntas a las familias y parejas**: Nunca separa acompañantes en mesas distintas.
  - Optimiza la capacidad máxima de cada mesa (8, 10 o 12 personas) evitando sobrecupos y sillas aisladas.
  - Indicadores visuales en tiempo real: Anillos de sillas ocupadas, etiquetas de cupo (ej. `10 / 10 Completa`, `4 / 10 Ocupada`).
  - Panel lateral de inspección por mesa: Permite ver la lista detallada de invitados sentados en cada mesa con sus menús o notas dietéticas.

---

## 💌 Catálogo de Plantillas de Invitaciones Digitales

Se incorporaron directamente las plantillas y referencias de diseño solicitadas:
1. **Miriam & Isidro (Gold Luxury Wedding)**:
   - Basada en `d:\invitaciones\miriam-isidro\dist`.
   - Paleta dorado imperial (`#D4AF37`) sobre fondo negro profundo, tipografía clásica *Cormorant Garamond*, bosquejo de iglesia para la ceremonia religiosa, recepción en Hacienda Los Olivos, reproductor de música clásica, cuenta regresiva, política de *No Niños* y generación de pase digital con mesa asignada.
2. **Mis 18 & Fiesta Neón Glow**:
   - Basada en `d:\Descargas\BodaErnesto&Nataly`.
   - Estilo nocturno y cyber con efectos neón fluorescentes (`#FF2A85`), overlay VIP animado, integración directa con Google Maps, código de vestimenta interactivo y audio DJ.
3. **Editorial Minimalista & Summit**:
   - Diseño contemporáneo con tipografía suiza, integración de Google Calendar y acreditación digital para galas y conferencias.

---

## 🛡️ Seguridad y Buenas Prácticas (Spring Security 6 + PostgreSQL)

- **Sesión Stateless con JWT (HS256)**: Tokens criptográficos firmados con claims de usuario y rol.
- **Protección Anti-Inyección SQL**: Consultas 100% parametrizadas mediante Spring Data JPA y Hibernate ORM. Sin concatenación de cadenas SQL.
- **Control de Acceso Basado en Roles (RBAC)**:
  - `ROLE_ADMIN`: Acceso completo a todos los eventos, analítica, configuración de salones y usuarios.
  - `ROLE_ORGANIZER`: Creación y gestión de su evento asignado, carga de invitados y personalización de invitaciones.
  - `ROLE_STAFF`: Acceso exclusivo al escáner de pases en puerta.
- **Prevención de Fraude con Pases QR (Anti-Replay)**:
  - Cada pase cuenta con un folio único generado con UUID seguro.
  - Al escanearse en puerta, el pase queda marcado como `ATTENDED`. Si alguien intenta compartir una captura de pantalla, el escáner detecta de inmediato el duplicado, emite una alerta roja y registra el incidente en la bitácora de auditoría.
- **CORS Configurado**: Permite la comunicación segura entre el frontend Angular y el backend Spring Boot.

---

## 📂 Estructura del Proyecto

```text
EvenPass/
├── landing/                          # Landing Page profesional y optimizada
│   ├── index.html                    # Página de presentación con demostrador interactivo
│   ├── css/style.css                 # Sistema de diseño minimalista con modo claro/oscuro
│   ├── js/landing.js                 # Lógica interactiva: escáner hero, simulador de croquis y modales
│   └── assets/                       # Logotipos SVG, iconos y recursos de plantillas
│
├── evenpass-backend/                 # Backend en Spring Boot 3 + Java 21/23
│   ├── pom.xml                       # Dependencias: Web, Security, JPA, Validation, PostgreSQL, JWT
│   └── src/main/java/com/evenpass/
│       ├── config/                   # SecurityConfig, CorsConfig, GlobalExceptionHandler, DataInitializer
│       ├── controller/               # AuthController, EventController, SalonController, GuestController, ScanController
│       ├── dto/                      # DTOs fuertemente tipados con validaciones de Bean Validation
│       ├── entity/                   # User, Role, Event, Salon, SalonTable, Guest, CheckInLog, InvitationTemplate
│       ├── repository/               # Repositorios JPA seguros contra inyección SQL
│       ├── security/                 # JwtTokenProvider, JwtAuthenticationFilter, UserDetailsService
│       └── service/                  # CroquisSeatingService (Algoritmo de asignación de mesas), ScanService
│
├── evenpass-frontend/                # Frontend en Angular 19 (Componentes Standalone)
│   ├── src/app/
│   │   ├── components/
│   │   │   ├── login/                # Pantalla de Login (Split Card con Passito y SSL)
│   │   │   ├── layout/               # Shell con Sidebar con scroll y switcher de evento
│   │   │   ├── dashboard/            # Panel operativo contextual al evento activo
│   │   │   ├── croquis/              # Plano CAD oficial (16 mesas, zoom 1:1, auto-assign, PDF)
│   │   │   ├── events/               # Catálogo de eventos con anfitriones y estados
│   │   │   ├── guests/               # Invitados, pases QR, RSVP y WhatsApp
│   │   │   ├── itinerary/            # Cronograma operativo y horarios del evento
│   │   │   ├── history/              # Historial de eventos concluidos y auditoría
│   │   │   ├── templates/            # Plantillas (Miriam & Isidro, Neón Party, Editorial)
│   │   │   ├── scanner/              # Escáner QR de puerta con cámara y registro en vivo
│   │   │   ├── users/                # Gestión de usuarios y roles RBAC
│   │   │   ├── settings/             # Configuración del sistema, anti-replay y WhatsApp
│   │   │   ├── guia/                 # Manual operativo paso a paso
│   │   │   └── support/              # Centro de soporte concierge 24/7 y tickets
│   │   ├── icon.component.ts         # Biblioteca central de iconos vectoriales SVG
│   │   ├── models/                   # Interfaces TypeScript fuertemente tipadas
│   │   └── services/                 # AuthService, EventService, ThemeService, NotificationService
│   └── dist/evenpass-frontend/browser/ # Build de producción compilado y optimizado
│
├── index.html                        # Redirección raíz a la Landing Page
└── start-dev.ps1                     # Script interactivo de inicio rápido
```

---

## 🚀 Cómo Ejecutar el Proyecto

### Opción 1: Inicio Rápido con el Script PowerShell
En la raíz del proyecto, ejecuta:
```powershell
.\start-dev.ps1
```
El menú te permitirá iniciar el backend, el frontend de desarrollo, o abrir directamente la versión lista para usar en el navegador.

### Opción 2: Iniciar el Backend Spring Boot
```powershell
cd evenpass-backend
mvn spring-boot:run
```
El servidor arrancará en `http://localhost:8080`.
- **Base de Datos**: Por defecto inicia en modo `dev` con H2 en compatibilidad PostgreSQL (o puedes activar el perfil `prod` para conectarte a tu instancia local de PostgreSQL en el puerto `5432`).

### Opción 3: Iniciar el Frontend Angular
```powershell
cd evenpass-frontend
npm start
```
Abre tu navegador en `http://localhost:4200`.

### Opción 4: Visualizar el Build Compilado Directamente
Puedes abrir directamente en cualquier navegador:
- **Landing Page**: `d:\vs-code-programas\EvenPass\landing\index.html`
- **Plataforma EvenPass SaaS**: `d:\vs-code-programas\EvenPass\evenpass-frontend\dist\evenpass-frontend\browser\index.html`

---

## 🔑 Credenciales de Acceso Iniciales

| Usuario | Contraseña | Rol | Nombre |
| :--- | :--- | :--- | :--- |
| **`ernesto`** | `admin123` *(o cualquier contraseña en demo)* | **`ROLE_ADMIN`** | **ERNESTO** (Administrador) |
| **`organizador`** | `demo123` | **`ROLE_ORGANIZER`** | Laura Méndez |
| **`recepcion`** | `demo123` | **`ROLE_STAFF`** | Personal de Entrada |

