import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../models/models';
import { NotificationService } from '../../services/notification.service';
import { IconComponent } from '../icon.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="users-page-container">

      <!-- Header Card -->
      <div class="users-header-card">
        <div class="header-title-box">
          <div class="icon-wrap-badge">
            <app-icon name="user" [size]="22"></app-icon>
          </div>
          <div>
            <h2>Control de Acceso &amp; Perfiles de Usuario</h2>
            <p>Definición de roles, permisos por nivel de usuario y alta de operadores para EvenPass.</p>
          </div>
        </div>
        <button class="btn-action" (click)="showAddUserModal.set(true)">
          <app-icon name="plus" [size]="15"></app-icon>
          <span>Nuevo Usuario</span>
        </button>
      </div>

      <!-- Users Table Card -->
      <div class="users-table-card">
        <div class="table-card-header">
          <h3>Usuarios Operadores Registrados</h3>
          <span class="users-count-tag">{{ usersList().length }} usuarios</span>
        </div>

        <table *ngIf="usersList().length > 0" class="data-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre Completo</th>
              <th>Correo Electrónico</th>
              <th>Rol en la Plataforma</th>
              <th>Estado</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of usersList()">
              <td>
                <div class="user-inline-cell">
                  <div class="user-avatar-dot">{{ user.fullName.charAt(0) }}</div>
                  <b>{{ user.username }}</b>
                </div>
              </td>
              <td>{{ user.fullName }}</td>
              <td>{{ user.email }}</td>
              <td>
                <span class="badge" [ngClass]="{
                  'badge-completed': user.role === 'ROLE_ADMIN',
                  'badge-info': user.role === 'ROLE_ORGANIZER',
                  'badge-warning': user.role === 'ROLE_STAFF'
                }">
                  {{ user.role === 'ROLE_ADMIN' ? 'Administrador' : (user.role === 'ROLE_ORGANIZER' ? 'Organizador' : 'Staff Puerta') }}
                </span>
              </td>
              <td>
                <span class="badge badge-completed">Activo</span>
              </td>
              <td style="text-align: right;">
                <div class="actions-cell-row">
                  <button class="btn-outline btn-xs" (click)="openPasswordModal(user)" title="Cambiar o restablecer contraseña">
                    <app-icon name="lock" [size]="12"></app-icon>
                    <span>Contraseña</span>
                  </button>
                  <button class="btn-outline btn-xs" (click)="openEditModal(user)" title="Editar datos del usuario">
                    <app-icon name="settings" [size]="12"></app-icon>
                    <span>Editar</span>
                  </button>
                  <button class="btn-outline btn-xs btn-del" (click)="deleteUser(user)" title="Eliminar usuario">
                    <app-icon name="trash" [size]="12"></app-icon>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Clean Empty State when usersList is empty -->
        <div *ngIf="usersList().length === 0" class="users-empty-state">
          <div class="empty-icon-circle">
            <app-icon name="user" [size]="28"></app-icon>
          </div>
          <h4>No hay usuarios operadores adicionales registrados</h4>
          <p>
            El sistema opera actualmente con las credenciales maestras. Puedes registrar nuevos coordinadores de eventos o personal de recepción haciendo clic en 'Nuevo Usuario'.
          </p>
          <button class="btn-action" (click)="showAddUserModal.set(true)">
            <app-icon name="plus" [size]="14"></app-icon>
            <span>Crear Nuevo Usuario</span>
          </button>
        </div>
      </div>

      <!-- Password Management Modal -->
      <div *ngIf="selectedUserForPassword()" class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-header">
            <div>
              <h3>Gestión de Contraseña</h3>
              <p style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">Usuario: <b>{{ selectedUserForPassword()?.username }}</b> ({{ selectedUserForPassword()?.fullName }})</p>
            </div>
            <button class="close-btn" (click)="selectedUserForPassword.set(null)">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <div class="form-field">
            <label>Nueva Contraseña</label>
            <div class="pwd-input-group">
              <input 
                [type]="showNewPassword() ? 'text' : 'password'" 
                [(ngModel)]="newPasswordInput" 
                placeholder="Ingresa nueva contraseña segura"
              >
              <button type="button" class="btn-outline btn-xs" (click)="showNewPassword.set(!showNewPassword())">
                {{ showNewPassword() ? 'Ocultar' : 'Ver' }}
              </button>
            </div>
          </div>

          <div class="pwd-tools-row">
            <button type="button" class="btn-outline btn-xs" (click)="generateRandomPassword()">
              <app-icon name="sparkles" [size]="12"></app-icon>
              <span>Generar Contraseña Segura</span>
            </button>
            <button *ngIf="newPasswordInput" type="button" class="btn-outline btn-xs" (click)="copyPasswordToClipboard()">
              <app-icon name="copy" [size]="12"></app-icon>
              <span>Copiar</span>
            </button>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-outline" (click)="selectedUserForPassword.set(null)">Cancelar</button>
            <button type="button" class="btn-action" (click)="saveNewPassword()">Guardar Contraseña</button>
          </div>
        </div>
      </div>

      <!-- Edit User Modal -->
      <div *ngIf="selectedUserForEdit()" class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-header">
            <h3>Editar Usuario</h3>
            <button class="close-btn" (click)="selectedUserForEdit.set(null)">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <div class="form-field">
            <label>Usuario (Login)</label>
            <input type="text" [(ngModel)]="editUserForm.username" name="editUsername" readonly style="opacity:0.75;">
          </div>
          <div class="form-field">
            <label>Nombre Completo</label>
            <input type="text" [(ngModel)]="editUserForm.fullName" name="editFullName" required>
          </div>
          <div class="form-field">
            <label>Correo Electrónico</label>
            <input type="email" [(ngModel)]="editUserForm.email" name="editEmail" required>
          </div>
          <div class="form-field">
            <label>Rol en la Plataforma</label>
            <select [(ngModel)]="editUserForm.role" name="editRole">
              <option value="ROLE_ADMIN">Administrador (Control total)</option>
              <option value="ROLE_ORGANIZER">Organizador (Gestión de evento)</option>
              <option value="ROLE_STAFF">Staff (Solo escáner en puerta)</option>
            </select>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-outline" (click)="selectedUserForEdit.set(null)">Cancelar</button>
            <button type="button" class="btn-action" (click)="saveEditedUser()">Guardar Cambios</button>
          </div>
        </div>
      </div>

      <!-- Add User Modal -->
      <div *ngIf="showAddUserModal()" class="modal-backdrop">
        <div class="modal-box">
          <div class="modal-header">
            <h3>Registrar Nuevo Usuario</h3>
            <button class="close-btn" (click)="showAddUserModal.set(false)">
              <app-icon name="x" [size]="16"></app-icon>
            </button>
          </div>

          <form (ngSubmit)="handleAddUser()">
            <div class="form-field">
              <label>Usuario (Login)</label>
              <input type="text" [(ngModel)]="newUser.username" name="username" placeholder="ej. recepción1" required>
            </div>
            <div class="form-field">
              <label>Nombre Completo</label>
              <input type="text" [(ngModel)]="newUser.fullName" name="fullName" placeholder="ej. Mario Rivas" required>
            </div>
            <div class="form-field">
              <label>Correo Electrónico</label>
              <input type="email" [(ngModel)]="newUser.email" name="email" placeholder="mario@evenpass.io" required>
            </div>
            <div class="form-field">
              <label>Rol de Seguridad</label>
              <select [(ngModel)]="newUser.role" name="role">
                <option value="ROLE_ADMIN">Administrador (Control total)</option>
                <option value="ROLE_ORGANIZER">Organizador (Gestión de evento)</option>
                <option value="ROLE_STAFF">Staff (Solo escáner en puerta)</option>
              </select>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-outline" (click)="showAddUserModal.set(false)">Cancelar</button>
              <button type="submit" class="btn-action">Guardar Usuario</button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .users-page-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .users-header-card {
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

    .header-title-box {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .icon-wrap-badge {
      width: 46px;
      height: 46px;
      border-radius: var(--radius-md);
      background: rgba(14, 165, 233, 0.12);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .users-header-card h2 {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0;
    }

    .users-header-card p {
      font-size: 0.88rem;
      color: var(--text-muted);
      margin: 4px 0 0;
    }

    .users-table-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      overflow-x: auto;
      box-shadow: var(--shadow-sm);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .data-table th {
      background: var(--bg-input);
      padding: 14px 20px;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-ui);
    }

    .data-table td {
      padding: 14px 20px;
      border-bottom: 1px solid var(--border-ui);
      vertical-align: middle;
      font-size: 0.88rem;
    }

    .user-inline-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user-avatar-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #0284c7;
      color: #fff;
      display: grid;
      place-items: center;
      font-weight: 700;
      font-size: 0.82rem;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-box {
      background: var(--bg-card);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-ui);
      width: min(480px, 100%);
      padding: 26px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .close-btn {
      font-size: 1.2rem;
      color: var(--text-muted);
      cursor: pointer;
    }

    .form-field { margin-bottom: 16px; }
    .form-field label { display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; }
    .actions-cell-row {
      display: inline-flex;
      gap: 6px;
      align-items: center;
    }

    .btn-del {
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.3);
    }

    .btn-del:hover {
      background: #ef4444;
      color: #fff;
    }

    .pwd-input-group {
      display: flex;
      gap: 8px;
    }

    .pwd-input-group input {
      flex: 1;
    }

    .pwd-tools-row {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }

    .btn-xs {
      padding: 5px 10px;
      font-size: 0.74rem;
      border-radius: var(--radius-sm);
    }

    /* Roles Matrix Grid */
    .roles-matrix-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
    }

    .role-desc-card {
      background: var(--bg-card);
      border: 1px solid var(--border-ui);
      border-radius: var(--radius-lg);
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: var(--shadow-sm);
    }

    .role-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .role-badge {
      font-size: 0.78rem;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-admin {
      background: rgba(2, 132, 199, 0.14);
      color: #0284c7;
      border: 1px solid rgba(2, 132, 199, 0.3);
    }

    .badge-organizer {
      background: rgba(16, 185, 129, 0.14);
      color: #059669;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .badge-staff {
      background: rgba(245, 158, 11, 0.14);
      color: #d97706;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .role-scope {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .role-summary {
      font-size: 0.84rem;
      color: var(--text-muted);
      line-height: 1.4;
      margin: 0;
    }

    .role-permissions-list {
      list-style: none;
      padding: 0;
      margin: 4px 0 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .role-permissions-list li {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 0.78rem;
      color: var(--text-main);
      line-height: 1.35;
    }

    .role-permissions-list li app-icon {
      color: #10b981;
      margin-top: 2px;
      flex-shrink: 0;
    }

    .role-permissions-list li.restricted {
      color: var(--text-muted);
      opacity: 0.75;
    }

    .role-permissions-list li.restricted app-icon {
      color: #ef4444;
    }

    .table-card-header {
      padding: 18px 24px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .table-card-header h3 {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0;
    }

    .users-count-tag {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: var(--radius-full);
      background: var(--bg-input);
      color: var(--text-muted);
    }

    /* Empty state */
    .users-empty-state {
      padding: 48px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      max-width: 440px;
      margin: 0 auto;
    }

    .empty-icon-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--bg-input);
      color: var(--text-muted);
      display: grid;
      place-items: center;
      margin-bottom: 4px;
    }

    .users-empty-state h4 {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0;
    }

    .users-empty-state p {
      font-size: 0.84rem;
      color: var(--text-muted);
      line-height: 1.5;
      margin: 0 0 10px;
    }

    @media (max-width: 900px) {
      .roles-matrix-grid {
        grid-template-columns: 1fr;
      }
    }

    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
  `]
})
export class UsersComponent {
  showAddUserModal = signal(false);
  selectedUserForPassword = signal<User | null>(null);
  newPasswordInput = '';
  showNewPassword = signal(false);

  selectedUserForEdit = signal<User | null>(null);
  usersList = signal<User[]>([
    {
      id: 1,
      username: 'ernesto',
      fullName: 'ERNESTO',
      email: 'ernesto@evenpass.io',
      role: 'ROLE_ADMIN'
    },
    {
      id: 2,
      username: 'luis',
      fullName: 'LUIS',
      email: 'luis@evenpass.io',
      role: 'ROLE_ADMIN'
    },
    {
      id: 3,
      username: 'linda',
      fullName: 'LINDA',
      email: 'linda@evenpass.io',
      role: 'ROLE_ADMIN'
    },
    {
      id: 4,
      username: 'coordinador_eventos',
      fullName: 'Coordinador de Eventos',
      email: 'coordinacion@evenpass.io',
      role: 'ROLE_ORGANIZER'
    },
    {
      id: 5,
      username: 'hostess_escaneo',
      fullName: 'Hostess de Recepción & Escáner',
      email: 'hostess@evenpass.io',
      role: 'ROLE_STAFF'
    }
  ]);

  editUserForm: Partial<User> = {};

  newUser: Partial<User> = {
    username: '',
    fullName: '',
    email: '',
    role: 'ROLE_ORGANIZER'
  };

  constructor(private notificationService: NotificationService) {
    const saved = localStorage.getItem('evenpass_users_list_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.usersList.set(parsed);
        }
      } catch (e) {}
    } else {
      this.persistUsers();
    }
  }

  private persistUsers(): void {
    try {
      localStorage.setItem('evenpass_users_list_v2', JSON.stringify(this.usersList()));
    } catch (e) {}
  }

  handleAddUser(): void {
    if (!this.newUser.username || !this.newUser.fullName) {
      this.notificationService.show('warning', 'Campo requerido', 'Por favor llena los datos del usuario.');
      return;
    }

    const created: User = {
      id: Date.now(),
      username: this.newUser.username,
      fullName: this.newUser.fullName,
      email: this.newUser.email || `${this.newUser.username}@evenpass.io`,
      role: (this.newUser.role as any) || 'ROLE_ORGANIZER'
    };

    this.usersList.update(list => [...list, created]);
    this.persistUsers();
    this.showAddUserModal.set(false);
    this.newUser = { username: '', fullName: '', email: '', role: 'ROLE_ORGANIZER' };
    this.notificationService.show('success', 'Usuario Creado', `Usuario ${created.username} registrado con éxito.`);
  }

  openPasswordModal(user: User): void {
    this.selectedUserForPassword.set(user);
    this.newPasswordInput = '';
    this.showNewPassword.set(false);
  }

  generateRandomPassword(): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let res = 'EP#';
    for (let i = 0; i < 7; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.newPasswordInput = res;
    this.showNewPassword.set(true);
  }

  copyPasswordToClipboard(): void {
    if (!this.newPasswordInput) return;
    navigator.clipboard.writeText(this.newPasswordInput).then(() => {
      this.notificationService.show('info', 'Copiado', 'Contraseña copiada al portapapeles.');
    });
  }

  saveNewPassword(): void {
    if (!this.newPasswordInput || this.newPasswordInput.length < 4) {
      this.notificationService.show('warning', 'Contraseña Corta', 'Ingresa una contraseña de al menos 4 caracteres.');
      return;
    }
    const user = this.selectedUserForPassword();
    if (user) {
      this.notificationService.show('success', 'Contraseña Actualizada', `Se asignó la nueva contraseña para ${user.username}.`);
      this.selectedUserForPassword.set(null);
    }
  }

  openEditModal(user: User): void {
    this.selectedUserForEdit.set(user);
    this.editUserForm = { ...user };
  }

  saveEditedUser(): void {
    const sel = this.selectedUserForEdit();
    if (!sel || !this.editUserForm.fullName) return;

    this.usersList.update(list => list.map(u => 
      u.id === sel.id ? { ...u, fullName: this.editUserForm.fullName || u.fullName, email: this.editUserForm.email || u.email, role: this.editUserForm.role || u.role } : u
    ));
    this.persistUsers();
    this.notificationService.show('success', 'Usuario Actualizado', `Datos de ${sel.username} actualizados.`);
    this.selectedUserForEdit.set(null);
  }

  deleteUser(user: User): void {
    this.usersList.update(list => list.filter(u => u.id !== user.id));
    this.persistUsers();
    this.notificationService.show('info', 'Usuario Eliminado', `El usuario ${user.username} ha sido removido.`);
  }
}
