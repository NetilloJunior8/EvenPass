# Invitación Digital VIP · Mis 10 Años (Luis Gerardo)
**Proyecto Independiente de Demostración en Vivo para EvenPass**

Esta carpeta contiene una invitación web digital interactiva, moderna y estética, diseñada específicamente para el cumpleaños número 10 de **Luis Gerardo**. Está construida con tecnología web pura (HTML5, CSS3 moderno con Glassmorphism y JavaScript nativo), 100% autónoma y lista para probarse en cualquier navegador móvil o de escritorio sin dependencias externas.

---

## 🌟 Características Destacadas

1. **Diseño Visual de Vanguardia (Nivel 10 Desbloqueado):**
   - Paleta de colores neón cósmica (Cian Eléctrico `#06b6d4`, Púrpura `#8b5cf6`, Dorado `#f59e0b` y Fondo Oscuro `#070913`).
   - Tipografía moderna con Google Fonts (*Outfit* y *Plus Jakarta Sans*).
   - Efectos de *glassmorphism* con desenfoque de fondo y bordes brillantes.
   - Totalmente responsivo para celulares (iPhone y Android) y computadoras.

2. **Cuenta Regresiva en Tiempo Real:**
   - Calcula y actualiza segundo a segundo los días, horas, minutos y segundos restantes para el sábado 14 de noviembre de 2026 a las 4:00 PM.

3. **Ubicación & Coordenadas Interactivas:**
   - Detalles de **Arena Laser Quest & Jump Park (Salón Neón VIP)**.
   - Enlaces de un solo clic para abrir directamente en **Google Maps** o **Waze**.

4. **Cronograma de Actividades (Timeline Dinámico):**
   - Recepción, Torneo Laser Tag, Trampolines, Pizza Party, Pastel con Mañanitas y Sorpresas.

5. **Panel de Confirmación de Asistencia (RSVP):**
   - Selector interactivo de asistencia ("¡Sí, ahí estaré!" / "No podré asistir").
   - Contador de pases táctil con botones `+` y `-` (para indicar cuántos niños y adultos asistirán).
   - Campo para mensaje o dedicatoria a Luis Gerardo.

6. **Generador Inmediato de Pase Digital VIP con QR:**
   - Al enviar la confirmación, se genera al vuelo un **Boleto Digital VIP**.
   - Dibuja un **Código QR real en Canvas** con el folio único de acceso (ejemplo: `LG10-VIP-4819`).
   - Botón directo para **Notificar a los Papás por WhatsApp** con el mensaje y folio pre-rellenados.
   - Botón para guardar o imprimir el pase digital.

7. **Efectos Especiales Integrados:**
   - **Cañón de Confeti:** Renderizado a 60 FPS en `<canvas>` nativo.
   - **Audio Fanfarria & Música:** Síntesis sonora con la API Web Audio del navegador (sin necesidad de archivos MP3 externos).

8. **Padrón de Confirmados en Vivo (Modo Anfitrión / Demo):**
   - En la parte inferior, pulsa *"Ver Padrón de Confirmados en Vivo"* para abrir el monitor en tiempo real con estadísticas de pases confirmados, familias y lista de folios.

---

## 🚀 ¿Cómo Abrir y Probar la Invitación?

### Opción 1: Directamente desde el Explorador de Archivos
1. Dirígete a la carpeta:
   ```text
   d:\vs-code-programas\EvenPass\ejemplo-invitacion-luis-gerardo\
   ```
2. Haz doble clic en el archivo **`index.html`**. Se abrirá de inmediato en tu navegador preferido (Chrome, Edge, Firefox, Safari).

### Opción 2: Con un Servidor Local Ligero (Opcional)
Si deseas abrirlo como servidor HTTP local:
```powershell
# En PowerShell dentro de la carpeta:
cd d:\vs-code-programas\EvenPass\ejemplo-invitacion-luis-gerardo
python -m http.server 3000
```
Y abre tu navegador en `http://localhost:3000`.

---

## 🔗 Conexión con Supabase / EvenPass Backend
Para vincular esta invitación directamente a la tabla `ep_guests` de Supabase o al backend Spring Boot de EvenPass, solo se debe reemplazar la función `saveGuestToStorage` en `app.js` por una llamada `fetch`:

```javascript
// Ejemplo de conexión con EvenPass:
await fetch('http://localhost:8080/api/public/rsvp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventId: 1, // ID del evento
    fullName: fullName,
    phone: phone,
    confirmedPasses: passesCount,
    qrToken: folioCode,
    notes: notes,
    status: isAttending ? 'CONFIRMED' : 'DECLINED'
  })
});
```
