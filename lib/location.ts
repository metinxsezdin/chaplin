import * as Location from 'expo-location';
import { supabase } from './supabase';

export async function updateUserLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access location was denied');
    }

    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;

    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;

    if (!userId) {
      throw new Error('No authenticated user');
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        location: `POINT(${longitude} ${latitude})`,
        location_updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating location:', error);
    return false;
  }
} 