import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ThemeService } from '../../services/theme.service';
import { IconComponent } from '../icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="login-page-wrapper">
      
      <!-- Top Bar Controls -->
      <header class="login-top-bar">
        <div class="top-status-indicator">
          <span class="pulse-dot"></span>
          <span>EvenPass SaaS Enterprise</span>
        </div>

        <button 
          class="theme-toggle-pill" 
          (click)="themeService.toggleTheme()" 
          [title]="themeService.isDarkMode() ? 'Modo Claro' : 'Modo Oscuro'"
        >
          <app-icon [name]="themeService.isDarkMode() ? 'sun' : 'moon'" [size]="15"></app-icon>
          <span>{{ themeService.isDarkMode() ? 'Modo Claro' : 'Modo Oscuro' }}</span>
        </button>
      </header>

      <!-- Center Minimalist Login Card -->
      <main class="login-card-container">
        <div class="login-card interactive-card">
          
          <!-- Brand Header with Luxury Logo -->
          <div class="card-brand-header">
            <div class="brand-logo-symbol">
              <svg width="44" height="44" viewBox="0 0 52 52" fill="none">
                <rect width="52" height="52" rx="15" fill="#0f172a"/>
                <rect x="1" y="1" width="50" height="50" rx="14" stroke="#38bdf8" stroke-width="1.2" stroke-opacity="0.4"/>
                <path d="M16 16h13c1.65 0 3 1.35 3 3s-1.35 3-3 3h-9v5h8c1.65 0 3 1.35 3 3s-1.35 3-3 3h-8v5h9c1.65 0 3 1.35 3 3s-1.35 3-3 3H16c-1.65 0-3-1.35-3-3V19c0-1.65 1.35-3 3-3z" fill="#0284c7"/>
                <circle cx="35" cy="22" r="4.5" fill="#38bdf8"/>
                <circle cx="35" cy="22" r="2" fill="#02142d"/>
                <path d="M35 26.5v8.5" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
            </div>

            <div class="brand-text-block">
              <h1 class="brand-title">Even<span class="brand-highlight">Pass</span></h1>
              <p class="brand-sub">ENTERPRISE EVENT MANAGEMENT OS</p>
            </div>
          </div>

          <div class="card-intro-text">
            <h2>Acceso a la Plataforma</h2>
            <p>Ingresa tus credenciales para gestionar recepciones, croquis y accesos.</p>
          </div>

          <!-- Login Form -->
          <form (ngSubmit)="handleLogin()" class="login-form">
            <!-- Username -->
            <div class="form-group">
              <label>NOMBRE DE USUARIO O CORREO</label>
              <div class="input-wrap">
                <app-icon name="user" [size]="16" class="input-ic"></app-icon>
                <input 
                  type="text" 
                  [(ngModel)]="username" 
                  name="username" 
                  placeholder="Ingresa tu usuario o correo"
                  required
                  autofocus
                >
              </div>
            </div>

            <!-- Password -->
            <div class="form-group">
              <div class="label-row">
                <label>CONTRASEÑA</label>
              </div>
              <div class="input-wrap">
                <app-icon name="lock" [size]="16" class="input-ic"></app-icon>
                <input 
                  [type]="showPassword() ? 'text' : 'password'" 
                  [(ngModel)]="password" 
                  name="password" 
                  placeholder="Ingresa tu contraseña"
                  required
                >
                <button 
                  type="button" 
                  class="eye-btn" 
                  (click)="showPassword.set(!showPassword())"
                  [title]="showPassword() ? 'Ocultar' : 'Mostrar'"
                >
                  <app-icon [name]="showPassword() ? 'check' : 'help'" [size]="15"></app-icon>
                </button>
              </div>
            </div>

            <!-- Remember Session -->
            <div class="form-options-row">
              <label class="remember-checkbox">
                <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe">
                <span>Mantener sesión iniciada</span>
              </label>
            </div>

            <!-- Submit Button -->
            <button type="submit" class="login-btn-primary" [disabled]="loading()">
              <span>{{ loading() ? 'Iniciando sesión...' : 'Ingresar al Panel' }}</span>
              <app-icon name="arrow-right" [size]="16"></app-icon>
            </button>
          </form>

          <footer class="card-footer-info">
            <span>EvenPass SaaS Enterprise · Plataforma de Eventos, Salones y Control QR</span>
          </footer>

        </div>
      </main>

    </div>
  `,
  styles: [`
    .login-page-wrapper {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--bg-app);
      position: relative;
      padding: 24px;
    }

    .login-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: min(1080px, 100%);
      margin: 0 auto 20px;
    }

    .top-status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.05em;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
    }

    .theme-toggle-pill {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      color: var(--text-main);
      padding: 7px 14px;
      border-radius: 99px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .theme-toggle-pill:hover {
      border-color: var(--brand-blue);
      color: var(--brand-blue);
    }

    /* Container */
    .login-card-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .login-card {
      width: min(440px, 100%);
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: 20px;
      padding: 38px 34px;
      box-shadow: var(--shadow-card);
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    /* Brand */
    .card-brand-header {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-logo-symbol {
      flex-shrink: 0;
    }

    .brand-text-block {
      display: flex;
      flex-direction: column;
    }

    .brand-title {
      font-size: 1.65rem;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: -0.04em;
      margin: 0;
      line-height: 1.1;
    }

    .brand-highlight {
      color: var(--brand-blue);
    }

    .brand-sub {
      font-size: 0.65rem;
      font-weight: 800;
      color: var(--text-muted);
      letter-spacing: 0.12em;
      margin-top: 3px;
    }

    .card-intro-text h2 {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0;
    }

    .card-intro-text p {
      font-size: 0.84rem;
      color: var(--text-muted);
      margin-top: 4px;
    }

    /* Form */
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }

    .input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-ic {
      position: absolute;
      left: 14px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .input-wrap input {
      width: 100%;
      padding: 12px 14px 12px 42px;
      background: var(--bg-input);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-sm);
      color: var(--text-main);
      font-size: 0.92rem;
      outline: none;
      transition: all 0.2s;
    }

    .input-wrap input:focus {
      border-color: var(--brand-blue);
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }

    .eye-btn {
      position: absolute;
      right: 12px;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
    }

    .form-options-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.8rem;
    }

    .remember-checkbox {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--text-secondary);
      cursor: pointer;
    }

    .remember-checkbox input {
      width: 16px;
      height: 16px;
      accent-color: var(--brand-blue);
      cursor: pointer;
    }

    .login-btn-primary {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background-color: #0284c7 !important;
      color: #ffffff !important;
      border: 1px solid #0369a1 !important;
      padding: 13px 20px;
      border-radius: var(--radius-full);
      font-size: 0.94rem;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
      transition: all 0.2s ease;
    }

    .login-btn-primary:hover:not(:disabled) {
      background-color: #0369a1 !important;
      transform: translateY(-1px);
    }

    .login-btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .card-footer-info {
      text-align: center;
      font-size: 0.72rem;
      color: var(--text-muted);
      border-top: 1px solid var(--border-ui);
      padding-top: 16px;
    }
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  rememberMe = true;
  showPassword = signal(false);
  loading = signal(false);

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  handleLogin(): void {
    if (!this.username.trim()) {
      this.notificationService.show('warning', 'Campo requerido', 'Ingresa tu nombre de usuario.');
      return;
    }

    this.loading.set(true);
    setTimeout(() => {
      this.authService.login(this.username, this.password);
      this.notificationService.show('success', 'Bienvenido', `Sesión iniciada como ${this.username.toUpperCase()}`);
      this.loading.set(false);
      this.router.navigate(['/dashboard']);
    }, 300);
  }
}
