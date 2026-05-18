import { ecoToName } from "./ecoNames";
import { Chess } from "chess.js";
import type { Game } from "../../types/types";

// Centipawn (scoring system) loss thresholds for move classification
const THRESHOLDS = {
  brilliant: 5, // best move in a complex position
  best: 10, // engine top choice
  excellent: 25, // very strong move
  good: 50, // small inaccuracy
  inaccuracy: 150, // noticeable mistake
  mistake: 400, // serious mistake
  // Anything above = blunder
};

// Every possible move classification
export type MoveClass =
  | "brilliant"
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

// Analysis result for a single move
export interface MoveResult {
  san: string; // Move in SAN notation
  from: string; // Starting square
  to: string; // Destination square
  color: "w" | "b"; // Player color
  classification: MoveClass; // Move quality classification
  cploss: number; // Centipawn loss for the move
}

// Full analysis result for one game
export interface GameAnalysisResult {
  gameUrl: string; // Chess.com game URL
  moves: MoveResult[]; // Analysis for every move
  accuracy: number; // Overall game accuracy
  classificationCounts: Record<MoveClass, number>; // Counts for all move classifications
  userClassificationCounts: Record<MoveClass, number>; // Counts for only the user's moves
  opening: string | null; // Opening name
  white: string; // White player's username
  black: string; // Black player's username
  whiteResult: string; // White player's game result
  userColor: "w" | "b"; // User's color in the game
}

// Progress data while analyzing games
export interface AnalysisProgress {
  currentGame: number; // Current game being analyzed
  totalGames: number; // Total number of games
  currentMove: number; // Current move being analyzed
  totalMoves: number; // Total moves in current game
}

// Convert centipawn loss into move classification
function classify(cpLoss: number, isOnlyGoodMove: boolean): MoveClass {
  // Brilliant if it was the only strong move
  if (isOnlyGoodMove && cpLoss <= THRESHOLDS.brilliant) {
    return "brilliant";
  }
  if (cpLoss <= THRESHOLDS.best) return "best";
  if (cpLoss <= THRESHOLDS.excellent) return "excellent";
  if (cpLoss <= THRESHOLDS.good) return "good";
  if (cpLoss <= THRESHOLDS.inaccuracy) return "inaccuracy";
  if (cpLoss <= THRESHOLDS.mistake) return "mistake";

  return "blunder";
}

// Convert average centipawn loss into accuracy % (not used)
function cpLossToAccuracy(avgCpLoss: number): number {
  return Math.max(
    0,
    Math.min(100, 103.1668 * Math.exp(-0.016 * avgCpLoss) - 3.1669),
  );
}

// Extract opening name from PGN
function getOpening(pgn: string | undefined): string | null {
  if (!pgn) return null;

  // Try ECO code first
  const eco = pgn.match(/\[ECO "([^"]+)"\]/)?.[1];

  if (eco) {
    const name = ecoToName(eco);

    if (name) return name;
  }

  // Fallback to PGN opening tag
  const opening = pgn.match(/\[Opening "([^"]+)"\]/)?.[1];

  // Remove variations after ":" or ","
  if (opening) return opening.split(/[:,]/)[0].trim();

  return null;
}

// Create and initialize Stockfish worker
function bootEngine(): Promise<Worker> {
  return new Promise((resolve, reject) => {
    const workerCode = `
      importScripts("https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js");
    `;

    let worker: Worker;

    try {
      // Create worker from inline script
      const blob = new Blob([workerCode], {
        type: "application/javascript",
      });

      worker = new Worker(URL.createObjectURL(blob));
    } catch (err) {
      reject(err);
      return;
    }

    const onMsg = (e: MessageEvent) => {
      const line = typeof e.data === "string" ? e.data : String(e.data ?? "");

      // Engine initialized
      if (line === "uciok") {
        // MultiPV 2 = best move + second best move
        worker.postMessage("setoption name MultiPV value 2");

        worker.postMessage("isready");

        return;
      }

      // Engine fully ready
      if (line === "readyok") {
        worker.removeEventListener("message", onMsg);

        resolve(worker);
      }
    };

    worker.addEventListener("message", onMsg);

    worker.onerror = reject;

    worker.postMessage("uci");
  });
}

interface MoveEval {
  // Best engine evaluation
  bestScore: number;

  // Score of played move
  // null if not in top 2
  playedScore: number | null;

  // Engine best move
  bestMove: string;
}

// Evaluate position using MultiPV 2
// Gets best move + second best move in one search
// Also checks if played move was the best/second best move
function evaluateWithMultiPV(
  worker: Worker,
  fen: string,
  movePlayed: string, // Example: "e2e4"
  depth: number,
): Promise<MoveEval> {
  const chess = new Chess(fen);

  // Skip finished games
  if (chess.isGameOver()) {
    return Promise.resolve({
      bestScore: 0,
      playedScore: 0,
      bestMove: "",
    });
  }

  return new Promise((resolve) => {
    // Scores indexed by multipv number
    // 1 = best move, 2 = second best
    const scores: Record<number, { score: number; move: string }> = {};

    let bestMoveUci = "";

    worker.onmessage = (e: MessageEvent) => {
      const line: string =
        typeof e.data === "string" ? e.data : String(e.data ?? "");

      // Parse engine analysis lines
      if (
        line.startsWith("info") &&
        line.includes("multipv") &&
        line.includes("score")
      ) {
        const mpvMatch = line.match(/multipv (\d+)/);

        const cpMatch = line.match(/score cp (-?\d+)/);

        const mateMatch = line.match(/score mate (-?\d+)/);

        const pvMatch = line.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);

        if (mpvMatch && pvMatch) {
          const mpv = parseInt(mpvMatch[1]);

          const move = pvMatch[1];

          // Convert mate scores into huge cp values
          const score = mateMatch
            ? parseInt(mateMatch[1]) > 0
              ? 10000
              : -10000
            : cpMatch
              ? parseInt(cpMatch[1])
              : 0;

          scores[mpv] = { score, move };
        }
      }

      // Engine finished search
      if (line.startsWith("bestmove")) {
        const bm = line.match(/bestmove ([a-h][1-8][a-h][1-8][qrbn]?)/);

        if (bm) bestMoveUci = bm[1];

        worker.onmessage = null;

        const best = scores[1];
        const second = scores[2];

        // Fallback if no score found
        if (!best) {
          resolve({
            bestScore: 0,
            playedScore: 0,
            bestMove: bestMoveUci,
          });

          return;
        }

        const bestScore = best.score;

        bestMoveUci = best.move || bestMoveUci;

        // Played move = best move
        if (movePlayed === bestMoveUci || movePlayed === best.move) {
          resolve({
            bestScore,
            playedScore: bestScore,
            bestMove: bestMoveUci,
          });

          return;
        }

        // Played move = second best move
        if (second && movePlayed === second.move) {
          resolve({
            bestScore,
            playedScore: second.score,
            bestMove: bestMoveUci,
          });

          return;
        }

        // Played move not found in top 2
        resolve({
          bestScore,
          playedScore: second ? second.score : null,
          bestMove: bestMoveUci,
        });
      }
    };

    worker.postMessage(`position fen ${fen}`);

    worker.postMessage(`go depth ${depth}`);
  });
}

// Evaluate a specific move directly
function evaluateMove(
  worker: Worker,
  fen: string,
  moveUci: string,
  depth: number,
): Promise<number> {
  const chess = new Chess(fen);

  // Skip finished positions
  if (chess.isGameOver()) return Promise.resolve(0);

  return new Promise((resolve) => {
    // Latest engine evaluation score
    let latestScore = 0;

    worker.onmessage = (e: MessageEvent) => {
      const line: string =
        typeof e.data === "string" ? e.data : String(e.data ?? "");

      // Parse engine evaluation lines
      if (
        line.startsWith("info") &&
        line.includes("multipv 1") &&
        line.includes("score")
      ) {
        // Centipawn evaluation
        const cp = line.match(/score cp (-?\d+)/);

        // Mate evaluation
        const mate = line.match(/score mate (-?\d+)/);

        // Convert mate scores into huge cp values
        if (mate) {
          latestScore = parseInt(mate[1]) > 0 ? 10000 : -10000;
        } else if (cp) {
          latestScore = parseInt(cp[1]);
        }
      }

      // Engine finished searching
      if (line.startsWith("bestmove")) {
        worker.onmessage = null;

        resolve(latestScore);
      }
    };

    // Analyze position after the move is played
    worker.postMessage(`position fen ${fen} moves ${moveUci}`);

    // Start engine search
    worker.postMessage(`go depth ${depth}`);
  });
}

// Analyze multiple games
export async function analyseGames(
  games: Game[],
  username: string,
  onProgress: (progress: AnalysisProgress) => void,
): Promise<GameAnalysisResult[]> {
  const depth = 12;

  // Start Stockfish
  const worker = await bootEngine();

  const results: GameAnalysisResult[] = [];

  // Analyze each game
  for (let gi = 0; gi < games.length; gi++) {
    const game = games[gi];

    const chess = new Chess();

    // Load PGN moves
    if (game.pgn) chess.loadPgn(game.pgn);

    const history = chess.history({ verbose: true });

    const moveResults: MoveResult[] = [];

    let totalCpLoss = 0;

    // Replay board position move by move
    const replayChess = new Chess();

    for (let mi = 0; mi < history.length; mi++) {
      // Update progress UI
      onProgress({
        currentGame: gi + 1,
        totalGames: games.length,
        currentMove: mi + 1,
        totalMoves: history.length,
      });

      const move = history[mi];

      const fen = replayChess.fen();

      const uci = `${move.from}${move.to}${move.promotion ?? ""}`;

      // Skip already finished positions
      if (new Chess(fen).isGameOver()) {
        replayChess.move(move);

        moveResults.push({
          san: move.san,
          from: move.from,
          to: move.to,
          color: move.color,
          classification: "best",
          cploss: 0,
        });

        continue;
      }

      // Evaluate move using MultiPV
      let { bestScore, playedScore } = await evaluateWithMultiPV(
        worker,
        fen,
        uci,
        depth,
      );

      // If move wasn't top 2, evaluate separately
      if (playedScore === null) {
        // Score is from opponent perspective
        const afterScore = await evaluateMove(worker, fen, uci, depth);

        // Negate to convert perspective
        playedScore = -afterScore;
      }

      // Play move on replay board
      replayChess.move(move);

      // Centipawn loss = difference from best move
      const cpLoss = Math.max(0, bestScore - playedScore);

      totalCpLoss += cpLoss;

      // Check if move was forced
      const legalMoves = new Chess(fen).moves();

      const isOnlyMove = legalMoves.length === 1;

      // Classify move quality
      const classification = classify(cpLoss, isOnlyMove);

      moveResults.push({
        san: move.san,
        from: move.from,
        to: move.to,
        color: move.color,
        classification,
        cploss: cpLoss,
      });
    }

    // Count all move classifications
    const counts: Record<MoveClass, number> = {
      brilliant: 0,
      best: 0,
      excellent: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
    };

    moveResults.forEach((m) => counts[m.classification]++);

    // Determine user's color
    const userColor: "w" | "b" =
      game.white.username.toLowerCase() === username.toLowerCase() ? "w" : "b";

    // Count only user's moves
    const userCounts: Record<MoveClass, number> = {
      brilliant: 0,
      best: 0,
      excellent: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
    };

    moveResults
      .filter((m) => m.color === userColor)
      .forEach((m) => userCounts[m.classification]++);

    // Average centipawn loss
    const avgCpLoss = history.length > 0 ? totalCpLoss / history.length : 0;

    // Save final game analysis
    results.push({
      gameUrl: game.url,
      moves: moveResults,
      accuracy: Math.round(cpLossToAccuracy(avgCpLoss)),
      classificationCounts: counts,
      userClassificationCounts: userCounts,
      opening: getOpening(game.pgn),
      white: game.white.username,
      black: game.black.username,
      whiteResult: game.white.result,
      userColor,
    });
  }

  // Stop engine worker
  worker.terminate();

  return results;
}
