import { supabase } from './supabase';

export interface AuthResponse {
  success: boolean;
  error?: string;
  user?: any;
}

// Email ile giriş/kayıt - doğrulama olmadan
export async function signInWithEmail(email: string): Promise<AuthResponse> {
  try {
    // Önce email ile kullanıcı var mı kontrol et
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      // Kullanıcı varsa direkt giriş yap
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: email // Basit tutuyoruz şimdilik
      });

      if (error) throw error;
      return {
        success: true,
        user: data.user
      };
    }

    // Yeni kullanıcı oluştur
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: email, // Basit tutuyoruz şimdilik
      options: {
        data: {
          email: email
        }
      }
    });

    if (error) throw error;

    // Profil oluştur
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: data.user.id,
          email: email,
          first_name: 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (profileError) throw profileError;
    }

    return {
      success: true,
      user: data.user
    };
  } catch (error: any) {
    console.error('Error in signInWithEmail:', error);
    return {
      success: false,
      error: error.message || 'Failed to sign in'
    };
  }
}

// Mevcut oturumu kontrol et
export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

// Çıkış yap
export async function signOut(): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error in signOut:', error);
    return {
      success: false,
      error: error.message || 'Failed to sign out'
    };
  }
}

// Auth state değişikliklerini dinle
export function onAuthStateChanged(callback: (session: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session);
  });
} 