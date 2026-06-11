import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../lib/database.types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isPortalUser: boolean;
  isOnline: boolean;
  sessionExpired: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  refreshSession: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to check if error is an auth-related error
const isAuthError = (error: any): boolean => {
  if (!error) return false;
  
  const authErrorMessages = [
    'invalid claim',
    'expired',
    'invalid signature',
    'invalid token',
    'jwt',
    'unauthorized',
    'session',
  ];

  const errorMessage = error?.message?.toLowerCase() || '';
  const errorStatus = error?.status;

  return (
    errorStatus === 401 ||
    errorStatus === 403 ||
    authErrorMessages.some(msg => errorMessage.includes(msg))
  );
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPortalUser, setIsPortalUser] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Set up online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSessionExpired(false); // Reset expired flag when coming back online
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize auth state using onAuthStateChange only (getSession can hang with stale tokens)
  useEffect(() => {
    let mounted = true;
    let hasInitialized = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      try {
        if (event === 'INITIAL_SESSION') {
          hasInitialized = true;
          if (session?.user) {
            setUser(session.user);
            await loadProfile(session.user.id);
          } else {
            setUser(null);
            setLoading(false);
          }
        } else if (event === 'SIGNED_IN') {
          hasInitialized = true;
          setUser(session?.user ?? null);
          if (session?.user) {
            await loadProfile(session.user.id);
          }
          setSessionExpired(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setIsPortalUser(false);
          setSessionExpired(false);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null);
          setSessionExpired(false);
        } else if (event === 'USER_UPDATED') {
          setUser(session?.user ?? null);
          if (session?.user) {
            await loadProfile(session.user.id);
          }
        }
      } catch (error) {
        console.error('Error handling auth state change:', error);
        if (mounted) setLoading(false);
      }
    });

    // Safety timeout - if INITIAL_SESSION never fires within 3 seconds, stop loading
    const timeout = setTimeout(() => {
      if (mounted && !hasInitialized) {
        console.warn('Auth initialization timed out - forcing load end');
        setLoading(false);
      }
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (profileData) {
        setProfile(profileData as Profile);
        setIsPortalUser(false);
        return;
      }

      const { data: portalUser } = await supabase
        .from('client_portal_users')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (portalUser) {
        setIsPortalUser(true);
        setProfile(null);
        return;
      }

      console.warn('No profile found for user:', userId);
    } catch (error: any) {
      console.error('Error loading profile:', error?.message || error);
      if (isAuthError(error)) {
        setSessionExpired(true);
        setProfile(null);
        setIsPortalUser(false);
        try { await supabase.auth.signOut(); } catch {}
      }
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoading(false);
        if (isAuthError(error)) {
          setSessionExpired(true);
        }
        return { error };
      }

      setSessionExpired(false);
      return { error: null };
    } catch (error) {
      setLoading(false);
      const err = error as Error;
      if (isAuthError(err)) {
        setSessionExpired(true);
      }
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error && isAuthError(error)) {
        setSessionExpired(true);
        return { error };
      }

      setSessionExpired(false);
      return { error };
    } catch (error) {
      const err = error as Error;
      if (isAuthError(err)) {
        setSessionExpired(true);
      }
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
      setUser(null);
      setIsPortalUser(false);
      setSessionExpired(false);
    } catch (error) {
      console.error('Error signing out:', error);
      // Still clear local state even if sign out fails
      setProfile(null);
      setUser(null);
      setIsPortalUser(false);
      setSessionExpired(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error && isAuthError(error)) {
        setSessionExpired(true);
        return { error };
      }

      return { error };
    } catch (error) {
      const err = error as Error;
      if (isAuthError(err)) {
        setSessionExpired(true);
      }
      return { error: err };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error && isAuthError(error)) {
        setSessionExpired(true);
        return { error };
      }

      setSessionExpired(false);
      return { error };
    } catch (error) {
      const err = error as Error;
      if (isAuthError(err)) {
        setSessionExpired(true);
      }
      return { error: err };
    }
  };

  const refreshSession = async (): Promise<{ error: Error | null }> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        if (isAuthError(error)) {
          setSessionExpired(true);
          await supabase.auth.signOut();
        }
        return { error };
      }

      if (data.session?.user) {
        setUser(data.session.user);
        setSessionExpired(false);
      }

      return { error: null };
    } catch (error) {
      const err = error as Error;
      if (isAuthError(err)) {
        setSessionExpired(true);
        await supabase.auth.signOut();
      }
      return { error: err };
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    isPortalUser,
    isOnline,
    sessionExpired,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // During HMR, context may temporarily be undefined - return safe defaults
    return {
      user: null,
      profile: null,
      loading: true,
      isPortalUser: false,
      isOnline: true,
      sessionExpired: false,
      signIn: async () => ({ error: new Error('Auth not ready') }),
      signUp: async () => ({ error: new Error('Auth not ready') }),
      signOut: async () => {},
      resetPassword: async () => ({ error: new Error('Auth not ready') }),
      updatePassword: async () => ({ error: new Error('Auth not ready') }),
      refreshSession: async () => ({ error: new Error('Auth not ready') }),
    } as AuthContextType;
  }
  return context;
}
