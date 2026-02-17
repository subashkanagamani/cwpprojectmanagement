// Demo authentication for development without Supabase
import type { User } from '@supabase/supabase-js';
import type { Profile } from './database.types';

const DEMO_USER_KEY = 'demo_user';
const DEMO_PROFILE_KEY = 'demo_profile';

export interface DemoSession {
  user: User;
  access_token: string;
}

// Create a mock user
const createMockUser = (email: string): User => ({
  id: 'demo-user-' + Math.random().toString(36).substring(7),
  email,
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
});

// Create a mock profile
const createMockProfile = (userId: string, email: string): Profile => ({
  id: userId,
  email,
  role: 'admin',
  full_name: 'Demo Admin',
  department: null,
  position: null,
  phone: null,
  manager_id: null,
  max_capacity: 40,
  skills: null,
  custom_fields: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
});

export const demoAuth = {
  // Sign up
  async signUp(email: string, password: string) {
    try {
      const user = createMockUser(email);
      const profile = createMockProfile(user.id, email);

      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
      localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(profile));

      return { user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  },

  // Sign in
  async signIn(email: string, password: string) {
    try {
      // Check if user exists
      let user = JSON.parse(localStorage.getItem(DEMO_USER_KEY) || 'null');
      let profile = JSON.parse(localStorage.getItem(DEMO_PROFILE_KEY) || 'null');

      // If no user exists or email doesn't match, create a new one
      if (!user || user.email !== email) {
        user = createMockUser(email);
        profile = createMockProfile(user.id, email);
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
        localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(profile));
      }

      return { user, profile, error: null };
    } catch (error) {
      return { user: null, profile: null, error: error as Error };
    }
  },

  // Sign out
  async signOut() {
    localStorage.removeItem(DEMO_USER_KEY);
    localStorage.removeItem(DEMO_PROFILE_KEY);
  },

  // Get current session
  getSession(): { user: User | null; profile: Profile | null } {
    try {
      const user = JSON.parse(localStorage.getItem(DEMO_USER_KEY) || 'null');
      const profile = JSON.parse(localStorage.getItem(DEMO_PROFILE_KEY) || 'null');
      return { user, profile };
    } catch {
      return { user: null, profile: null };
    }
  },

  // Check if there's a valid session
  hasSession(): boolean {
    return !!localStorage.getItem(DEMO_USER_KEY);
  },
};
