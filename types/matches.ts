import { Profile } from './users';

export interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  status: string;
  created_at: string;
  matched_user: Profile;
} 