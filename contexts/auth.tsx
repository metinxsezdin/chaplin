import React, { createContext, useContext, useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { auth } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import firebase from 'firebase/compat/app';

interface User {
  id: string;
  phoneNumber: string | null;
  firebase_uid: string;
  first_name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mevcut oturumu kontrol et
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Sign out from Firebase
      await auth.signOut();
      // Sign out from Supabase (if needed)
      await supabase.auth.signOut();
      // The _layout.tsx will automatically redirect to phone-auth
      // since the auth state change will trigger the useEffect
    } catch (error) {
      console.error('Error signing out:', error);
      throw error; // Propagate error to handle it in the component
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Styles must be defined after the StyleSheet import
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  requiredFieldText: {
    color: '#ff6b6b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: -15,
    marginBottom: 15,
  },
});