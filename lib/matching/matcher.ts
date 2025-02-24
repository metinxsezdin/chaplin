import { supabase } from '../supabase';

export class MovieMatcher {
  public static readonly MATCH_THRESHOLD = 0.5; // Minimum eşleşme skoru

  static async findMatches(userId: string) {
    try {
      // Kullanıcının beğendiği filmleri al
      const { data: userLikes } = await supabase
        .from('user_movie_preferences')
        .select('movie_id')
        .eq('user_id', userId)
        .eq('action', 'like');

      if (!userLikes?.length) return [];

      // Ortak film beğenilerine sahip kullanıcıları bul
      const { data: matches } = await supabase
        .rpc('find_matches', { user_id: userId });

      return matches || [];
    } catch (error) {
      console.error('Error finding matches:', error);
      return [];
    }
  }

  static async createMatch(user1Id: string, user2Id: string, matchScore: number) {
    try {
      const { data, error } = await supabase
        .from('movie_matches')
        .insert({
          user1_id: user1Id < user2Id ? user1Id : user2Id,
          user2_id: user1Id < user2Id ? user2Id : user1Id,
          match_score: matchScore,
          status: 'matched' // Otomatik eşleştir
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating match:', error);
      return null;
    }
  }
} 