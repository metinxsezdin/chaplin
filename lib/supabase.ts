import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform, Alert } from 'react-native';

// Constants for chunked storage
const CHUNK_SIZE = 1800; // Safely under 2048 byte limit

// Helper functions for chunked storage
const chunkString = (str: string): string[] => {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += CHUNK_SIZE) {
    chunks.push(str.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
};

const getChunkKey = (key: string, index: number) => `${key}_chunk_${index}`;
const getChunkCountKey = (key: string) => `${key}_chunk_count`;

// Custom storage adapter for web platform
const webStorage = {
  getItem: (key: string) => {
    try {
      return Promise.resolve(localStorage.getItem(key));
    } catch (error) {
      return Promise.reject(error);
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      return Promise.resolve(undefined);
    } catch (error) {
      return Promise.reject(error);
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
      return Promise.resolve(undefined);
    } catch (error) {
      return Promise.reject(error);
    }
  },
};

// Use SecureStore on native platforms, localStorage on web
const storage = Platform.OS === 'web' ? webStorage : {
  getItem: async (key: string) => {
    try {
      // Try to get chunk count
      const countStr = await SecureStore.getItemAsync(getChunkCountKey(key));
      
      if (!countStr) {
        // No chunks, try regular get
        return SecureStore.getItemAsync(key);
      }

      // Reassemble chunks
      const count = parseInt(countStr, 10);
      const chunks: string[] = [];
      
      for (let i = 0; i < count; i++) {
        const chunk = await SecureStore.getItemAsync(getChunkKey(key, i));
        if (chunk) chunks.push(chunk);
      }
      
      return chunks.join('');
    } catch (error) {
      console.error('Error getting item:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (value.length < CHUNK_SIZE) {
        // Store directly if small enough
        await SecureStore.setItemAsync(key, value);
        // Clean up any existing chunks
        const oldCountStr = await SecureStore.getItemAsync(getChunkCountKey(key));
        if (oldCountStr) {
          const oldCount = parseInt(oldCountStr, 10);
          for (let i = 0; i < oldCount; i++) {
            await SecureStore.deleteItemAsync(getChunkKey(key, i));
          }
          await SecureStore.deleteItemAsync(getChunkCountKey(key));
        }
        return;
      }

      // Split into chunks and store
      const chunks = chunkString(value);
      await SecureStore.setItemAsync(getChunkCountKey(key), chunks.length.toString());
      
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(getChunkKey(key, i), chunks[i]);
      }
    } catch (error) {
      console.error('Error setting item:', error);
      throw error;
    }
  },
  removeItem: async (key: string) => {
    try {
      // Remove main item
      await SecureStore.deleteItemAsync(key);
      
      // Check and remove chunks if they exist
      const countStr = await SecureStore.getItemAsync(getChunkCountKey(key));
      if (countStr) {
        const count = parseInt(countStr, 10);
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(getChunkKey(key, i));
        }
        await SecureStore.deleteItemAsync(getChunkCountKey(key));
      }
    } catch (error) {
      console.error('Error removing item:', error);
      throw error;
    }
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anonymous Key');
}

// Debug function to check bucket existence
export const checkAvatarsBucket = async () => {
  try {
    const { data, error } = await supabase
      .storage
      .getBucket('avatars');
    
    console.log('Bucket check result:', { data, error });
    return { data, error };
  } catch (error) {
    console.error('Error checking bucket:', error);
    return { data: null, error };
  }
};

// Test avatar upload
export const testAvatarUpload = async (imageUri: string) => {
  try {
    console.log('Starting test upload for:', imageUri);
    
    // Check if bucket exists first
    const { error: bucketError } = await checkAvatarsBucket();
    if (bucketError) {
      console.error('Bucket error:', bucketError);
      throw new Error('Avatar storage is not properly configured');
    }

    const response = await fetch(imageUri);
    if (!response.ok) {
      console.error('Failed to fetch image:', response.status);
      throw new Error('Failed to fetch image');
    }

    const blob = await response.blob();
    if (!blob) {
      console.error('Failed to create blob');
      throw new Error('Failed to create blob from image');
    }

    console.log('Blob created:', {
      size: blob.size,
      type: blob.type
    });

    const fileName = `test-${Date.now()}.jpg`;

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, blob, {
        contentType: blob.type,
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      return { error };
    }

    console.log('Upload successful:', data);

    // List files in bucket to verify upload
    const { data: files, error: listError } = await supabase.storage
      .from('avatars')
      .list();
    
    if (!listError) {
      console.log('Files in bucket:', files);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    console.log('Public URL:', publicUrl);
    return { url: publicUrl, error: null };
  } catch (error) {
    console.error('Test upload error:', error);
    return { error };
  }
};

// Sadece database client - auth özelliklerini tamamen devre dışı bırak
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// Veritabanı bağlantısını test et
export const testDatabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Database connection error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Database test error:', error);
    return false;
  }
};

// Firebase UID ile profil kontrolü
export async function checkProfile(firebaseUid: string) {
  try {
    console.log('Checking profile for Firebase UID:', firebaseUid);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('firebase_uid', firebaseUid)
      .maybeSingle();

    if (error) {
      console.error('Profile check error:', error);
      throw error;
    }

    console.log('Profile check result:', data);
    return { exists: !!data, profile: data };
  } catch (error) {
    console.error('Error checking profile:', error);
    return { exists: false, profile: null };
  }
}