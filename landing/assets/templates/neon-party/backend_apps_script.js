// =======================================================================
// INSTRUCCIONES DE CONFIGURACIÓN (Apps Script)
// =======================================================================
const sheetName = 'Respuestas';
const scriptProp = PropertiesService.getScriptProperties();

// Esta función enlaza el script con la hoja actual
function initialSetup () {
  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  scriptProp.setProperty('key', activeSpreadsheet.getId());
}

// ---------------------------------------------------------
// FUNCION POST: GUARDA LAS RESPUESTAS DEL FORMULARIO
// ---------------------------------------------------------
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const doc = SpreadsheetApp.openById(scriptProp.getProperty('key'));
    let sheet = doc.getSheetByName(sheetName);

    // AUTO-CREAR LA HOJA Y ENCABEZADOS SI NO EXISTEN (A PRUEBA DE ERRORES)
    if (!sheet) {
      sheet = doc.insertSheet(sheetName);
    }
    if (sheet.getLastColumn() === 0) {
      sheet.appendRow(['Fecha', 'Nombre', 'Asistencia', 'Pases', 'Código QR', 'Estado en Puerta']);
    }

    // --- ACCION: SYNC OFFLINE MASIVO (ESCÁNER PWA) ---
    if (e.parameter.action === 'sync' && e.parameter.data) {
        const syncData = JSON.parse(e.parameter.data);
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const qrIndex = headers.indexOf('Código QR');
        let statusIndex = headers.indexOf('Estado en Puerta');
        
        if (statusIndex === -1) {
            statusIndex = headers.length;
            sheet.getRange(1, statusIndex + 1).setValue('Estado en Puerta');
        }
        
        let syncedCount = 0;
        for (let i = 1; i < data.length; i++) {
            if (syncData.includes(data[i][qrIndex])) {
                if (data[i][statusIndex] !== '🎟️ Ingresó') {
                    sheet.getRange(i + 1, statusIndex + 1).setValue('🎟️ Ingresó');
                    syncedCount++;
                }
            }
        }
        return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'synced': syncedCount })).setMimeType(ContentService.MimeType.JSON);
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // --- SEGURIDAD ANTI-DUPLICADOS ---
    const dataRangeFull = sheet.getDataRange().getValues();
    const nameIdx = headers.indexOf('Nombre');
    const guestName = e.parameter['nombre'] || '';
    let targetRow = sheet.getLastRow() + 1; // Por defecto nueva fila
    
    // Buscar si el nombre ya está registrado
    for (let i = 1; i < dataRangeFull.length; i++) {
        if (dataRangeFull[i][nameIdx] === guestName && guestName !== '') {
            // BLOQUEO: Si ya se generó un código QR para este invitado, no permitir otro
            const existingQr = dataRangeFull[i][headers.indexOf('Código QR')];
            if (existingQr && existingQr !== '' && existingQr !== 'NO_ASISTE') {
                return ContentService
                  .createTextOutput(JSON.stringify({ 'result': 'error', 'error': 'El enlace ha caducado. Ya se generó un pase.' }))
                  .setMimeType(ContentService.MimeType.JSON);
            }
            targetRow = i + 1; // Sobreescribir fila existente si no tenía QR o si no asistía
            break;
        }
    }

    const newRow = headers.map(function(header) {
      if (header === 'Fecha') {
        return new Date();
      } else if (header === 'Nombre') {
        return guestName;
      } else if (header === 'Asistencia') {
        return e.parameter['asistencia'] || '';
      } else if (header === 'Pases') {
        return e.parameter['asistencia'] === 'Sí' ? (e.parameter['pases'] || '0') : '0';
      } else if (header === 'Código QR') {
        return e.parameter['qr_code'] || '';
      } else {
        return '';
      }
    });

    sheet.getRange(targetRow, 1, 1, newRow.length).setValues([newRow]);

    // --- CONTEO TOTAL DE PASES ---
    const dataRange = sheet.getDataRange().getValues();
    let totalAsistiran = 0;
    const passesIdx = headers.indexOf('Pases');
    if (passesIdx !== -1) {
      for (let i = 1; i < dataRange.length; i++) {
        const val = parseInt(dataRange[i][passesIdx]);
        if (!isNaN(val)) totalAsistiran += val;
      }
    }
    // Escribir el total en las celdas H1 e I1
    sheet.getRange("H1").setValue("TOTAL CONFIRMADOS:");
    sheet.getRange("H1").setFontWeight("bold").setBackground("#d4edda");
    sheet.getRange("I1").setValue(totalAsistiran);
    sheet.getRange("I1").setFontWeight("bold").setFontSize(14);

    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'success', 'row': targetRow }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------
// FUNCION GET: PROCESA EL ESCÁNER QR Y EL PANEL DE ADMINISTRADOR
// ---------------------------------------------------------
function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    const doc = SpreadsheetApp.openById(scriptProp.getProperty('key'));
    const sheet = doc.getSheetByName(sheetName);
    if (!sheet) throw new Error("No hay hoja de respuestas");
    
    // --- ACCIÓN 1: CHECKIN (ESCÁNER) ---
    if (e.parameter.action === 'checkin' && e.parameter.qr_id) {
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const qrIndex = headers.indexOf('Código QR');
      const nameIndex = headers.indexOf('Nombre');
      const passIndex = headers.indexOf('Pases');
      let statusIndex = headers.indexOf('Estado en Puerta');
      
      if (statusIndex === -1) {
        statusIndex = headers.length;
        sheet.getRange(1, statusIndex + 1).setValue('Estado en Puerta');
      }
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][qrIndex] === e.parameter.qr_id) {
          const currentStatus = data[i][statusIndex];
          if (currentStatus === '🎟️ Ingresó') {
             return ContentService.createTextOutput(JSON.stringify({ 'status': 'error', 'message': 'Este pase ya fue escaneado antes.' })).setMimeType(ContentService.MimeType.JSON);
          } else {
             sheet.getRange(i + 1, statusIndex + 1).setValue('🎟️ Ingresó');
             return ContentService.createTextOutput(JSON.stringify({ 'status': 'success', 'nombre': data[i][nameIndex], 'pases': data[i][passIndex] })).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ 'status': 'error', 'message': 'Código QR no encontrado.' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // --- ACCIÓN 2: OBTENER LISTA EN VIVO (PANEL DE CONTROL Y ESCÁNER) ---
    if (e.parameter.action === 'get_list') {
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const nameIdx = headers.indexOf('Nombre');
      const attendanceIdx = headers.indexOf('Asistencia');
      const passesIdx = headers.indexOf('Pases');
      const qrIdx = headers.indexOf('Código QR');
      
      let invitados = [];
      let totalPasesConfirmados = 0;
      
      for (let i = 1; i < data.length; i++) {
         const row = data[i];
         const pases = parseInt(row[passesIdx]) || 0;
         if (row[attendanceIdx] === 'Sí') {
             totalPasesConfirmados += pases;
         }
         
         invitados.push({
           nombre: row[nameIdx],
           asistencia: row[attendanceIdx],
           pases: pases,
           qr: row[qrIdx]
         });
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
         'status': 'success', 
         'total': totalPasesConfirmados, 
         'lista': invitados.reverse() // Los más recientes primero
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput("Servidor Activo - Panel Ivonne").setMimeType(ContentService.MimeType.TEXT);
    
  } catch (error) {
     return ContentService.createTextOutput(JSON.stringify({ 'status': 'error', 'message': error.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
