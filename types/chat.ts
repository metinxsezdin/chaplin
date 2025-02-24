export interface Chat {
  id: string;
  user: {
    id: string;
    first_name: string;
    avatar_url: string | null;
  };
  lastMessage: {
    content: string;
    created_at: string;
    is_mine: boolean;
  } | null;
  created_at: string;
} 