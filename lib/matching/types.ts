// Temel kullanıcı özellikleri için interface
export interface UserPreferences {
  id: string;           // userId ekleyelim
  genres: string[];          // Tercih edilen film türleri
  favoriteMovies: string[]; // Favori filmler
  watchlist: string[];      // İzleme listesi
  ratings: { [movieId: string]: number }; // Film değerlendirmeleri
}

// Eşleştirme sonucu için interface
export interface MatchResult {
  userId: string;
  score: number;
  matchReason: string[];
}

// Eşleştirme stratejisi için interface
export interface MatchingStrategy {
  calculateMatch(user1: UserPreferences, user2: UserPreferences): MatchResult;
} 