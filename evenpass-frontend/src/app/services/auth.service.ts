import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY = 'evenpass_current_user';
  currentUser = signal<User | null>(null);

  isAdmin = computed(() => this.currentUser()?.role === 'ROLE_ADMIN');
  isOrganizer = computed(() => this.currentUser()?.role === 'ROLE_ORGANIZER');
  isStaff = computed(() => this.currentUser()?.role === 'ROLE_STAFF');

  constructor(private router: Router) {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.currentUser.set(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } else {
      // Default initial session as ERNESTO (Admin)
      const defaultUser: User = {
        id: 1,
        username: 'ernesto',
        fullName: 'ERNESTO',
        email: 'ernesto@evenpass.io',
        role: 'ROLE_ADMIN',
        token: 'mock_jwt_token_evenpass_2026'
      };
      this.currentUser.set(defaultUser);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaultUser));
    }
  }

  login(username: string, password?: string): boolean {
    const cleanUser = username.trim().toLowerCase();
    
    // Core Founders & Administrators
    let user: User;
    if (cleanUser === 'ernesto') {
      user = { id: 1, username: 'ernesto', fullName: 'ERNESTO', email: 'ernesto@evenpass.io', role: 'ROLE_ADMIN', token: 'jwt_admin_ernesto' };
    } else if (cleanUser === 'luis') {
      user = { id: 2, username: 'luis', fullName: 'LUIS', email: 'luis@evenpass.io', role: 'ROLE_ADMIN', token: 'jwt_admin_luis' };
    } else if (cleanUser === 'linda') {
      user = { id: 3, username: 'linda', fullName: 'LINDA', email: 'linda@evenpass.io', role: 'ROLE_ADMIN', token: 'jwt_admin_linda' };
    } else if (cleanUser.includes('organiza') || cleanUser === 'anfitrion' || cleanUser.includes('novi')) {
      user = { id: 4, username: cleanUser, fullName: 'Organizador / Anfitrión', email: `${cleanUser}@evenpass.io`, role: 'ROLE_ORGANIZER', token: 'jwt_organizer' };
    } else {
      user = {
        id: Date.now(),
        username: cleanUser,
        fullName: cleanUser.toUpperCase(),
        email: `${cleanUser}@evenpass.io`,
        role: 'ROLE_STAFF',
        token: 'jwt_token_' + Date.now()
      };
    }

    this.currentUser.set(user);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    return true;
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem(this.STORAGE_KEY);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }
}
