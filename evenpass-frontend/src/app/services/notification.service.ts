import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp?: string;
  read?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  toasts = signal<ToastMessage[]>([]);
  history = signal<ToastMessage[]>([
    {
      id: 1,
      type: 'info',
      title: 'Sistema Iniciado',
      message: 'EvenPass Event OS activo y listo para operar.',
      timestamp: 'Hoy, ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      read: true
    }
  ]);
  unreadCount = signal<number>(0);

  constructor() {
    this.listenForExternalIncidents();
  }

  show(type: 'success' | 'error' | 'info' | 'warning', title: string, message: string): void {
    const id = Date.now();
    const timeStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const item: ToastMessage = { id, type, title, message, timestamp: timeStr, read: false };

    // 1. Add to active floating toasts
    this.toasts.update(list => [item, ...list]);

    // 2. Add to bell history & unread counter
    this.history.update(h => [item, ...h.slice(0, 19)]);
    this.unreadCount.update(c => c + 1);

    // 3. Auto dismiss toast after 4.5 seconds
    setTimeout(() => {
      this.remove(id);
    }, 4500);
  }

  remove(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  markAllRead(): void {
    this.unreadCount.set(0);
    this.history.update(list => list.map(item => ({ ...item, read: true })));
  }

  private listenForExternalIncidents(): void {
    // Check if client submitted an incident via landing page link
    try {
      window.addEventListener('storage', (e) => {
        if (e.key === 'evenpass_latest_client_incident' && e.newValue) {
          const incident = JSON.parse(e.newValue);
          this.show(
            'warning',
            `Reporte de Cliente: ${incident.folio || 'Incidencia'}`,
            `${incident.clientName || 'Cliente'}: ${incident.issue || 'Nuevo requerimiento para su evento.'}`
          );
        }
      });
    } catch {
      // Storage events not available in isolated context
    }
  }
}
