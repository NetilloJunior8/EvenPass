import { Component, signal, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EventService } from '../../services/event.service';
import { Guest, CheckInLog } from '../../models/models';
import { NotificationService } from '../../services/notification.service';
import { IconComponent } from '../icon.component';
import jsQR from 'jsqr';

@Component({
  selector: 'app-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, RouterLink],
  template: `
    <div class="scanner-page-container">

      <!-- ============================================================== -->
      <!-- RESTRICTED VIEW: IF EVENT PLAN DOES NOT INCLUDE SCANNER        -->
      <!-- ============================================================== -->
      <div *ngIf="!isScannerIncluded()" class="scanner-restricted-wrapper">
        <div class="restricted-card-box">
          <div class="restricted-icon-bubble">
            <app-icon name="shield" [size]="38"></app-icon>
          </div>

          <div class="plan-tag-strip">
            <span class="plan-name-badge">
              PLAN BÁSICO (ESENCIAL) · ESCÁNER BLOQUEADO
            </span>
          </div>

          <h2>Módulo Bloqueado para este Plan</h2>
          <p class="restricted-lead">
            El evento activo <strong>"{{ eventService.selectedEvent()?.name }}"</strong> está registrado en 
            <strong>Plan Básico</strong>. El escáner QR de puerta y control de acceso en vivo están disponibles a partir del 
            <strong>Plan Estándar</strong> o <strong>Plan Premium Pro</strong>.
          </p>

          <!-- 5-Day Upgrade Window Policy Status -->
          <div class="plan-lock-status-box" [class.window-open]="canUpgrade().allowed" [class.window-closed]="!canUpgrade().allowed">
            <div class="status-icon-col">
              <app-icon [name]="canUpgrade().allowed ? 'clock' : 'alert-triangle'" [size]="22"></app-icon>
            </div>
            <div class="status-text-col">
              <strong>{{ canUpgrade().allowed ? 'Ventana de Actualización Disponible' : 'Cambio de Plan Bloqueado' }}</strong>
              <p>{{ canUpgrade().message }}</p>
            </div>
          </div>

          <div class="restricted-actions-row">
            <button 
              *ngIf="canUpgrade().allowed" 
              class="btn-upgrade-plan-action" 
              (click)="upgradeCurrentEventToStandard()"
            >
              <app-icon name="sparkles" [size]="16"></app-icon>
              <span>Actualizar a Plan Estándar con Escáner ({{ canUpgrade().remainingDays }} días restantes)</span>
            </button>
            <a routerLink="/dashboard" class="btn-return-link">
              <app-icon name="arrow-left" [size]="14"></app-icon>
              <span>Volver al Panel del Evento</span>
            </a>
          </div>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- FULL SCANNER INTERFACE: ONLY WHEN PLAN INCLUDES SCANNER        -->
      <!-- ============================================================== -->
      <ng-container *ngIf="isScannerIncluded()">

      <!-- Header Box -->
      <div class="scanner-header-card">
        <div>
          <h2>Control de Acceso &amp; Escáner QR en Puerta</h2>
          <p>
            Valida pases en tiempo real para: <b>{{ eventService.selectedEvent()?.name }}</b> · 
            Anfitrión: <b>{{ eventService.selectedEvent()?.hostName }}</b>
          </p>
        </div>
        <div class="scanner-kpi-pill">
          <span>Ingresados al Salón:</span>
          <b>{{ eventService.selectedEvent()?.attendedGuests || 0 }} / {{ eventService.selectedEvent()?.confirmedGuests || 0 }}</b>
        </div>
      </div>

      <!-- Offline Resilience Mode Bar -->
      <div class="offline-resilience-bar" [class.offline-active]="isOfflineMode()">
        <div class="offline-status-col">
          <span class="status-indicator-badge" [class.badge-offline]="isOfflineMode()" [class.badge-online]="!isOfflineMode()">
            <span class="pulse-dot"></span>
            {{ isOfflineMode() ? '⚡ MODO OFFLINE ACTIVO (EN PUERTA SIN INTERNET)' : '● MODO EN LÍNEA (CONECTADO A LA RED)' }}
          </span>
          <small class="offline-meta">
            {{ isOfflineMode() ? 'Validando pases contra la memoria local del dispositivo. No requiere Wi-Fi ni datos.' : 'Validación instantánea en milisegundos con anti-duplicados en tiempo real.' }}
          </small>
        </div>

        <div class="offline-actions-col">
          <input type="file" #offlineFileInput accept=".csv,.txt,.json" style="display: none;" (change)="onOfflineFileSelected($event)">

          <button *ngIf="!isOfflineMode()" class="btn-resilience" (click)="cacheForOffline()" title="Guardar lista en este dispositivo para prevenir fallas de red">
            <app-icon name="download" [size]="14"></app-icon>
            <span>Guardar en Caché Local</span>
          </button>

          <button class="btn-resilience" (click)="offlineFileInput.click()" title="Importar archivo de invitados directamente si no hay conexión">
            <app-icon name="upload" [size]="14"></app-icon>
            <span>Cargar Archivo al Celular</span>
          </button>

          <button class="btn-resilience-toggle" [class.active]="isOfflineMode()" (click)="toggleOfflineMode()">
            <app-icon [name]="isOfflineMode() ? 'shield' : 'wifi'" [size]="14"></app-icon>
            <span>{{ isOfflineMode() ? 'Volver a En Línea' : 'Activar Modo Offline' }}</span>
          </button>

          <button *ngIf="offlineQueue().length > 0" class="btn-sync-action" (click)="syncOfflineQueue()" title="Sincronizar pases validados con el servidor central">
            <app-icon name="sparkles" [size]="14"></app-icon>
            <span>Sincronizar ({{ offlineQueue().length }} pases)</span>
          </button>
        </div>
      </div>

      <!-- Main Scanner Layout -->
      <div class="scanner-two-columns">

        <!-- Left: Camera Viewfinder & Manual Input -->
        <div class="viewfinder-card">
          <div class="viewfinder-top-bar">
            <div class="viewfinder-title-row">
              <span class="event-name-pill">{{ eventService.selectedEvent()?.name }}</span>
              <span class="live-dot" [class.dot-offline]="isOfflineMode()" [class.dot-active]="isCameraActive()">
                {{ isCameraActive() ? '● Cámara Transmitiendo' : '○ Cámara en Pausa' }}
              </span>
            </div>

            <!-- Camera Hardware Controls -->
            <div class="cam-controls-row">
              <button 
                type="button" 
                class="btn-cam-control" 
                [class.active]="isCameraActive()" 
                (click)="toggleCamera()"
                [title]="isCameraActive() ? 'Detener cámara' : 'Iniciar escáner de cámara'"
              >
                <app-icon [name]="isCameraActive() ? 'x' : 'camera'" [size]="14"></app-icon>
                <span>{{ isCameraActive() ? 'Apagar Cámara' : 'Iniciar Cámara' }}</span>
              </button>

              <button 
                *ngIf="isCameraActive()" 
                type="button" 
                class="btn-cam-control" 
                (click)="switchCamera()" 
                title="Cambiar entre cámara trasera y delantera"
              >
                <app-icon name="sync" [size]="14"></app-icon>
                <span>{{ facingMode() === 'environment' ? 'Cámara Trasera' : 'Cámara Frontal' }}</span>
              </button>

              <button 
                *ngIf="isCameraActive()" 
                type="button" 
                class="btn-cam-control" 
                [class.active]="torchOn()" 
                (click)="toggleTorch()" 
                title="Encender linterna / flash"
              >
                <app-icon name="sparkles" [size]="14"></app-icon>
                <span>{{ torchOn() ? 'Luz ON' : 'Flash' }}</span>
              </button>
            </div>
          </div>

          <!-- The Viewfinder Box with Real Video -->
          <div class="viewfinder-box" [class.camera-running]="isCameraActive()">
            <!-- Real HTML5 Video Stream -->
            <video #scannerVideo autoplay playsinline muted class="camera-stream-video" [class.hidden]="!isCameraActive()"></video>

            <!-- Placeholder overlay when camera is paused -->
            <div *ngIf="!isCameraActive()" class="camera-placeholder-overlay">
              <div class="center-target-icon">
                <app-icon name="camera" [size]="38"></app-icon>
              </div>
              <p class="cam-guide-text">Cámara en espera</p>
              <button type="button" class="btn-action btn-sm" (click)="startCamera()">
                <app-icon name="camera" [size]="14"></app-icon>
                <span>Activar Escaneo en Vivo</span>
              </button>
            </div>

            <!-- Optical HUD Overlay & Laser -->
            <div class="scan-laser-beam" *ngIf="isCameraActive()"></div>
            <div class="viewfinder-corners">
              <div class="corner c-tl"></div>
              <div class="corner c-tr"></div>
              <div class="corner c-bl"></div>
              <div class="corner c-br"></div>
            </div>
          </div>

          <!-- Scan Result Alert Banner -->
          <div *ngIf="lastScanResult()" class="scan-result-card" [ngClass]="{
            'res-authorized': lastScanResult()?.type === 'AUTHORIZED',
            'res-duplicate': lastScanResult()?.type === 'ALREADY_USED',
            'res-invalid': lastScanResult()?.type === 'INVALID'
          }">
            <div class="res-icon">
              <app-icon [name]="lastScanResult()?.type === 'AUTHORIZED' ? 'check-circle' : (lastScanResult()?.type === 'ALREADY_USED' ? 'alert-triangle' : 'x')" [size]="24"></app-icon>
            </div>
            <div class="res-info">
              <h4>{{ lastScanResult()?.message }}</h4>
              <div *ngIf="lastScanResult()?.guest" class="res-guest-meta">
                <strong>{{ lastScanResult()?.guest?.fullName }}</strong> · 
                <span>{{ lastScanResult()?.guest?.totalPasses }} pases</span> · 
                <b class="table-hl">{{ lastScanResult()?.guest?.assignedTableName || 'Mesa por asignar' }}</b>
              </div>
            </div>
          </div>

          <!-- Manual Code Entry Form -->
          <div class="manual-scan-box">
            <label class="manual-label">INGRESO MANUAL DE FOLIO QR</label>
            <div class="manual-input-group">
              <input 
                type="text" 
                [(ngModel)]="qrInput" 
                placeholder="Ej. EP-9902" 
                (keyup.enter)="executeScan(qrInput)"
              >
              <button class="btn-action" (click)="executeScan(qrInput)">Validar Pase</button>
            </div>
          </div>

          <!-- Quick Test Buttons for Simulation -->
          <div class="quick-test-bar">
            <small>Pruebas interactivas de simulación instantánea:</small>
            <div class="quick-buttons-row">
              <button 
                *ngFor="let sample of getSampleGuestsForTesting()" 
                class="btn-outline btn-xs" 
                (click)="executeScan(sample.qrCodeToken)"
                [title]="sample.fullName + ' · ' + sample.qrCodeToken"
              >
                Pase: {{ sample.fullName.split(' ')[0] }} ({{ sample.qrCodeToken }})
              </button>
              <button class="btn-outline btn-xs btn-test-dup" (click)="executeScan('EP-9901')">
                Probar Duplicado (EP-9901)
              </button>
              <button class="btn-outline btn-xs btn-test-inv" (click)="executeScan('EP-0000')">
                Probar Inválido (EP-0000)
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Recent Entry Log Stream -->
        <div class="logs-stream-card">
          <div class="logs-header">
            <h3>Registro de Validaciones en Vivo</h3>
            <span class="badge badge-info">Puerta Principal</span>
          </div>

          <div class="logs-list">
            <div *ngFor="let log of getCombinedLogs()" class="log-stream-item">
              <div class="log-avatar" [ngClass]="{
                'bg-green': log.status === 'AUTHORIZED',
                'bg-red': log.status === 'ALREADY_USED',
                'bg-gray': log.status === 'INVALID'
              }">
                <app-icon [name]="log.status === 'AUTHORIZED' ? 'check' : (log.status === 'ALREADY_USED' ? 'alert-triangle' : 'x')" [size]="14"></app-icon>
              </div>

              <div class="log-body">
                <div class="log-top">
                  <strong>{{ log.guestName }}</strong>
                  <small>{{ log.scanTimestamp }}</small>
                </div>
                <div class="log-sub">
                  <span>{{ log.assignedTableName || 'Sin mesa' }}</span> · 
                  <small>{{ log.notes }}</small>
                </div>
              </div>

              <span class="badge" [ngClass]="{
                'badge-completed': log.status === 'AUTHORIZED',
                'badge-urgent': log.status === 'ALREADY_USED',
                'badge-danger': log.status === 'INVALID'
              }">
                {{ log.status === 'AUTHORIZED' ? 'Ingresado' : (log.status === 'ALREADY_USED' ? 'Re-ingreso Bloqueado' : 'Inválido') }}
              </span>
            </div>
          </div>
        </div>

      </div>
      </ng-container>

    </div>
  `,
  styles: [`
    .scanner-page-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Restricted Mode When Event Plan Does Not Include Scanner */
    .scanner-restricted-wrapper {
      padding: 30px 10px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 65vh;
    }

    .restricted-card-box {
      max-width: 820px;
      width: 100%;
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-xl, 18px);
      padding: 40px 48px;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.1);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .restricted-icon-bubble {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(2, 132, 199, 0.08);
      border: 1px solid rgba(2, 132, 199, 0.25);
      color: var(--brand-blue, #0284c7);
      display: grid;
      place-items: center;
      position: relative;
      margin-bottom: 20px;
    }

    .lock-pill-badge {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #f59e0b;
      color: #fff;
      display: grid;
      place-items: center;
      border: 2px solid var(--bg-card);
    }

    .plan-tag-strip {
      margin-bottom: 12px;
    }

    .plan-name-badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 1px;
      padding: 4px 12px;
      border-radius: 9999px;
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
    }

    .restricted-card-box h2 {
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0 0 12px;
    }

    .restricted-lead {
      font-size: 0.95rem;
      color: var(--text-secondary);
      max-width: 660px;
      line-height: 1.6;
      margin: 0 0 28px;
    }

    .plan-lock-status-box {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      border-radius: var(--radius-md, 12px);
      margin-bottom: 24px;
      text-align: left;
      max-width: 660px;
      width: 100%;
    }

    .plan-lock-status-box.window-open {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: var(--text-main);
    }

    .plan-lock-status-box.window-closed {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: var(--text-main);
    }

    .status-icon-col {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    .window-open .status-icon-col {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }

    .window-closed .status-icon-col {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    .status-text-col strong {
      display: block;
      font-size: 0.95rem;
      font-weight: 800;
      margin-bottom: 3px;
    }

    .status-text-col p {
      font-size: 0.84rem;
      margin: 0;
      opacity: 0.9;
      line-height: 1.4;
    }

    .restricted-actions-row {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .btn-upgrade-plan-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: var(--radius-md, 10px);
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      font-weight: 700;
      font-size: 0.92rem;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
      transition: all 0.2s;
    }

    .btn-upgrade-plan-action:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(2, 132, 199, 0.45);
    }

    .btn-return-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 11px 20px;
      border-radius: var(--radius-md, 10px);
      background: transparent;
      border: 1px solid var(--border-ui);
      color: var(--text-main);
      font-weight: 600;
      font-size: 0.88rem;
      text-decoration: none;
      transition: all 0.2s;
    }

    .btn-return-link:hover {
      background: var(--bg-input);
      border-color: var(--brand-blue);
    }

    .scanner-header-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 24px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      box-shadow: var(--shadow-sm);
    }

    .scanner-header-card h2 {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .scanner-header-card p {
      font-size: 0.88rem;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .scanner-kpi-pill {
      background: var(--brand-blue-light);
      border: 1px solid var(--brand-blue);
      border-radius: var(--radius-full);
      padding: 8px 18px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.88rem;
      color: var(--brand-blue);
    }

    .scanner-kpi-pill b {
      font-size: 1.1rem;
      font-weight: 800;
    }

    .scanner-two-columns {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 24px;
    }

    .viewfinder-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 24px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .viewfinder-top-bar {
      display: flex;
      justify-content: space-between;
      font-size: 0.82rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .live-dot {
      color: #10b981;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Viewfinder Box */
    .viewfinder-box {
      width: 100%;
      height: 260px;
      background: #0b1230;
      border-radius: var(--radius-md);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.6);
    }

    .scan-laser-beam {
      position: absolute;
      left: 10%;
      right: 10%;
      height: 3px;
      background: #10b981;
      box-shadow: 0 0 15px 3px #10b981;
      animation: laserSweep 2s ease-in-out infinite alternate;
    }

    @keyframes laserSweep {
      0% { top: 15%; }
      100% { top: 85%; }
    }

    .viewfinder-corners {
      position: absolute;
      inset: 30px;
      pointer-events: none;
    }

    .corner {
      position: absolute;
      width: 28px;
      height: 28px;
      border-color: #38bdf8;
      border-style: solid;
    }

    .c-tl { top: 0; left: 0; border-width: 3px 0 0 3px; }
    .c-tr { top: 0; right: 0; border-width: 3px 3px 0 0; }
    .c-bl { bottom: 0; left: 0; border-width: 0 0 3px 3px; }
    .c-br { bottom: 0; right: 0; border-width: 0 3px 3px 0; }

    .center-target-icon {
      font-size: 3rem;
      opacity: 0.3;
    }

    /* Result Banner */
    .scan-result-card {
      border-radius: var(--radius-md);
      padding: 16px 20px;
      display: flex;
      align-items: flex-start;
      gap: 14px;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .res-authorized {
      background: #ecfdf5;
      border: 1px solid #10b981;
      color: #065f46;
    }

    .res-duplicate {
      background: #fef2f2;
      border: 1px solid #ef4444;
      color: #991b1b;
      animation: shake 0.4s ease;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-6px); }
      40%, 80% { transform: translateX(6px); }
    }

    .res-invalid {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      color: #92400e;
    }

    .res-icon {
      font-size: 1.5rem;
    }

    .res-info h4 {
      font-size: 1.05rem;
      font-weight: 800;
      margin-bottom: 4px;
    }

    .res-guest-meta {
      font-size: 0.88rem;
    }

    .table-hl {
      color: #0284c7;
      text-decoration: underline;
    }

    /* Manual Input */
    .manual-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 6px;
    }

    .manual-input-group {
      display: flex;
      gap: 10px;
    }

    .quick-test-bar small {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .quick-buttons-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* Logs Stream */
    .logs-stream-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 24px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
    }

    .logs-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-ui);
    }

    .logs-header h3 {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .logs-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 480px;
      overflow-y: auto;
    }

    .log-stream-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
    }

    .log-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-weight: 800;
      color: #fff;
      font-size: 0.85rem;
      flex-shrink: 0;
    }

    .bg-green { background: #10b981; }
    .bg-red { background: #ef4444; }
    .bg-gray { background: #64748b; }

    .log-body {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      line-height: 1.25;
    }

    .log-top {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      color: var(--text-main);
    }

    .log-top small {
      color: var(--text-muted);
      font-size: 0.72rem;
    }

    .log-sub {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    /* Offline Resilience Bar */
    .offline-resilience-bar {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
      box-shadow: var(--shadow-sm);
      transition: all 0.2s ease;
    }

    .offline-resilience-bar.offline-active {
      border-color: #f59e0b;
      background: color-mix(in srgb, #f59e0b 6%, var(--bg-card));
    }

    .offline-status-col {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .status-indicator-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.4px;
    }

    .badge-online {
      color: #10b981;
    }

    .badge-offline {
      color: #d97706;
    }

    .offline-meta {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .offline-actions-col {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .btn-resilience {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-sm);
      color: var(--text-main);
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-resilience:hover {
      border-color: var(--brand-blue);
      color: var(--brand-blue);
    }

    .btn-resilience-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      font-size: 0.78rem;
      font-weight: 800;
      cursor: pointer;
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      color: var(--text-main);
      transition: all 0.2s;
    }

    .btn-resilience-toggle.active {
      background: #f59e0b;
      color: #ffffff;
      border-color: #d97706;
    }

    .btn-sync-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      background: #0284c7;
      color: #ffffff;
      border: none;
      font-size: 0.78rem;
      font-weight: 800;
      cursor: pointer;
    }

    .viewfinder-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .cam-controls-row {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }

    .btn-cam-control {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      color: var(--text-main);
      padding: 5px 10px;
      border-radius: var(--radius-sm);
      font-size: 0.74rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }

    .btn-cam-control:hover, .btn-cam-control.active {
      background: var(--brand-blue);
      color: #fff;
      border-color: var(--brand-blue);
    }

    .camera-stream-video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 1;
    }

    .camera-stream-video.hidden {
      display: none;
    }

    .camera-placeholder-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #090e1f;
      color: #94a3b8;
      z-index: 2;
      gap: 12px;
      text-align: center;
      padding: 20px;
    }

    .cam-guide-text {
      font-size: 0.85rem;
      color: #cbd5e1;
      margin: 0;
    }

    .dot-active {
      color: #10b981 !important;
    }

    .dot-offline {
      color: #f59e0b !important;
    }

    .btn-test-dup {
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.4);
    }

    .btn-test-inv {
      color: #f59e0b;
      border-color: rgba(245, 158, 11, 0.4);
    }

    .btn-xs {
      padding: 4px 8px;
      font-size: 0.72rem;
    }

    @media (max-width: 992px) {
      .scanner-two-columns {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ScannerComponent implements OnDestroy {
  @ViewChild('scannerVideo') scannerVideoRef!: ElementRef<HTMLVideoElement>;

  qrInput = '';
  lastScanResult = signal<any | null>(null);

  isCameraActive = signal(false);
  facingMode = signal<'environment' | 'user'>('environment');
  torchOn = signal(false);
  mediaStream: MediaStream | null = null;
  scanIntervalId: any = null;
  lastScannedRawToken = '';
  lastScannedTimestamp = 0;

  isOfflineMode = signal(false);
  offlineGuests = signal<Guest[]>([]);
  offlineQueue = signal<CheckInLog[]>([]);
  localLogs = signal<CheckInLog[]>([]);

  isScannerIncluded(): boolean {
    const ev = this.eventService.selectedEvent();
    if (!ev) return true;
    if (ev.hasScanner === false) return false;
    if (ev.tierPlan === 'BASIC') return false;
    return true;
  }

  canUpgrade() {
    return this.eventService.canUpgradePlan(this.eventService.selectedEvent());
  }

  upgradeCurrentEventToStandard(): void {
    const ev = this.eventService.selectedEvent();
    if (!ev) return;
    this.eventService.events.update(list => list.map(item => {
      if (item.id === ev.id) {
        return {
          ...item,
          tierPlan: 'STANDARD',
          hasScanner: true
        };
      }
      return item;
    }));
    this.notificationService.show(
      'success',
      '¡Plan Actualizado a Estándar!',
      `El evento "${ev.name}" ahora cuenta con Escáner QR de puerta y control de acceso en vivo.`
    );
  }

  constructor(
    public eventService: EventService,
    private notificationService: NotificationService
  ) {
    this.initOfflineState();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  // Camera Management
  async startCamera(): Promise<void> {
    try {
      this.stopCamera();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.notificationService.show('warning', 'Cámara no soportada', 'Tu navegador o entorno no soporta acceso directo a cámara web.');
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: this.facingMode() },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaStream = stream;

      if (this.scannerVideoRef && this.scannerVideoRef.nativeElement) {
        this.scannerVideoRef.nativeElement.srcObject = stream;
        await this.scannerVideoRef.nativeElement.play();
      }

      this.isCameraActive.set(true);
      this.notificationService.show('success', 'Cámara Activada', 'Lente enfocado para lectura de pases.');
      this.startBarcodeDetectionLoop();
    } catch (err: any) {
      console.warn('Error al iniciar cámara:', err);
      this.isCameraActive.set(false);
      this.notificationService.show('warning', 'Permiso de Cámara', 'No se pudo acceder al hardware de video. Puedes usar el ingreso manual de código abajo.');
    }
  }

  stopCamera(): void {
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.scannerVideoRef && this.scannerVideoRef.nativeElement) {
      this.scannerVideoRef.nativeElement.srcObject = null;
    }
    this.isCameraActive.set(false);
    this.torchOn.set(false);
  }

  toggleCamera(): void {
    if (this.isCameraActive()) {
      this.stopCamera();
      this.notificationService.show('info', 'Cámara en Pausa', 'Transmisión de video detenida.');
    } else {
      this.startCamera();
    }
  }

  switchCamera(): void {
    const nextMode = this.facingMode() === 'environment' ? 'user' : 'environment';
    this.facingMode.set(nextMode);
    if (this.isCameraActive()) {
      this.startCamera();
    }
  }

  async toggleTorch(): Promise<void> {
    if (!this.mediaStream) return;
    const track = this.mediaStream.getVideoTracks()[0];
    if (track && (track.getCapabilities as any)?.()?.torch) {
      const nextTorch = !this.torchOn();
      try {
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }]
        });
        this.torchOn.set(nextTorch);
      } catch (e) {
        console.warn('Error toggling torch:', e);
      }
    } else {
      this.notificationService.show('info', 'Linterna No Disponible', 'El hardware de este equipo no admite flash programático.');
    }
  }

  private startBarcodeDetectionLoop(): void {
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }

    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;

    this.scanIntervalId = setInterval(() => {
      if (!this.isCameraActive() || !this.scannerVideoRef?.nativeElement) return;
      const video = this.scannerVideoRef.nativeElement;
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;

      try {
        if (!canvas) {
          canvas = document.createElement('canvas');
        }
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx = canvas.getContext('2d', { willReadFrequently: true });
        }

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (code && code.data && code.data.trim()) {
            const token = code.data.trim();
            // Prevent spamming the exact same scan in quick succession (2.5s cooldown for same token)
            if (this.lastScannedRawToken !== token || (Date.now() - this.lastScannedTimestamp > 2500)) {
              this.lastScannedRawToken = token;
              this.lastScannedTimestamp = Date.now();
              this.executeScan(token);
            }
          }
        }
      } catch (err) {
        // Frame skipped safely
      }
    }, 200);
  }

  // Audio feedback synthesis using Web Audio API
  private playScanSound(type: 'AUTHORIZED' | 'ALREADY_USED' | 'INVALID'): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'AUTHORIZED') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1760, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.setValueAtTime(140, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      // Audio not permitted without user gesture or unsupported
    }
  }

  getSampleGuestsForTesting(): Guest[] {
    return this.eventService.eventGuests().slice(0, 3);
  }

  private getCacheKey(): string {
    return 'evenpass_offline_cache_' + (this.eventService.selectedEvent()?.id || 1);
  }

  private getQueueKey(): string {
    return 'evenpass_offline_queue_' + (this.eventService.selectedEvent()?.id || 1);
  }

  private initOfflineState(): void {
    const cached = localStorage.getItem(this.getCacheKey());
    if (cached) {
      try {
        this.offlineGuests.set(JSON.parse(cached));
      } catch (e) {}
    } else {
      this.offlineGuests.set(this.eventService.eventGuests());
    }

    const queued = localStorage.getItem(this.getQueueKey());
    if (queued) {
      try {
        this.offlineQueue.set(JSON.parse(queued));
      } catch (e) {}
    }
  }

  cacheForOffline(): void {
    const guests = this.eventService.eventGuests();
    this.offlineGuests.set(guests);
    localStorage.setItem(this.getCacheKey(), JSON.stringify(guests));
    this.notificationService.show('success', 'Caché Offline Guardada', `Se almacenaron ${guests.length} pases en la memoria de este equipo.`);
  }

  onOfflineFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text: string = e.target.result || '';
      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            this.offlineGuests.set(parsed);
            localStorage.setItem(this.getCacheKey(), JSON.stringify(parsed));
            this.isOfflineMode.set(true);
            this.notificationService.show('success', 'Archivo Cargado', `Lista offline inicializada con ${parsed.length} invitados.`);
            return;
          }
        }
      } catch (err) {}

      // Fallback CSV parsing
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      const guests: Guest[] = [];
      const evId = this.eventService.selectedEvent()?.id || 1;

      lines.forEach((line, idx) => {
        if (idx === 0 && (line.toLowerCase().includes('nombre') || line.toLowerCase().includes('token'))) return;
        const cols = line.split(/[,;\t]/).map(c => c.replace(/^["']|["']$/g, '').trim());
        if (cols.length > 0 && cols[0]) {
          const fullName = cols[0];
          const token = cols.length > 4 && cols[4].startsWith('EP-') ? cols[4] : `EP-${1000 + idx}`;
          guests.push({
            id: Date.now() + idx,
            eventId: evId,
            fullName,
            totalPasses: 2,
            numCompanions: 1,
            qrCodeToken: token,
            status: 'CONFIRMED'
          });
        }
      });

      if (guests.length > 0) {
        this.offlineGuests.set(guests);
        localStorage.setItem(this.getCacheKey(), JSON.stringify(guests));
        this.isOfflineMode.set(true);
        this.notificationService.show('success', 'Lista Offline Activa', `Se cargaron ${guests.length} invitados desde el archivo.`);
      }
    };
    reader.readAsText(file);
  }

  toggleOfflineMode(): void {
    const next = !this.isOfflineMode();
    this.isOfflineMode.set(next);
    if (next) {
      if (this.offlineGuests().length === 0) {
        this.cacheForOffline();
      }
      this.notificationService.show('warning', 'Modo Offline Activado', 'Las validaciones se ejecutan de manera 100% autónoma en este equipo.');
    } else {
      this.notificationService.show('info', 'Modo En Línea Activado', 'Validaciones conectadas a la base central.');
    }
  }

  executeScan(token: string): void {
    if (!token) return;
    const clean = token.trim().toUpperCase();

    if (this.isOfflineMode()) {
      const guest = this.offlineGuests().find(g => g.qrCodeToken.toUpperCase() === clean);
      if (!guest) {
        const res = {
          type: 'INVALID',
          message: `Pase "${token}" no encontrado en el aforo local offline.`,
          guest: null
        };
        this.lastScanResult.set(res);
        this.playScanSound('INVALID');
        this.qrInput = '';
        return;
      }

      if (guest.status === 'ATTENDED') {
        const res = {
          type: 'ALREADY_USED',
          message: `¡ALERTA DE RE-INGRESO! El pase de ${guest.fullName} ya fue validado offline.`,
          guest
        };
        this.lastScanResult.set(res);
        this.playScanSound('ALREADY_USED');
        this.qrInput = '';
        return;
      }

      // Authorize locally
      const updatedGuest: Guest = { ...guest, status: 'ATTENDED' };
      this.offlineGuests.update(list => list.map(g => g.id === guest.id ? updatedGuest : g));
      localStorage.setItem(this.getCacheKey(), JSON.stringify(this.offlineGuests()));

      const log: CheckInLog = {
        id: Date.now(),
        qrToken: guest.qrCodeToken,
        eventId: guest.eventId,
        guestId: guest.id,
        guestName: guest.fullName,
        totalPasses: guest.totalPasses,
        assignedTableName: guest.assignedTableName,
        status: 'AUTHORIZED',
        operatorUsername: 'Staff Puerta (Offline)',
        scanTimestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        notes: 'Validado Offline en Puerta'
      };

      this.offlineQueue.update(q => [log, ...q]);
      localStorage.setItem(this.getQueueKey(), JSON.stringify(this.offlineQueue()));
      this.localLogs.update(l => [log, ...l]);

      const res = {
        type: 'AUTHORIZED',
        message: `¡ACCESO AUTORIZADO! (Modo Offline)`,
        guest: updatedGuest
      };
      this.lastScanResult.set(res);
      this.playScanSound('AUTHORIZED');
      this.qrInput = '';
    } else {
      const res = this.eventService.validateQrPass(clean);
      this.lastScanResult.set(res);
      this.playScanSound(res.type as any);
      this.qrInput = '';
    }
  }

  syncOfflineQueue(): void {
    const queue = this.offlineQueue();
    if (queue.length === 0) return;

    queue.forEach(log => {
      this.eventService.allLogs.update(logs => [log, ...logs]);
      this.eventService.allGuests.update(guests => guests.map(g => 
        g.id === log.guestId ? { ...g, status: 'ATTENDED' } : g
      ));
    });

    const count = queue.length;
    this.offlineQueue.set([]);
    localStorage.removeItem(this.getQueueKey());
    this.notificationService.show('success', 'Sincronización Exitosa', `Se sincronizaron ${count} pases con la base central.`);
  }

  getCombinedLogs(): CheckInLog[] {
    const base = this.eventService.eventLogs();
    const local = this.localLogs();
    return [...local, ...base].filter((item, index, self) =>
      index === self.findIndex(t => t.id === item.id)
    );
  }
}
