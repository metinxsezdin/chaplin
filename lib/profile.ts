import { supabase } from './supabase';

// Profil oluştur
export async function createProfile(data: {
  firebase_uid: string;
  first_name: string;
}) {
  try {
    console.log('Creating profile for:', data.first_name);
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        firebase_uid: data.firebase_uid,
        first_name: data.first_name,
        onboarding_completed: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      throw error;
    }

    return { profile, error: null };
  } catch (error) {
    console.error('Error creating profile:', error);
    return { profile: null, error };
  }
}

// Profil getir
export async function getProfile(firebaseUid: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('firebase_uid', firebaseUid)
      .single();

    return { profile: data, error };
  } catch (error) {
    console.error('Error fetching profile:', error);
    return { profile: null, error };
  }
}

// Profil güncelle
export async function updateProfile(
  firebaseUid: string,
  updates: {
    first_name?: string;
    phone_number?: string;
    avatar_url?: string;
  }
) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('firebase_uid', firebaseUid)
      .select()
      .single();

    return { profile: data, error };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { profile: null, error };
  }
} 