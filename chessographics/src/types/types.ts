// Chess.com player profile
export interface PlayerProfile {
  username: string;
  avatar?: string;
  player_id: number;
  url: string;
  name?: string;
  followers: number;
  country: string;
  joined: number;
}

// Rating info for a single time control
export interface RatingEntry {
  last?: {
    rating: number;
    date: number;
    rd: number;
  };
  best?: {
    rating: number;
    date: number;
    game: string;
  };
  record?: {
    win: number;
    loss: number;
    draw: number;
  };
}

// Player stats across all time controls
export interface PlayerStats {
  chess_rapid?: RatingEntry;
  chess_blitz?: RatingEntry;
  chess_bullet?: RatingEntry;
  chess_daily?: RatingEntry;
}

// A single game from the Chess.com archives
export interface Game {
  url: string;
  // Time info
  time_class: string;
  time_control: string;
  end_time: number;
  // Players
  white: {
    username: string;
    rating: number;
    result: string;
  };
  black: {
    username: string;
    rating: number;
    result: string;
  };
  // Game data
  pgn?: string;
}
