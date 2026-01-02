// TypeScript types for the application
// Based on specs and backend schema

export interface User {
  id: number;
  username: string;
  email: string;
  email_verified_at?: string;
  created_at: string;
}

export interface UserProfile {
  user_id: number;
  username: string;
  email?: string;
  first_name?: string | null;
  last_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  privacy_settings?: Record<string, 'public' | 'private'>;
}

export interface Resolution {
  id: number;
  text: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: number;
  name: string;
  leader_user_id: number;
  team_resolution_text?: string;
  status: 'forming' | 'started';
  created_at: string;
  role?: 'leader' | 'member';
}

export interface TeamMember {
  id: number;
  username: string;
  role: 'leader' | 'member';
  joined_at: string;
}

export interface TeamProvidedResolution {
  id: number;
  team_id: number;
  from_user_id: number;
  to_user_id: number;
  text: string;
  from_username?: string;
}

export interface BingoCard {
  id: number;
  teamId: number;
  userId: number;
  gridSize: number;
  cells: BingoCell[];
}

export interface BingoCell {
  id: number;
  card_id: number;
  row_num: number;
  col_num: number;
  resolution_text: string;
  is_joker: boolean;
  is_empty: boolean;
  state: 'to_complete' | 'completed';
  source_type?: 'team_resolution' | 'team_provided' | 'personal';
  source_resolution_id?: number;
}

export interface Proof {
  id: number;
  cell_id: number;
  file_path: string;
  file_type: string;
  status: 'pending' | 'approved' | 'declined';
  uploaded_at: string;
  reviewed_at?: string;
  reviewed_by_user_id?: number;
  reviewed_by_username?: string;
  review_comment?: string;
}
