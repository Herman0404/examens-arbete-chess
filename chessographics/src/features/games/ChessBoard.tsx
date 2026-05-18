import { useState, useMemo, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { Game } from "../../types/types";
import { useStockfish } from "../analysis/stockfish";
import type { MoveClass, MoveResult } from "../analysis/gameAnalysis";

// ---------------------------------------------------------------------------
// Eval bar
// ---------------------------------------------------------------------------

function EvalBar({
  evaluation,
  height,
}: {
  evaluation: { score: number; mate: number | null } | null;
  height: number;
}) {
  let fillPct = 50;
  if (evaluation) {
    if (evaluation.mate !== null) {
      // Clamp to 95/5 so the bar never looks completely full/empty
      fillPct = evaluation.mate > 0 ? 95 : 5;
    } else {
      // Map centipawns to a 0–100 fill percentage.
      // Dividing by 16 means ±800cp = ±50%, i.e. a rook up fills the bar completely.
      fillPct = 50 + Math.max(-50, Math.min(50, evaluation.score / 16));
    }
  }

  const label = evaluation
    ? evaluation.mate !== null
      ? `M${Math.abs(evaluation.mate)}`
      : (Math.abs(evaluation.score) / 100).toFixed(1)
    : "0.0";

  // White's portion grows from the bottom; label sits on whichever side has more space
  const whiteUp = fillPct >= 50;

  return (
    <div
      style={{
        width: 14,
        height,
        borderRadius: 6,
        overflow: "hidden",
        background: "rgb(45,35,35)",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: `${fillPct}%`,
          background: "#f5f0ec",
          transition: "height 0.4s ease",
        }}
      />
      <span
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          ...(whiteUp ? { bottom: 4 } : { top: 4 }),
          fontSize: "0.6rem",
          fontWeight: 700,
          color: whiteUp ? "rgb(45,35,35)" : "#f5f0ec",
          writingMode: "vertical-rl",
          userSelect: "none",
          zIndex: 1,
          lineHeight: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board themes
// ---------------------------------------------------------------------------

const THEMES = [
  { label: "Rose", light: "rgb(240,225,215)", dark: "rgb(180,130,120)" },
  { label: "Forest", light: "rgb(235,240,220)", dark: "rgb(100,140,90)" },
  { label: "Ocean", light: "rgb(220,235,245)", dark: "rgb(80,130,170)" },
  { label: "Dusk", light: "rgb(235,225,245)", dark: "rgb(130,100,170)" },
  { label: "Classic", light: "rgb(240,220,180)", dark: "rgb(150,100,60)" },
];

const getCSSVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const getSquareStyle = (
  type: "selected" | "dot" | "ring",
): React.CSSProperties => ({
  background: getCSSVar(`--square-${type}-bg`),
  borderRadius: getCSSVar(`--square-${type}-radius`),
});

// ---------------------------------------------------------------------------
// Nav button
// ---------------------------------------------------------------------------

// Buttons to go to next/previous move
// Can also go to first/last move
function NavBtn({
  path,
  onClick,
  disabled,
  title,
}: {
  path: string;
  onClick: () => void;
  disabled: boolean;
  title: string;
}) {
  return (
    <button
      className="chessboard-btn chessboard-btn--nav"
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d={path}
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Move Analysis Panel
// ---------------------------------------------------------------------------

// Colors
const CLASS_COLOR: Record<MoveClass, string> = {
  brilliant: "#48a7e0",
  best: "#6abf69",
  excellent: "#a8d58a",
  good: "#c8e08a",
  inaccuracy: "#f0c040",
  mistake: "#e07840",
  blunder: "#d04040",
};

// Move label
const CLASS_LABEL: Record<MoveClass, string> = {
  brilliant: "Brilliant",
  best: "Best",
  excellent: "Excellent",
  good: "Good",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder",
};

// Engine moves
interface EngineMove {
  uci: string; // move full (g1f3) g1 -> f3
  san: string | null; // move end (Nf3 = knight to f3)
  score: number; // centipawns, white's perspective
  mate: number | null; // positive = white mates, negative = black mates
  rank: 1 | 2 | 3;
}
function formatScore(score: number, mate: number | null): string {
  // If the engine found a forced checkmate sequence
  if (mate !== null) {
    // Positive mate = White, Negative mate = Black
    return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`;
  }

  // Convert centipawns to pawn units
  const pawns = (score / 100).toFixed(1);

  // Add "+" sign for positive evaluations
  // Positive = White advantage
  // Negative = Black advantage
  return score >= 0 ? `+${pawns}` : pawns;
}

function uciToSan(fen: string, uci: string): string | null {
  try {
    // Load board position from FEN
    const chess = new Chess(fen);

    // Extract move squares from UCI string
    const from = uci.slice(0, 2) as any;
    const to = uci.slice(2, 4) as any;

    // Extract promotion piece if present
    const promotion = uci[4] as any;

    // Make move and convert to SAN notation
    const move = chess.move({ from, to, ...(promotion ? { promotion } : {}) });

    // Return SAN string or null
    return move?.san ?? null;
  } catch {
    // Invalid FEN or illegal move
    return null;
  }
}

// Runs Stockfish with MultiPV=3 to get the top engine lines.
// If the played move is missing, analyse it separately.
function useMultiPV(
  fen: string,
  isWhiteTurn: boolean,
  playedUci: string | null,
) {
  const workerRef = useRef<Worker | null>(null);

  // Engine ready state
  const [ready, setReady] = useState(false);

  // Top engine moves
  const [moves, setMoves] = useState<EngineMove[]>([]);

  // Evaluation of the played move
  const [playedScore, setPlayedScore] = useState<{
    score: number;
    mate: number | null;
  } | null>(null);

  // Loading state during analysis
  const [loading, setLoading] = useState(false);

  // Start Stockfish once on mount
  useEffect(() => {
    const code = `importScripts("https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js");`;

    let w: Worker;

    try {
      // Create Stockfish web worker
      w = new Worker(
        URL.createObjectURL(
          new Blob([code], { type: "application/javascript" }),
        ),
      );
    } catch {
      return;
    }

    workerRef.current = w;

    w.onmessage = (e: MessageEvent) => {
      const line: string =
        typeof e.data === "string" ? e.data : String(e.data ?? "");

      // Engine initialized
      if (line === "uciok") {
        w.postMessage("setoption name MultiPV value 3");
        w.postMessage("isready");

        // Engine ready for analysis
      } else if (line === "readyok") {
        setReady(true);
      }
    };

    w.onerror = () => {};

    // Start UCI mode
    w.postMessage("uci");

    // Cleanup worker on unmount
    return () => w.terminate();
  }, []);

  // Re-run analysis when position changes
  useEffect(() => {
    const w = workerRef.current;

    if (!w || !ready || !fen) return;

    setLoading(true);
    setMoves([]);
    setPlayedScore(null);

    // Stores latest line for each multipv rank
    const accumulated: Record<number, EngineMove> = {};

    // Phase 1: get top 3 engine moves
    w.onmessage = (e: MessageEvent) => {
      const line: string =
        typeof e.data === "string" ? e.data : String(e.data ?? "");

      // Parse engine info lines
      if (
        line.startsWith("info") &&
        line.includes("multipv") &&
        line.includes("score")
      ) {
        const mpvM = line.match(/multipv (\d+)/);
        const cpM = line.match(/score cp (-?\d+)/);
        const mateM = line.match(/score mate (-?\d+)/);
        const pvM = line.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);

        if (!mpvM || !pvM) return;

        const rank = parseInt(mpvM[1]) as 1 | 2 | 3;
        const uci = pvM[1];

        // Convert engine eval to white perspective
        const rawScore = mateM
          ? parseInt(mateM[1]) > 0
            ? 10000
            : -10000
          : cpM
            ? parseInt(cpM[1])
            : 0;

        const rawMate = mateM ? parseInt(mateM[1]) : null;

        accumulated[rank] = {
          uci,
          san: uciToSan(fen, uci),

          // Stockfish scores from side-to-move perspective
          score: isWhiteTurn ? rawScore : -rawScore,

          // Convert mate score to white perspective
          mate: rawMate !== null ? (isWhiteTurn ? rawMate : -rawMate) : null,

          rank,
        };
      }

      // Engine finished searching
      if (line.startsWith("bestmove")) {
        const top3 = Object.values(accumulated).sort((a, b) => a.rank - b.rank);

        setMoves(top3);

        // Check if played move already exists in top 3
        const playedInTop3 = playedUci && top3.find((m) => m.uci === playedUci);

        // Analyse played move separately if missing
        if (playedUci && !playedInTop3) {
          let latestCp = 0;
          let latestMate: number | null = null;

          w.onmessage = (e2: MessageEvent) => {
            const l: string =
              typeof e2.data === "string" ? e2.data : String(e2.data ?? "");

            // Track latest eval during search
            if (l.startsWith("info") && l.includes("score")) {
              const cp2 = l.match(/score cp (-?\d+)/);
              const mate2 = l.match(/score mate (-?\d+)/);

              if (mate2) {
                latestMate = parseInt(mate2[1]);
                latestCp = 0;
              } else if (cp2) {
                latestCp = parseInt(cp2[1]);
                latestMate = null;
              }
            }

            // Played move analysis finished
            if (l.startsWith("bestmove")) {
              w.onmessage = null;

              // Eval is from opponent perspective after move
              const rawAfter =
                latestMate !== null
                  ? latestMate > 0
                    ? 10000
                    : -10000
                  : latestCp;

              // Convert back to original side
              const sideScore = isWhiteTurn ? -rawAfter : rawAfter;

              // Convert to white perspective
              const whitePerspective = isWhiteTurn ? sideScore : -sideScore;

              // Convert mate score to white perspective
              const whiteMate2 =
                latestMate !== null
                  ? isWhiteTurn
                    ? -latestMate
                    : latestMate
                  : null;

              setPlayedScore({
                score: whitePerspective,
                mate: whiteMate2,
              });

              setLoading(false);
            }
          };

          // Analyse resulting position after played move
          w.postMessage("stop");
          w.postMessage(`position fen ${fen} moves ${playedUci}`);
          w.postMessage("go depth 16");
        } else {
          setLoading(false);
        }
      }
    };

    // Start engine analysis
    w.postMessage("stop");
    w.postMessage(`position fen ${fen}`);
    w.postMessage("go depth 16");
  }, [fen, ready, isWhiteTurn, playedUci]);

  return { moves, playedScore, loading };
}

// Displays a formatted engine evaluation badge
function ScorePill({ score, mate }: { score: number; mate: number | null }) {
  // Convert eval into display string
  const label = formatScore(score, mate);

  // Positive = white advantage, negative = black advantage
  const positive = mate !== null ? mate > 0 : score >= 0;

  return (
    <span
      className="map-score-pill"
      style={{
        // Green for positive eval, red for negative
        background: positive
          ? "rgba(100,160,100,0.15)"
          : "rgba(200,80,80,0.12)",

        // Matching text color
        color: positive ? "rgb(40,110,50)" : "rgb(160,50,50)",
      }}
    >
      {label}
    </span>
  );
}

// Displays engine recommendations and the played move analysis
function MoveAnalysisPanel({
  fen,
  playedMove,
  playedSan,
  playedClass,
  isWhiteTurn,
  onMoveSelect,
}: {
  fen: string;
  playedMove: string | null;
  playedSan: string | null;
  playedClass: MoveClass | null;
  isWhiteTurn: boolean;
  onMoveSelect: (uci: string) => void;
}) {
  // Get top engine moves and played move evaluation
  const {
    moves,
    playedScore: extraPlayedScore,
    loading,
  } = useMultiPV(fen, isWhiteTurn, playedMove);

  // Check if played move exists in top engine lines
  const playedEngineMove = playedMove
    ? moves.find((m) => m.uci === playedMove)
    : null;

  // Use top-3 eval if available, otherwise fallback eval
  const resolvedPlayedScore = playedEngineMove
    ? { score: playedEngineMove.score, mate: playedEngineMove.mate }
    : extraPlayedScore;

  // Check if the played move is engine best move
  const isBestMove =
    playedMove && moves[0] ? moves[0].uci === playedMove : false;

  return (
    <div className="map-panel">
      {/* Engine top moves section */}
      <p className="map-section-label">Bästa dragen</p>

      {loading ? (
        // Loading state while engine searches
        <div className="map-loading">
          <span className="map-spinner" />
          <span>Analyserar…</span>
        </div>
      ) : moves.length === 0 ? (
        // No engine result available
        <p className="map-empty">Ingen analys</p>
      ) : (
        // Render top engine moves
        <div className="map-move-list">
          {moves.map((m) => {
            // Highlight if this was the played move
            const isPlayed = m.uci === playedMove;

            return (
              <button
                key={m.uci}
                className={`map-move-row${isPlayed ? " map-move-row--played" : ""}`}
                onClick={() => onMoveSelect(m.uci)}
                title={`Gå till ${m.san ?? m.uci}`}
              >
                {/* Engine rank */}
                <span className="map-rank-badge">#{m.rank}</span>

                {/* SAN move notation */}
                <span className="map-move-san">{m.san ?? m.uci}</span>

                {/* Mark played move */}
                {isPlayed && <span className="map-played-tag">spelat</span>}

                {/* Engine evaluation */}
                <ScorePill score={m.score} mate={m.mate} />
              </button>
            );
          })}
        </div>
      )}

      {/* Played move section */}
      {playedMove && (
        <>
          <p className="map-section-label" style={{ marginTop: 12 }}>
            Spelat drag
          </p>

          <button
            className={`map-move-row map-move-row--your-move${isBestMove ? " map-move-row--best" : ""}`}
            onClick={() => onMoveSelect(playedMove)}
            title={`Gå till ${playedSan ?? playedMove}`}
          >
            {/* Move quality indicator */}
            {playedClass && (
              <span
                className="map-class-dot"
                style={{ background: CLASS_COLOR[playedClass] }}
                title={CLASS_LABEL[playedClass]}
              />
            )}

            {/* Played move notation */}
            <span className="map-move-san">{playedSan ?? playedMove}</span>

            {/* Move classification badge */}
            {playedClass && (
              <span
                className="map-class-badge"
                style={{
                  background: CLASS_COLOR[playedClass] + "22",
                  color: CLASS_COLOR[playedClass],
                  borderColor: CLASS_COLOR[playedClass] + "55",
                }}
              >
                {CLASS_LABEL[playedClass]}
              </span>
            )}

            {/* Played move evaluation */}
            {resolvedPlayedScore ? (
              <ScorePill
                score={resolvedPlayedScore.score}
                mate={resolvedPlayedScore.mate}
              />
            ) : (
              loading && (
                <span className="map-score-pill map-score-unknown">…</span>
              )
            )}
          </button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board size hook
// ---------------------------------------------------------------------------

const DESKTOP_BOARD_SIZE = 500;

// Change boardsize for chessboard
function useBoardSize(): number {
  const [size, setSize] = useState(() =>
    Math.min(DESKTOP_BOARD_SIZE, window.innerWidth * 0.92),
  );

  useEffect(() => {
    const update = () => {
      setSize(
        window.innerWidth <= 640
          ? Math.min(360, window.innerWidth * 0.92)
          : DESKTOP_BOARD_SIZE,
      );
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return size;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ChessBoard({
  game,
  analysedMoves,
}: {
  game: Game;
  analysedMoves?: MoveResult[];
}) {
  const boardSize = useBoardSize();

  // Parse PGN into a move history (verbose SAN + metadata)
  const moveHistory = useMemo(() => {
    const chess = new Chess();
    if (game.pgn) chess.loadPgn(game.pgn);
    return chess.history({ verbose: true });
  }, [game.pgn]);

  const totalMoves = moveHistory.length;

  // Start from the final position so the user initially sees the end state
  const [currentMoveIndex, setCurrentMoveIndex] = useState(totalMoves);

  // Holds a temporary "free play" game state when user explores variations
  const [freePlayChess, setFreePlayChess] = useState<Chess | null>(null);

  // Theme selection (persisted in localStorage)
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(() => {
    const saved = localStorage.getItem("chessboard-theme");
    const idx = saved !== null ? parseInt(saved) : 0;
    return idx >= 0 && idx < THEMES.length ? idx : 0;
  });

  const selectTheme = (i: number) => {
    setSelectedThemeIndex(i);
    localStorage.setItem("chessboard-theme", String(i));
  };

  // Tracks selected square for move input (kept in ref to avoid rerenders)
  const selectedSquareRef = useRef<string | null>(null);

  // Highlight styles for legal moves + selection
  const [highlightedSquares, setHighlightedSquares] = useState<
    Record<string, React.CSSProperties>
  >({});

  const activeMoveRef = useRef<HTMLButtonElement>(null);

  // Keep active move visible in the move list when navigating
  useEffect(() => {
    activeMoveRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [currentMoveIndex]);

  // Compute:
  // - fenBeforeMove: position before current move (for analysis)
  // - fenAtCurrentMove: position after current move (for board display)
  const { fenBeforeMove, fenAtCurrentMove } = useMemo(() => {
    const chess = new Chess();

    // Replay moves up to the current index
    for (let i = 0; i < currentMoveIndex - 1; i++) {
      chess.move(moveHistory[i]);
    }

    const fenBeforeMove = chess.fen();

    // Apply current move (if any) to get displayed position
    if (currentMoveIndex > 0) {
      chess.move(moveHistory[currentMoveIndex - 1]);
    }

    return { fenBeforeMove, fenAtCurrentMove: chess.fen() };
  }, [moveHistory, currentMoveIndex]);

  // Board shows either free-play position or main game position
  const boardPosition = freePlayChess?.fen() ?? fenAtCurrentMove;

  const positionSource = freePlayChess ?? new Chess(fenAtCurrentMove);

  const chessAtPosition = useMemo(
    () => new Chess(positionSource.fen()),
    [positionSource, fenAtCurrentMove],
  );

  const evaluation = useStockfish(boardPosition);

  // Current move metadata (based on index in history)
  const currentMove =
    currentMoveIndex > 0 ? moveHistory[currentMoveIndex - 1] : null;

  const currentPlayedUci = currentMove
    ? `${currentMove.from}${currentMove.to}${currentMove.promotion ?? ""}`
    : null;

  const currentPlayedSan = currentMove?.san ?? null;

  const currentPlayedClass: MoveClass | null =
    analysedMoves && currentMoveIndex > 0
      ? (analysedMoves[currentMoveIndex - 1]?.classification ?? null)
      : null;

  // True if it's White's turn at the position before the current move
  const isWhiteTurnBeforeMove = currentMoveIndex % 2 === 1;

  const clearSelection = () => {
    selectedSquareRef.current = null;
    setHighlightedSquares({});
  };

  const goToMove = (index: number) => {
    setCurrentMoveIndex(index);
    setFreePlayChess(null);
    clearSelection();
  };

  // Apply engine-suggested move on top of current position (enters free-play mode)
  const handleMoveSelect = (uci: string) => {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci[4] ?? "q";

    const base = new Chess(fenAtCurrentMove);
    const result = base.move({ from, to, promotion });

    if (result) {
      setFreePlayChess(base);
      clearSelection();
    }
  };

  // Keyboard navigation for move timeline
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const map: Record<string, () => void> = {
        ArrowLeft: () => goToMove(Math.max(0, currentMoveIndex - 1)),
        ArrowRight: () => goToMove(Math.min(totalMoves, currentMoveIndex + 1)),
        ArrowUp: () => goToMove(0),
        ArrowDown: () => goToMove(totalMoves),
      };

      if (map[e.key]) {
        e.preventDefault();
        map[e.key]();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentMoveIndex, totalMoves]);

  // Highlight legal moves for a selected square
  const showLegalMoves = (square: string) => {
    const moves = chessAtPosition.moves({
      square: square as any,
      verbose: true,
    });

    if (!moves.length) {
      clearSelection();
      return;
    }

    const styles: Record<string, React.CSSProperties> = {
      [square]: getSquareStyle("selected"),
    };

    moves.forEach((m) => {
      // Target squares: ring if occupied, dot if empty
      styles[m.to] = getSquareStyle(
        chessAtPosition.get(m.to as any) ? "ring" : "dot",
      );
    });

    setHighlightedSquares(styles);
    selectedSquareRef.current = square;
  };

  // Attempt a move from user interaction (click/drag)
  const attemptMove = (from: string, to: string): boolean => {
    const clone = new Chess(
      (freePlayChess ?? new Chess(fenAtCurrentMove)).fen(),
    );

    if (!clone.move({ from, to, promotion: "q" })) return false;

    setFreePlayChess(clone);
    clearSelection();
    return true;
  };

  const onSquareClick = (sq: string) => {
    // Deselect if clicking the same square again
    if (selectedSquareRef.current === sq) {
      clearSelection();
      return;
    }

    const piece = chessAtPosition.get(sq as any);

    // Select piece and show legal moves
    if (piece && piece.color === chessAtPosition.turn()) {
      showLegalMoves(sq);
      return;
    }

    // If a square is already selected, try completing a move
    if (selectedSquareRef.current && attemptMove(selectedSquareRef.current, sq))
      return;

    clearSelection();
  };

  // Group move history into {white, black} pairs for display
  const movePairs = useMemo(
    () =>
      moveHistory.reduce<{ white: string; black?: string }[]>(
        (pairs, move, i) => {
          if (i % 2 === 0) {
            pairs.push({
              white: move.san,
              black: moveHistory[i + 1]?.san,
            });
          }
          return pairs;
        },
        [],
      ),
    [moveHistory],
  );

  const activeTheme = THEMES[selectedThemeIndex];
  const isInFreePlay = freePlayChess !== null;

  return (
    <div className="chessboard-layout">
      <EvalBar evaluation={evaluation} height={boardSize} />

      <div className="chessboard-column">
        {/* Theme selector */}
        <div className="chessboard-themes">
          {THEMES.map((theme, i) => (
            <button
              key={theme.label}
              title={theme.label}
              onClick={() => selectTheme(i)}
              className={`chessboard-theme-btn ${
                i === selectedThemeIndex ? "chessboard-theme-btn--active" : ""
              }`}
            >
              <span className="chessboard-theme-swatch">
                <span style={{ background: theme.light }} />
                <span style={{ background: theme.dark }} />
              </span>
            </button>
          ))}
        </div>

        {/* Chess board */}
        <div className="chessboard-board-wrap">
          <Chessboard
            position={boardPosition}
            boardWidth={boardSize}
            customSquareStyles={highlightedSquares}
            customDarkSquareStyle={{ backgroundColor: activeTheme.dark }}
            customLightSquareStyle={{ backgroundColor: activeTheme.light }}
            onSquareClick={onSquareClick}
            onPieceDragEnd={clearSelection}
            onPieceDrop={(from, to) => attemptMove(from, to)}
          />
        </div>

        {/* Navigation controls */}
        <div className="chessboard-controls">
          <NavBtn
            path="M3 3v10M13 3L7 8l6 5"
            onClick={() => goToMove(0)}
            disabled={currentMoveIndex === 0 && !isInFreePlay}
            title="Start (↑)"
          />
          <NavBtn
            path="M10 3L4 8l6 5"
            onClick={() => goToMove(Math.max(0, currentMoveIndex - 1))}
            disabled={currentMoveIndex === 0 && !isInFreePlay}
            title="Previous (←)"
          />
          <span className="chessboard-move-count">
            {currentMoveIndex} / {totalMoves}
          </span>
          <NavBtn
            path="M6 3l6 5-6 5"
            onClick={() => goToMove(Math.min(totalMoves, currentMoveIndex + 1))}
            disabled={currentMoveIndex === totalMoves}
            title="Next (→)"
          />
          <NavBtn
            path="M13 3v10M3 3l6 5-6 5"
            onClick={() => goToMove(totalMoves)}
            disabled={currentMoveIndex === totalMoves}
            title="End (↓)"
          />
        </div>

        {/* Free-play reset */}
        {isInFreePlay && (
          <button
            className="chessboard-btn chessboard-btn--reset"
            onClick={() => {
              setFreePlayChess(null);
              clearSelection();
            }}
          >
            ↺ Reset board
          </button>
        )}

        {/* Keyboard hint */}
        <p className="chessboard-hint">
          <kbd>←</kbd>
          <kbd>→</kbd> step · <kbd>↑</kbd>
          <kbd>↓</kbd> jump
        </p>
      </div>

      {/* Move list + analysis */}
      <div className="chessboard-movelist-column">
        <p className="chessboard-movelist-label">Moves</p>

        <ol className="chessboard-movelist">
          {movePairs.map((pair, pi) => (
            <li key={pi} className="chessboard-movelist-row">
              <span className="chessboard-movelist-num">{pi + 1}.</span>

              {(["white", "black"] as const).map((color) => {
                const mi = pi * 2 + (color === "white" ? 1 : 2);
                const san = color === "white" ? pair.white : pair.black;
                if (!san) return null;

                const isActive = currentMoveIndex === mi;
                const cls = analysedMoves?.[mi - 1]?.classification;

                return (
                  <button
                    key={color}
                    ref={isActive ? activeMoveRef : undefined}
                    className={`chessboard-movelist-move${
                      isActive ? " chessboard-movelist-move--active" : ""
                    }`}
                    onClick={() => goToMove(mi)}
                    style={
                      cls && !isActive
                        ? { borderLeft: `3px solid ${CLASS_COLOR[cls]}` }
                        : undefined
                    }
                  >
                    {san}
                  </button>
                );
              })}
            </li>
          ))}
        </ol>

        {/* Analysis panel (hidden in free-play mode) */}
        {currentMove && !isInFreePlay && (
          <MoveAnalysisPanel
            fen={fenBeforeMove}
            playedMove={currentPlayedUci}
            playedSan={currentPlayedSan}
            playedClass={currentPlayedClass}
            isWhiteTurn={isWhiteTurnBeforeMove}
            onMoveSelect={handleMoveSelect}
          />
        )}
      </div>
    </div>
  );
}
