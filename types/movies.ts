import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface MovieData {
  id?: number;
  tmdb_id?: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
}

export interface WatchedMovieData {
  movie_id: number;
  movies: MovieData;
  rating?: number;
  action: string;
  created_at: string;
}

export interface FilterOptions {
  year: {
    min: number;
    max: number;
  };
  genre: string[];
  imdbRating: {
    min: number;
    max: number;
  };
  userRating: {
    min: number;
    max: number;
  };
}

export type RatingPayload = RealtimePostgresChangesPayload<{
  movie_id: number;
  rating: number;
  user_id: string;
}>; 