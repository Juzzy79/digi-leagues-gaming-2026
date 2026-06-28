export type TournamentFormat = 'single_elimination' | 'double_elimination' | 'round_robin' | 'ffa_league';
export type TournamentStatus = 'upcoming' | 'registration' | 'active' | 'completed';
export type EntryType = '1v1' | 'team';

export interface ScoringRules {
    win: number;
    loss: number;
    draw: number;
    [key: string]: number; // extensible for custom rules like 'first_blood' or 'fastest_lap'
}

export interface Tournament {
    id: string;
    circuit_id?: string | null;
    title: string;
    game: string;
    entry_type: EntryType;
    format: TournamentFormat;
    best_of: number;
    status: TournamentStatus;
    max_players?: number | null;
    
    scoring_rules: ScoringRules;
    has_playoffs: boolean;
    elo_multiplier: number;
    
    auto_start_min_players?: number | null;
    auto_schedule_next: boolean;
    
    prize_info?: string | null;
    banner_url?: string | null;
    start_date?: string | null;
    created_by?: string | null;
    created_at: string;
}

export type ParticipantStatus = 'active' | 'eliminated' | 'withdrawn';

export interface TournamentParticipant {
    id: string;
    tournament_id: string;
    participant_id: string; // Refers to the profile ID submitting the entry
    team_name?: string | null; // Used if EntryType is 'team'
    seed?: number | null;
    standing?: number | null;
    points: number;
    tie_breaker_stats?: Record<string, any> | null;
    status: ParticipantStatus;
    registered_at: string;
    
    // Optional joined data from 'profiles'
    profile?: {
        username: string;
        avatar_url?: string;
    };
}

export type MatchStatus = 'scheduled' | 'ongoing' | 'reported' | 'completed' | 'disputed';

export interface Match {
    id: string;
    tournament_id: string;
    round: number;
    bracket_match_id?: string | null;
    participant1_id?: string | null;
    participant2_id?: string | null;
    winner_id?: string | null;
    score1: number;
    score2: number;
    status: MatchStatus;
    auto_approve_at?: string | null;
    genre_stats?: Record<string, any> | null;
    created_at: string;
    
    // Optional joined data
    participant1?: TournamentParticipant;
    participant2?: TournamentParticipant;
}

export type MatchReportStatus = 'pending_verification' | 'approved' | 'rejected';

export interface MatchReport {
    id: string;
    match_id: string;
    submitted_by: string; // Refers to the profile ID
    score1: number;
    score2: number;
    genre_stats?: Record<string, any> | null;
    status: MatchReportStatus;
    verified_by?: string | null;
    created_at: string;
}
