import { useLocation, useNavigate } from "react-router-dom";
import ChessBoard from "../features/games/ChessBoard";
import type { Game } from "../types/types";
import type { MoveResult } from "../features/analysis/gameAnalysis";

export default function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();

  const game = location.state?.game as Game | undefined;
  const analysedMoves = location.state?.analysedMoves as
    | MoveResult[]
    | undefined;

  if (!game) {
    return (
      <main>
        <p>No game found.</p>
        <button className="chessboard-btn" onClick={() => navigate(-1)}>
          Go back
        </button>
      </main>
    );
  }

  const white = game.white.username;
  const black = game.black.username;

  return (
    <main>
      <h1 className="player-profile-username">
        {white} vs {black}
      </h1>
      <ChessBoard game={game} analysedMoves={analysedMoves} />
    </main>
  );
}
