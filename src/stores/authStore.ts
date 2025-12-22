import { createClient } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/types/database';
import { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthActions {
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    const supabase = createClient();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        set({ user: session.user, session });
        await get().fetchProfile(session.user.id);
      }
      
      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        set({ user: session?.user ?? null, session });
        
        if (session?.user) {
          await get().fetchProfile(session.user.id);
        } else {
          set({ profile: null });
        }
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  signIn: async (email: string, password: string) => {
    const supabase = createClient();
    set({ isLoading: true });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ isLoading: false });
        return { error: error.message };
      }

      if (data.user) {
        // Check if user has admin/personnel role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profile) {
          await supabase.auth.signOut();
          set({ isLoading: false });
          return { error: 'Profil bulunamadı.' };
        }

        if (profile.role !== 'admin' && profile.role !== 'personnel') {
          await supabase.auth.signOut();
          set({ isLoading: false });
          return { error: 'Bu panele erişim yetkiniz bulunmamaktadır.' };
        }

        set({ 
          user: data.user, 
          session: data.session, 
          profile: profile as Profile,
          isLoading: false 
        });
        return { error: null };
      }

      set({ isLoading: false });
      return { error: 'Giriş yapılamadı.' };
    } catch (error) {
      set({ isLoading: false });
      return { error: 'Beklenmeyen bir hata oluştu.' };
    }
  },

  signOut: async () => {
    const supabase = createClient();
    set({ isLoading: true });

    try {
      await supabase.auth.signOut();
      set({ user: null, session: null, profile: null });
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProfile: async (userId: string) => {
    const supabase = createClient();

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      set({ profile: profile as Profile });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  },
}));

// Permission helpers
export function canDelete(role: UserRole | undefined, resource: string): boolean {
  if (!role) return false;
  if (role === 'admin') return true;
  
  // Personnel can only delete certain resources
  const personnelDeletePermissions = ['campaigns'];
  return personnelDeletePermissions.includes(resource);
}

export function canCreate(role: UserRole | undefined): boolean {
  return role === 'admin' || role === 'personnel';
}

export function canEdit(role: UserRole | undefined): boolean {
  return role === 'admin' || role === 'personnel';
}

export function canView(role: UserRole | undefined): boolean {
  return role === 'admin' || role === 'personnel';
}

export function isAdmin(role: UserRole | undefined): boolean {
  return role === 'admin';
}

export function isPersonnel(role: UserRole | undefined): boolean {
  return role === 'personnel';
}
