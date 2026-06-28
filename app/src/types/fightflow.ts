export type TournamentEntryType = '1v1' | 'team';
export type TournamentFormat = 'single_elimination' | 'double_elimination' | 'round_robin' | 'ffa_league';
export type TournamentStatus = 'upcoming' | 'registration' | 'active' | 'completed';
export type TournamentTier = 'daily' | 'weekly' | 'monthly' | 'major';
export type ParticipantStatus = 'active' | 'eliminated' | 'withdrawn';
export type MatchStatus = 'scheduled' | 'ongoing' | 'reported' | 'completed' | 'disputed';
export type MatchReportStatus = 'pending_verification' | 'approved' | 'rejected';

export interface Tournament {
  id: string;
  circuit_id?: string;
  name: string;
  game: string;
  entry_type: TournamentEntryType;
  format: TournamentFormat;
  best_of: number;
  status: TournamentStatus;
  tier: TournamentTier;
  max_participants: number;
  scoring_rules: { win: number; loss: number; draw: number } | any;
  has_playoffs: boolean;
  elo_multiplier: number;
  auto_start_min_players?: number;
  auto_schedule_next: boolean;
  description?: string;
  prize_info?: string;
  image_url?: string;
  start_time?: string;
  created_by?: string;
  created_at: string;
  is_manual?: boolean;
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  participant_id: string;
  team_name?: string;
  seed?: number;
  standing?: number;
  points: number;
  tie_breaker_stats?: any;
  status: ParticipantStatus;
  registered_at: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  round: number;
  bracket_match_id?: string;
  participant1_id?: string;
  participant2_id?: string;
  winner_id?: string;
  score1: number;
  score2: number;
  status: MatchStatus;
  auto_approve_at?: string;
  genre_stats?: any;
  created_at: string;
}

export interface MatchReport {
  id: string;
  match_id: string;
  submitted_by: string;
  score1: number;
  score2: number;
  genre_stats?: any;
  status: MatchReportStatus;
  verified_by?: string;
  created_at: string;
}
