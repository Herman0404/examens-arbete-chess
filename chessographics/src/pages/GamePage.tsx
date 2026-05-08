/**
 * GamePage — the individual game route ("/game/:gameId").
 * Receives the full game object via React Router location state
 * and renders the ChessBoard component.
 */

import { useLocation, useNavigate } from "react-router-dom";
import ChessBoard from "../features/games/ChessBoard";
import type { Game } from "../types/types";

export default function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Game is passed via navigation state from ProfilePage
  const game = location.state?.game as Game | undefined;

  // If someone navigates directly to the URL without state, send them back
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
      <ChessBoard game={game} />
    </main>
  );
}
