import { useState, useMemo, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { Game } from "../../types/types";

interface ChessBoardProps {
  game: Game;
}

const THEMES: { label: string; light: string; dark: string }[] = [
  { label: "Rose", light: "rgb(240, 225, 215)", dark: "rgb(180, 130, 120)" },
  { label: "Forest", light: "rgb(235, 240, 220)", dark: "rgb(100, 140, 90)" },
  { label: "Ocean", light: "rgb(220, 235, 245)", dark: "rgb(80, 130, 170)" },
  { label: "Dusk", light: "rgb(235, 225, 245)", dark: "rgb(130, 100, 170)" },
  { label: "Classic", light: "rgb(240, 220, 180)", dark: "rgb(150, 100, 60)" },
];

export default function ChessBoard({ game }: ChessBoardProps) {
  const history = useMemo(() => {
    const chess = new Chess();
    if (game.pgn) chess.loadPgn(game.pgn);
    return chess.history({ verbose: true });
  }, [game.pgn]);

  const totalMoves = history.length;

  const [moveIndex, setMoveIndex] = useState(totalMoves);
  const [freeChess, setFreeChess] = useState<Chess | null>(null);
  const [themeIndex, setThemeIndex] = useState(0);

  const theme = THEMES[themeIndex];
  const isDirty = freeChess !== null;

  const moveListRef = useRef<HTMLOListElement>(null);
  const activeMoveRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeMoveRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [moveIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(Math.max(0, moveIndex - 1));
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(Math.min(totalMoves, moveIndex + 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        goTo(0);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        goTo(totalMoves);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moveIndex, totalMoves]);

  const gameFen = useMemo(() => {
    const chess = new Chess();
    for (let i = 0; i < moveIndex; i++) chess.move(history[i]);
    return chess.fen();
  }, [history, moveIndex]);

  const position = freeChess ? freeChess.fen() : gameFen;

  const handlePieceDrop = (
    sourceSquare: string,
    targetSquare: string,
  ): boolean => {
    const base = freeChess ?? new Chess(gameFen);
    const clone = new Chess(base.fen());
    const move = clone.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });
    if (!move) return false;
    setFreeChess(clone);
    return true;
  };

  const goTo = (index: number) => {
    setMoveIndex(index);
    setFreeChess(null);
  };

  const movePairs = useMemo(() => {
    const pairs: { white: string; black?: string }[] = [];
    for (let i = 0; i < history.length; i += 2) {
      pairs.push({ white: history[i].san, black: history[i + 1]?.san });
    }
    return pairs;
  }, [history]);

  return (
    <div className="chessboard-layout">
      {/* ── Board column ── */}
      <div className="chessboard-column">
        {/* Theme picker */}
        <div className="chessboard-themes">
          {THEMES.map((t, i) => (
            <button
              key={t.label}
              title={t.label}
              className={`chessboard-theme-btn ${i === themeIndex ? "chessboard-theme-btn--active" : ""}`}
              onClick={() => setThemeIndex(i)}
            >
              <span className="chessboard-theme-swatch">
                <span style={{ background: t.light }} />
                <span style={{ background: t.dark }} />
              </span>
            </button>
          ))}
        </div>

        {/* Board */}
        <div className="chessboard-board-wrap">
          <Chessboard
            position={position}
            onPieceDrop={handlePieceDrop}
            customDarkSquareStyle={{ backgroundColor: theme.dark }}
            customLightSquareStyle={{ backgroundColor: theme.light }}
            boardWidth={400}
          />
        </div>

        {/* Controls */}
        <div className="chessboard-controls">
          <button
            className="chessboard-btn chessboard-btn--nav"
            onClick={() => goTo(0)}
            disabled={moveIndex === 0 && !isDirty}
            title="Start (↑)"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 3v10M13 3L7 8l6 5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            className="chessboard-btn chessboard-btn--nav"
            onClick={() => goTo(Math.max(0, moveIndex - 1))}
            disabled={moveIndex === 0 && !isDirty}
            title="Previous (←)"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M10 3L4 8l6 5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <span className="chessboard-move-count">
            {moveIndex} <span className="chessboard-move-count-sep">/</span>{" "}
            {totalMoves}
          </span>

          <button
            className="chessboard-btn chessboard-btn--nav"
            onClick={() => goTo(Math.min(totalMoves, moveIndex + 1))}
            disabled={moveIndex === totalMoves}
            title="Next (→)"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M6 3l6 5-6 5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            className="chessboard-btn chessboard-btn--nav"
            onClick={() => goTo(totalMoves)}
            disabled={moveIndex === totalMoves}
            title="End (↓)"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M13 3v10M3 3l6 5-6 5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {isDirty && (
          <button
            className="chessboard-btn chessboard-btn--reset"
            onClick={() => setFreeChess(null)}
          >
            ↺ Reset board
          </button>
        )}

        {/* Keyboard hint */}
        <p className="chessboard-hint">
          <kbd>←</kbd>
          <kbd>→</kbd> step &nbsp;·&nbsp; <kbd>↑</kbd>
          <kbd>↓</kbd> jump to start / end
        </p>
      </div>

      {/* ── Move list column ── */}
      <div className="chessboard-movelist-column">
        <p className="chessboard-movelist-label">Moves</p>
        <ol className="chessboard-movelist" ref={moveListRef}>
          {movePairs.map((pair, pairIdx) => {
            const whiteHalfIdx = pairIdx * 2 + 1;
            const blackHalfIdx = pairIdx * 2 + 2;
            return (
              <li key={pairIdx} className="chessboard-movelist-row">
                <span className="chessboard-movelist-num">{pairIdx + 1}.</span>

                <button
                  ref={moveIndex === whiteHalfIdx ? activeMoveRef : undefined}
                  className={`chessboard-movelist-move ${moveIndex === whiteHalfIdx ? "chessboard-movelist-move--active" : ""}`}
                  onClick={() => goTo(whiteHalfIdx)}
                >
                  {pair.white}
                </button>

                {pair.black && (
                  <button
                    ref={moveIndex === blackHalfIdx ? activeMoveRef : undefined}
                    className={`chessboard-movelist-move ${moveIndex === blackHalfIdx ? "chessboard-movelist-move--active" : ""}`}
                    onClick={() => goTo(blackHalfIdx)}
                  >
                    {pair.black}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
