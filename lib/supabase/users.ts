import { supabase } from '../supabase';

// Tip tanımlamaları
interface UserPreferences {
  id: string;
  genres: number[];
  favoriteMovies: number[];
  watchlist: number[];
  ratings: Record<number, number>;
}

interface MoviePreference {
  user_id: string;
  movie_id: number;
  status: string;
  liked: boolean;
}

interface GenrePreference {
  genre_id: number;
}

interface Rating {
  movie_id: number;
  rating: number;
}

interface MovieInteraction {
  movie_id: number;
  action: 'watched' | 'watchlist' | 'liked' | 'disliked';
  rating?: number;
  created_at: string;
  movie?: {
    id: number;
    title: string;
    poster_path: string;
    genre_ids: number[];
  };
}

interface SupabaseProfile {
  firebase_uid: string;
  first_name: string;
  avatar_url: string | null;
}

interface MatchResponse {
  id: string;
  match_score: number;
  user1: {
    firebase_uid: string;
    first_name: string;
    avatar_url: string | null;
  };
  user2: {
    firebase_uid: string;
    first_name: string;
    avatar_url: string | null;
  };
}

interface MatchData {
  id: string;
  match_score: number;
  user1_id: string;
  user2_id: string;
  user1: {
    firebase_uid: string;
    first_name: string;
    avatar_url: string | null;
  };
  user2: {
    firebase_uid: string;
    first_name: string;
    avatar_url: string | null;
  };
}

interface Match {
  id: string;
  match_score: number;
  user1: {
    id: string;
    first_name: string;
    avatar_url: string | null;
  };
  user2: {
    id: string;
    first_name: string;
    avatar_url: string | null;
  };
}

// Film etkileşimlerini getir
export async function getMovieInteractions(userId: string) {
  const { data, error } = await supabase
    .from('movie_interactions')
    .select('*')
    .eq('firebase_uid', userId);

  if (error) {
    console.error('Error fetching movie interactions:', error);
    return [];
  }

  return data;
}

// Film etkileşimi ekle/güncelle
export async function setMovieInteraction(
  userId: string,
  movieId: number,
  interaction: {
    action: 'watched' | 'watchlist' | 'liked' | 'disliked';
    rating?: number;
  }
) {
  const { error } = await supabase
    .from('movie_interactions')
    .upsert({
      firebase_uid: userId,
      movie_id: movieId,
      action: interaction.action,
      rating: interaction.rating,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error setting movie interaction:', error);
    return false;
  }

  return true;
}

// Film değerlendirmesini güncelle
export async function updateMovieRating(
  userId: string,
  movieId: number,
  rating: number
) {
  const { error } = await supabase
    .from('movie_interactions')
    .update({
      rating: rating,
      action: 'watched', // Rating varsa watched olarak işaretle
      updated_at: new Date().toISOString()
    })
    .eq('firebase_uid', userId)
    .eq('movie_id', movieId);

  if (error) {
    console.error('Error updating movie rating:', error);
    return false;
  }

  return true;
}

// Kullanıcının izlediği filmleri getir
export async function getWatchedMovies(userId: string) {
  const { data, error } = await supabase
    .from('movie_interactions')
    .select('movie_id, rating, action')
    .eq('firebase_uid', userId)
    .eq('action', 'watched');

  if (error) {
    console.error('Error fetching watched movies:', error);
    return [];
  }

  return data;
}

// Kullanıcının watchlist'ini getir
export async function getWatchlist(userId: string) {
  const { data, error } = await supabase
    .from('movie_interactions')
    .select('movie_id')
    .eq('firebase_uid', userId)
    .eq('action', 'watchlist');

  if (error) {
    console.error('Error fetching watchlist:', error);
    return [];
  }

  return data.map(item => item.movie_id);
}

// Eşleşmeleri getir
export async function getMatches(userId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select<'matches', MatchData>(`
      id,
      match_score,
      user1_id,
      user2_id,
      user1:profiles(firebase_uid, first_name, avatar_url),
      user2:profiles(firebase_uid, first_name, avatar_url)
    `)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('match_score', { ascending: false });

  if (error) {
    console.error('Error fetching matches:', error);
    return [];
  }

  return (data || []).map(match => ({
    id: match.id,
    match_score: match.match_score,
    user1: {
      id: match.user1?.firebase_uid || '',
      first_name: match.user1?.first_name || '',
      avatar_url: match.user1?.avatar_url
    },
    user2: {
      id: match.user2?.firebase_uid || '',
      first_name: match.user2?.first_name || '',
      avatar_url: match.user2?.avatar_url
    }
  }));
}

// Eşleşme skoru hesapla ve kaydet
export async function calculateAndSaveMatch(user1Id: string, user2Id: string) {
  try {
    // Eşleşme skorunu hesapla
    const { data: score, error: scoreError } = await supabase
      .rpc('calculate_match_score', { 
        user1_id: user1Id,
        user2_id: user2Id 
      });

    if (scoreError) throw scoreError;

    // Eşleşmeyi kaydet
    const { error: matchError } = await supabase
      .from('matches')
      .upsert({
        user1_id: user1Id,
        user2_id: user2Id,
        match_score: score,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user1_id,user2_id'
      });

    if (matchError) throw matchError;

    return true;
  } catch (error) {
    console.error('Error calculating/saving match:', error);
    return false;
  }
}

// Profil getir
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('firebase_uid', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
}

// Test fonksiyonu
export async function testMatchMechanism(userId: string) {
  try {
    // 1. Kullanıcının tercihlerini kontrol et
    const userPrefs = await getMovieInteractions(userId);
    console.log('User Preferences:', userPrefs);

    // 2. Mevcut eşleşmeleri kontrol et
    const currentMatches = await getMatches(userId);
    console.log('Current Matches:', currentMatches);

    // 3. Trigger'ın çalışıp çalışmadığını kontrol et
    const { data: triggerTest, error: triggerError } = await supabase
      .from('user_movie_preferences')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (triggerError) {
      console.error('Trigger test error:', triggerError);
      return false;
    }

    // 4. Eşleşme skorlarını kontrol et
    const { data: matchScores, error: matchError } = await supabase
      .rpc('calculate_match_score', { 
        user1_id: userId,
        user2_id: triggerTest?.[0]?.user_id 
      });

    if (matchError) {
      console.error('Match score calculation error:', matchError);
      return false;
    }

    console.log('Match Scores:', matchScores);
    return true;

  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

// Kullanıcı profili kontrol et
export async function checkProfile(firebaseUid: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('firebase_uid', firebaseUid)
      .maybeSingle();

    if (error) throw error;
    return { exists: !!data, profile: data };
  } catch (error) {
    console.error('Error checking profile:', error);
    return { exists: false, profile: null };
  }
}

// Ayrıca createMatch fonksiyonunu ekleyelim (matches.tsx'te kullanılıyor)
export async function createMatch(user1Id: string, user2Id: string, matchScore: number) {
  try {
    const { error } = await supabase
      .from('matches')
      .upsert({
        user1_id: user1Id,
        user2_id: user2Id,
        match_score: matchScore,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user1_id,user2_id'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating match:', error);
    return false;
  }
} 