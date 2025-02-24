export interface Profile {
  id: string;
  first_name: string;
  avatar_url: string | null;
  updated_at?: string;
}

export interface ProfileUpdate {
  first_name?: string;
  avatar_url?: string | null;
} 