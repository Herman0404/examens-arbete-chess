import { useState, useMemo, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { Game } from "../../types/types";
import { useStockfish } from "../analysis/stockfish";
import type { StockfishEval } from "../analysis/stockfish";

// ---------------------------------------------------------------------------
// Eval bar
// ---------------------------------------------------------------------------

function EvalBar({
  evaluation,
  height,
}: {
  evaluation: StockfishEval | null;
  height: number;
}) {
  // fillPct: 0 = black winning, 50 = equal, 100 = white winning
  let fillPct = 50;
  if (evaluation) {
    if (evaluation.mate !== null) {
      fillPct = evaluation.mate > 0 ? 95 : 5;
    } else {
      // Clamp to ±800cp → 0–100%
      fillPct = 50 + Math.max(-50, Math.min(50, evaluation.score / 16));
    }
  }

  const label = evaluation
    ? evaluation.mate !== null
      ? `M${Math.abs(evaluation.mate)}`
      : (Math.abs(evaluation.score) / 100).toFixed(1)
    : "0.0";

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
// Main component
// ---------------------------------------------------------------------------

const BOARD_SIZE = 400;

export default function ChessBoard({ game }: { game: Game }) {
  const moveHistory = useMemo(() => {
    const chess = new Chess();
    if (game.pgn) chess.loadPgn(game.pgn);
    return chess.history({ verbose: true });
  }, [game.pgn]);

  const totalMoves = moveHistory.length;

  const [currentMoveIndex, setCurrentMoveIndex] = useState(totalMoves);
  const [freePlayChess, setFreePlayChess] = useState<Chess | null>(null);
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [highlightedSquares, setHighlightedSquares] = useState<
    Record<string, React.CSSProperties>
  >({});

  const activeMoveRef = useRef<HTMLButtonElement>(null);

  // Scroll active move into view
  useEffect(() => {
    activeMoveRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [currentMoveIndex]);

  const fenAtCurrentMove = useMemo(() => {
    const chess = new Chess();
    for (let i = 0; i < currentMoveIndex; i++) chess.move(moveHistory[i]);
    return chess.fen();
  }, [moveHistory, currentMoveIndex]);

  const boardPosition = freePlayChess?.fen() ?? fenAtCurrentMove;
  const chessAtPosition = useMemo(
    () => new Chess(boardPosition),
    [boardPosition],
  );
  const evaluation = useStockfish(boardPosition);

  // Navigation
  const clearSelection = () => {
    setSelectedSquare(null);
    setHighlightedSquares({});
  };

  const goToMove = (index: number) => {
    setCurrentMoveIndex(index);
    setFreePlayChess(null);
    clearSelection();
  };

  // Keyboard navigation
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

  // Interaction
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
      styles[m.to] = getSquareStyle(
        chessAtPosition.get(m.to as any) ? "ring" : "dot",
      );
    });
    setHighlightedSquares(styles);
    setSelectedSquare(square);
  };

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
    if (selectedSquare === sq) {
      clearSelection();
      return;
    }
    const piece = chessAtPosition.get(sq as any);
    if (piece && piece.color === chessAtPosition.turn()) {
      showLegalMoves(sq);
      return;
    }
    if (selectedSquare && attemptMove(selectedSquare, sq)) return;
    clearSelection();
  };

  // Group moves into pairs for the move list
  const movePairs = useMemo(
    () =>
      moveHistory.reduce<{ white: string; black?: string }[]>(
        (pairs, move, i) => {
          if (i % 2 === 0)
            pairs.push({ white: move.san, black: moveHistory[i + 1]?.san });
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
      {/* Eval bar */}
      <EvalBar evaluation={evaluation} height={BOARD_SIZE} />

      {/* Board column */}
      <div className="chessboard-column">
        {/* Theme picker */}
        <div className="chessboard-themes">
          {THEMES.map((theme, i) => (
            <button
              key={theme.label}
              title={theme.label}
              onClick={() => setSelectedThemeIndex(i)}
              className={`chessboard-theme-btn ${i === selectedThemeIndex ? "chessboard-theme-btn--active" : ""}`}
            >
              <span className="chessboard-theme-swatch">
                <span style={{ background: theme.light }} />
                <span style={{ background: theme.dark }} />
              </span>
            </button>
          ))}
        </div>

        {/* Board */}
        <div className="chessboard-board-wrap">
          <Chessboard
            position={boardPosition}
            boardWidth={BOARD_SIZE}
            customSquareStyles={highlightedSquares}
            customDarkSquareStyle={{ backgroundColor: activeTheme.dark }}
            customLightSquareStyle={{ backgroundColor: activeTheme.light }}
            onSquareClick={onSquareClick}
            onPieceDragEnd={clearSelection}
            onPieceDrop={(from, to) => attemptMove(from, to)}
          />
        </div>

        {/* Nav controls */}
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
            {currentMoveIndex}{" "}
            <span className="chessboard-move-count-sep">/</span> {totalMoves}
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

        <p className="chessboard-hint">
          <kbd>←</kbd>
          <kbd>→</kbd> step &nbsp;·&nbsp; <kbd>↑</kbd>
          <kbd>↓</kbd> jump to start / end
        </p>
      </div>

      {/* Move list */}
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
                return (
                  <button
                    key={color}
                    ref={isActive ? activeMoveRef : undefined}
                    className={`chessboard-movelist-move${isActive ? " chessboard-movelist-move--active" : ""}`}
                    onClick={() => goToMove(mi)}
                  >
                    {san}
                  </button>
                );
              })}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
