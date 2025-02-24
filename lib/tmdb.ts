const TMDB_ACCESS_TOKEN = process.env.EXPO_PUBLIC_TMDB_ACCESS_TOKEN;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes
let lastFetchTime = 0;
let cachedMovies: Movie[] = [];

export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  adult: boolean;
  genre_ids: number[];
}

export interface Cast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface MovieDetails extends Movie {
  runtime: number;
  genres: { id: number; name: string }[];
  cast: Cast[];
}

export const TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p';

async function fetchFromTMDB(endpoint: string, page = 1): Promise<Movie[]> {
  if (!TMDB_ACCESS_TOKEN) {
    console.error('TMDB access token is missing');
    return [];
  }

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}${endpoint}?include_adult=false&include_video=false&language=en-US&page=${page}`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
          'accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.status_message || 'Failed to fetch movies');
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching from TMDB:', error);
    return [];
  }
}

export async function getPopularMovies(page = 1): Promise<Movie[]> {
  return fetchFromTMDB('/discover/movie?sort_by=popularity.desc', page);
}

export async function getTopRatedMovies(page = 1): Promise<Movie[]> {
  return fetchFromTMDB('/movie/top_rated', page);
}

export async function getTrendingMovies(page = 1): Promise<Movie[]> {
  return fetchFromTMDB('/trending/movie/week', page);
}

export async function getUpcomingMovies(page = 1): Promise<Movie[]> {
  return fetchFromTMDB('/movie/upcoming', page);
}

export function getImageUrl(path: string, size: 'poster' | 'backdrop' = 'poster'): string {
  if (!path) return 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800';
  const baseUrl = 'https://image.tmdb.org/t/p';
  const imageSize = size === 'poster' ? 'w500' : 'original';
  return `${baseUrl}/${imageSize}${path}`;
}

export async function getMovieDetails(movieId: number): Promise<MovieDetails | null> {
  if (!TMDB_ACCESS_TOKEN) {
    console.error('TMDB access token is missing');
    return null;
  }

  try {
    // Fetch movie details
    const [detailsResponse, creditsResponse] = await Promise.all([
      fetch(
        `${TMDB_BASE_URL}/movie/${movieId}?language=en-US`,
        {
          headers: {
            'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
            'accept': 'application/json'
          }
        }
      ),
      fetch(
        `${TMDB_BASE_URL}/movie/${movieId}/credits?language=en-US`,
        {
          headers: {
            'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
            'accept': 'application/json'
          }
        }
      )
    ]);

    if (!detailsResponse.ok || !creditsResponse.ok) {
      throw new Error('Failed to fetch movie details');
    }

    const [details, credits] = await Promise.all([
      detailsResponse.json(),
      creditsResponse.json()
    ]);

    return {
      ...details,
      cast: credits.cast.slice(0, 10), // Get top 10 cast members
      tmdb_data: details.tmdb_data // Assuming tmdb_data is available in the details object
    };
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return null;
  }
}

async function saveMovie(newMovie) {
  // ...
  const movieData = {
    // ...
    tmdb_data: newMovie.tmdb_data,
    // ...
  };
  // ...
}