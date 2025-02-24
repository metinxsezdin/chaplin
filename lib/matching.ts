import { supabase } from './supabase';

export async function findPotentialMatches(userId: string) {
  try {
    // Önce yakındaki kullanıcıları bul
    const { data: nearbyUsers, error: locationError } = await supabase
      .rpc('get_nearby_matches', { user_id: userId });

    if (locationError) throw locationError;

    if (!nearbyUsers?.length) return [];

    // Yakındaki kullanıcıların film tercihlerini kontrol et
    const { data: matches, error: matchError } = await supabase
      .from('user_movie_preferences')
      .select(`
        user_id,
        movie_id,
        status
      `)
      .in('user_id', nearbyUsers.map(u => u.match_user_id))
      .eq('status', 'watched');

    if (matchError) throw matchError;

    // Kullanıcının kendi film tercihleri
    const { data: userPreferences, error: prefError } = await supabase
      .from('user_movie_preferences')
      .select('movie_id, status')
      .eq('user_id', userId)
      .eq('status', 'watched');

    if (prefError) throw prefError;

    // Film eşleşmelerini hesapla
    const matchScores = nearbyUsers.map(nearbyUser => {
      const userMovies = matches
        ?.filter(m => m.user_id === nearbyUser.match_user_id)
        .map(m => m.movie_id);

      const commonMovies = userPreferences
        ?.filter(p => userMovies?.includes(p.movie_id))
        .length || 0;

      return {
        userId: nearbyUser.match_user_id,
        distance: nearbyUser.distance / 1000, // Convert to km
        commonMovies,
        score: calculateMatchScore(commonMovies, nearbyUser.distance)
      };
    });

    return matchScores
      .filter(match => match.score > 0.5) // Minimum eşleşme skoru
      .sort((a, b) => b.score - a.score);

  } catch (error) {
    console.error('Error finding matches:', error);
    return [];
  }
}

function calculateMatchScore(commonMovies: number, distance: number): number {
  // Mesafe ve ortak film sayısına göre 0-1 arası bir skor hesapla
  const distanceScore = Math.max(0, 1 - (distance / 150000)); // 150km max
  const movieScore = Math.min(1, commonMovies / 10); // 10+ ortak film max skor

  // Ağırlıklı ortalama (film tercihleri daha önemli)
  return (movieScore * 0.7) + (distanceScore * 0.3);
} 