export interface Profile {
  id: string;
  email: string;
  first_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'accepted' | 'rejected';
}

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
  genres?: { id: number; name: string }[];
}

export interface MovieInteraction {
  id: string;
  user_id: string;
  movie_id: number;
  action: 'watched' | 'watchlist' | 'liked' | 'disliked' | 'skip';
  created_at: string;
}

// ... diğer interface'ler aynı kalacak 