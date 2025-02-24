import { UserPreferences, MatchResult, MatchingStrategy } from './types';

export class SimpleMatchingStrategy implements MatchingStrategy {
  calculateMatch(user1: UserPreferences, user2: UserPreferences): MatchResult {
    let score = 0;
    const matchReason: string[] = [];

    // Genre-based matching (30% of total score)
    const commonGenres = user1.genres.filter(genre => 
      user2.genres.includes(genre)
    );
    const genreScore = (commonGenres.length / Math.max(user1.genres.length, user2.genres.length)) * 30;
    score += genreScore;
    
    if (commonGenres.length > 0) {
      matchReason.push(`Ortak ${commonGenres.length} film türü: ${commonGenres.join(', ')}`);
    }

    // Favorite movies matching (40% of total score)
    const commonFavorites = user1.favoriteMovies.filter(movie => 
      user2.favoriteMovies.includes(movie)
    );
    const favoriteScore = (commonFavorites.length / Math.max(user1.favoriteMovies.length, user2.favoriteMovies.length)) * 40;
    score += favoriteScore;

    if (commonFavorites.length > 0) {
      matchReason.push(`${commonFavorites.length} ortak favori film`);
    }

    // Rating similarity (30% of total score)
    const commonRatedMovies = Object.keys(user1.ratings).filter(movieId => 
      movieId in user2.ratings
    );
    
    if (commonRatedMovies.length > 0) {
      let ratingDiffSum = 0;
      commonRatedMovies.forEach(movieId => {
        ratingDiffSum += Math.abs(user1.ratings[movieId] - user2.ratings[movieId]);
      });
      const avgRatingDiff = ratingDiffSum / commonRatedMovies.length;
      const ratingScore = ((5 - avgRatingDiff) / 5) * 30; // 5 is max rating difference
      score += ratingScore;

      matchReason.push(`${commonRatedMovies.length} ortak değerlendirilen film`);
    }

    return {
      userId: user2.id, // user2.userId yerine user2.id kullan
      score: Math.round(score),
      matchReason
    };
  }
}

export function calculateMatchScore(user1: UserPreferences, user2: UserPreferences): number {
  const weights = {
    favoriteMovies: 0.4,  // Ortak beğenilen filmlerin ağırlığı
    genres: 0.3,          // Ortak türlerin ağırlığı
    ratings: 0.2,         // Benzer değerlendirmelerin ağırlığı
    watchlist: 0.1        // İzleme listesindeki benzerliklerin ağırlığı
  };

  // 1. Ortak beğenilen filmler skoru
  const commonFavorites = user1.favoriteMovies.filter(movie => 
    user2.favoriteMovies.includes(movie)
  ).length;
  const favoriteMoviesScore = commonFavorites / 
    Math.max(1, Math.min(user1.favoriteMovies.length, user2.favoriteMovies.length));

  // 2. Ortak film türleri skoru
  const commonGenres = user1.genres.filter(genre => 
    user2.genres.includes(genre)
  ).length;
  const genresScore = commonGenres / 
    Math.max(1, Math.min(user1.genres.length, user2.genres.length));

  // 3. Film değerlendirmeleri benzerlik skoru
  let ratingsScore = 0;
  let commonRatings = 0;
  
  // Ortak değerlendirilen filmlerin benzerlik skorunu hesapla
  Object.keys(user1.ratings).forEach(movieId => {
    if (user2.ratings[movieId]) {
      commonRatings++;
      // Değerlendirme farkının mutlak değerini al (1-5 arası)
      const ratingDiff = Math.abs(user1.ratings[movieId] - user2.ratings[movieId]);
      // Farkı 0-1 arasında bir skora dönüştür
      ratingsScore += 1 - (ratingDiff / 4);
    }
  });
  
  // En az 3 ortak değerlendirme varsa skoru hesapla
  const finalRatingsScore = commonRatings >= 3 ? 
    ratingsScore / commonRatings : 0;

  // 4. İzleme listesi benzerlik skoru
  const commonWatchlist = user1.watchlist.filter(movie => 
    user2.watchlist.includes(movie)
  ).length;
  const watchlistScore = commonWatchlist / 
    Math.max(1, Math.min(user1.watchlist.length, user2.watchlist.length));

  // Toplam skoru hesapla
  const totalScore = (
    favoriteMoviesScore * weights.favoriteMovies +
    genresScore * weights.genres +
    finalRatingsScore * weights.ratings +
    watchlistScore * weights.watchlist
  );

  // Minimum eşleşme kriterleri
  const minimumCriteria = {
    commonFavorites: 1,   // En az 1 ortak beğenilen film
    commonGenres: 2,      // En az 2 ortak tür
    totalScore: 0.3       // Minimum toplam skor
  };

  // Minimum kriterleri kontrol et
  if (commonFavorites < minimumCriteria.commonFavorites ||
      commonGenres < minimumCriteria.commonGenres ||
      totalScore < minimumCriteria.totalScore) {
    return 0;
  }

  return totalScore;
}

// Bonus özellik: Detaylı eşleşme açıklaması
export function getMatchDetails(user1: UserPreferences, user2: UserPreferences) {
  const commonMovies = user1.favoriteMovies.filter(movie => 
    user2.favoriteMovies.includes(movie)
  );
  
  const commonGenres = user1.genres.filter(genre => 
    user2.genres.includes(genre)
  );

  return {
    commonMovies,
    commonGenres,
    commonMoviesCount: commonMovies.length,
    commonGenresCount: commonGenres.length,
    commonRatingsCount: Object.keys(user1.ratings)
      .filter(movieId => user2.ratings[movieId])
      .length
  };
} 