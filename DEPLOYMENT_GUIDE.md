# Guía Maestra de Despliegue: Supabase, Vercel y Render · EvenPass OS

Esta guía contiene las instrucciones exactas y ordenadas para desplegar **EvenPass** en producción con base de datos en la nube (Supabase), frontend (Vercel) y backend (Render).

---

## 1. Base de Datos en la Nube: Supabase (PostgreSQL)

### Pasos:
1. Entra a [https://supabase.com](https://supabase.com) e inicia sesión o crea tu cuenta gratuita.
2. Haz clic en **"New Project"** (Nuevo Proyecto):
   - **Name:** `evenpass-prod`
   - **Database Password:** Guarda bien la contraseña que definas aquí (la necesitarás para Render).
   - **Region:** Selecciona la más cercana a tu audiencia (ej. `us-east-1` o `us-west-1`).
3. Una vez creado el proyecto (tarda ~1 minuto), en el menú lateral izquierdo ve a **SQL Editor** (ícono de consola SQL).
4. Haz clic en **"New Query"**, abre el archivo [`supabase_schema.sql`](./supabase_schema.sql) que dejamos en la raíz del proyecto, copia todo su contenido y pégalo en el editor.
5. Haz clic en **"Run"** (o presiona `Ctrl + Enter`).
   - Se crearán todas las tablas: `events`, `guests`, `salons`, `salon_tables`, `users`, `invitation_templates`, `itinerary_items`, `check_in_logs`, `support_tickets`.
   - Se activarán las políticas RLS (Row Level Security) que permiten que las invitaciones registren confirmaciones (RSVP) de forma pública e inmediata.
   - Se activarán los triggers de auto-recálculo de comensales y aforo.
   - Se insertarán los datos iniciales de recintos arquitectónicos, plantillas de gala y cuentas de operadores del sistema.
6. En el menú lateral, ve a **Project Settings** -> **Database**:
   - Tu host de conexión Pooler (IPv4): `aws-1-us-west-2.pooler.supabase.com`
   - Tu URL JDBC de conexión: `jdbc:postgresql://aws-1-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require`
   - Tu usuario de conexión: `postgres.wxvueavcyylgnbpksplr`

---

## 2. Despliegue del Frontend en Vercel (Angular PWA + Landing)

### Opción A: Despliegue de la Aplicación Angular (`evenpass-frontend`)
1. Entra a [https://vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"Add New..."** -> **"Project"**.
3. Importa tu repositorio `EvenPass` (de `NetilloJunior8/EvenPass`).
4. En la configuración del proyecto:
   - **Root Directory:** Selecciona `evenpass-frontend`.
   - **Framework Preset:** `Angular`.
   - **Build Command:** `npm run build` (automático).
   - **Output Directory:** `dist/evenpass-frontend/browser` (ya configurado en [`vercel.json`](./evenpass-frontend/vercel.json)).
5. Haz clic en **"Deploy"**. Vercel compilará la aplicación y te entregará una URL HTTPS protegida (ej. `https://evenpass.vercel.app`).

### Opción B: Despliegue de la Landing Page
- Si deseas desplegar la Landing informativa para clientes en otro dominio o subdominio:
  - En Vercel crea un nuevo proyecto apuntando a la carpeta `landing`.
  - Framework Preset: `Other` (HTML/CSS estático).
  - No requiere build command.

---

## 3. Despliegue del Backend en Render (Spring Boot 3 + Java 21)

Ya dejamos preparado el archivo de infraestructura como código [`render.yaml`](./render.yaml) en la raíz del repositorio.

### Método 1: Despliegue Automático mediante Blueprint (1 Clic)
1. Entra a [https://render.com](https://render.com).
2. Haz clic en **"New +"** -> **"Blueprint"**.
3. Conecta tu repositorio `EvenPass`. Render detectará automáticamente el archivo `render.yaml`.
4. En los campos de variables, introduce:
   - `SPRING_DATASOURCE_URL`: `jdbc:postgresql://aws-1-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require`
   - `SPRING_DATASOURCE_USERNAME`: `postgres.wxvueavcyylgnbpksplr`
   - `SPRING_DATASOURCE_PASSWORD`: La contraseña de tu base de datos de Supabase.
5. Haz clic en **"Apply"**. Render compilará con Maven y levantará el servicio backend.

### Método 2: Despliegue Manual como Web Service
1. En Render, selecciona **"New +"** -> **"Web Service"**.
2. Conecta tu repositorio.
3. Configuración:
   - **Name:** `evenpass-backend`
   - **Language:** `Java`
   - **Root Directory:** `evenpass-backend`
   - **Build Command:** `mvn clean package -DskipTests`
   - **Start Command:** `java -jar target/evenpass-backend-1.0.0.jar --spring.profiles.active=prod`
4. En **Environment Variables**, agrega:
   - `SPRING_PROFILES_ACTIVE` = `prod`
   - `SPRING_DATASOURCE_URL` = `jdbc:postgresql://db.wxvueavcyylgnbpksplr.supabase.co:5432/postgres?sslmode=require`
   - `SPRING_DATASOURCE_USERNAME` = `postgres`
   - `SPRING_DATASOURCE_PASSWORD` = (contraseña de tu proyecto Supabase)
   - `EVENPASS_CORS_ALLOWED_ORIGINS` = `*` (o tu URL de Vercel)
5. Haz clic en **"Create Web Service"**.

---

## 4. Verificación de Funcionamiento

Una vez desplegado:
1. **Invitaciones y RSVP:** Cualquier invitado que confirme asistencia en su invitación web o móvil enviará un registro a Supabase con el `event_id` correspondiente.
2. **EvenPass OS:** El panel de EvenPass sincronizará los invitados, permitiendo asignarlos en el croquis del salón y validarlos mediante el escáner QR en puerta.
3. **Escáner Puerta:** Compatible con dispositivos móviles (cámara web / celular) o lectores de código láser.
