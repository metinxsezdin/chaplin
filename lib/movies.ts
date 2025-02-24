import { supabase } from './supabase';
import { WatchedMovieData, FilterOptions } from '../types/movies';

export async function loadWatchedMovies(
  userId: string,
  filters: FilterOptions,
  searchQuery: string
): Promise<WatchedMovieData[]> {
  try {
    // user_movie_preferences tablosundan verileri al
    const { data: watchedMovies, error: watchedError } = await supabase
      .from('user_movie_preferences')
      .select(`
        movie_id,
        movies!inner (
          title,
          poster_path,
          vote_average,
          release_date
        ),
        created_at
      `)
      .eq('user_id', userId)
      .eq('status', 'watched')
      .gte('movies.release_date', `${filters.year.min}-01-01`)
      .lte('movies.release_date', `${filters.year.max}-12-31`)
      .gte('movies.vote_average', filters.imdbRating.min)
      .lte('movies.vote_average', filters.imdbRating.max)
      .order('created_at', { ascending: false });

    if (watchedError) throw watchedError;

    // user_ratings tablosundan verileri al
    const { data: ratings, error: ratingsError } = await supabase
      .from('user_ratings')
      .select('movie_id, rating')
      .eq('user_id', userId);

    if (ratingsError) throw ratingsError;

    // Filmleri ve kullanıcı puanlarını birleştir
    const movies = watchedMovies.map(movie => ({
      movie_id: movie.movie_id,
      movies: movie.movies,
      user_ratings: ratings
        ?.filter(r => r.movie_id === movie.movie_id)
        .map(r => ({ rating: r.rating })) || [],
      created_at: movie.created_at
    }));

    // Arama filtresini uygula
    return movies.filter(movie => {
      const matchesSearch = searchQuery
        ? movie.movies.title.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      const userRating = movie.user_ratings[0]?.rating || 0;
      const matchesUserRating = userRating >= filters.userRating.min && 
                               userRating <= filters.userRating.max;

      return matchesSearch && matchesUserRating;
    });

  } catch (error) {
    console.error('Error in loadWatchedMovies:', error);
    throw error;
  }
} 