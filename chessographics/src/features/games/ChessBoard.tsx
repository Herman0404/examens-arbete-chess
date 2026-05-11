import { useState, useMemo, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { Game } from "../../types/types";

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

  const moveListRef = useRef<HTMLOListElement>(null);
  const activeMoveRef = useRef<HTMLButtonElement>(null);

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

  const clearSelection = () => {
    setSelectedSquare(null);
    setHighlightedSquares({});
  };

  const goToMove = (moveIndex: number) => {
    setCurrentMoveIndex(moveIndex);
    setFreePlayChess(null);
    clearSelection();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const keyActions: Record<string, () => void> = {
        ArrowLeft: () => goToMove(Math.max(0, currentMoveIndex - 1)),
        ArrowRight: () => goToMove(Math.min(totalMoves, currentMoveIndex + 1)),
        ArrowUp: () => goToMove(0),
        ArrowDown: () => goToMove(totalMoves),
      };
      if (keyActions[e.key]) {
        e.preventDefault();
        keyActions[e.key]();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentMoveIndex, totalMoves]);

  const showLegalMoves = (square: string) => {
    const legalMoves = chessAtPosition.moves({
      square: square as any,
      verbose: true,
    });
    if (!legalMoves.length) {
      clearSelection();
      return;
    }

    const squareStyles: Record<string, React.CSSProperties> = {
      [square]: getSquareStyle("selected"),
    };
    legalMoves.forEach((move) => {
      const isCapture = !!chessAtPosition.get(move.to as any);
      squareStyles[move.to] = getSquareStyle(isCapture ? "ring" : "dot");
    });

    setHighlightedSquares(squareStyles);
    setSelectedSquare(square);
  };

  const attemptMove = (fromSquare: string, toSquare: string) => {
    const clone = new Chess(
      (freePlayChess ?? new Chess(fenAtCurrentMove)).fen(),
    );
    if (!clone.move({ from: fromSquare, to: toSquare, promotion: "q" }))
      return false;
    setFreePlayChess(clone);
    clearSelection();
    return true;
  };

  const onSquareClick = (clickedSquare: string) => {
    if (selectedSquare === clickedSquare) {
      clearSelection();
      return;
    }
    const clickedPiece = chessAtPosition.get(clickedSquare as any);
    const isOwnPiece =
      clickedPiece && clickedPiece.color === chessAtPosition.turn();
    if (isOwnPiece) {
      showLegalMoves(clickedSquare);
      return;
    }
    if (selectedSquare && attemptMove(selectedSquare, clickedSquare)) return;
    clearSelection();
  };

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

  const NavButton = ({
    svgPath,
    onClick,
    disabled,
    title,
  }: {
    svgPath: string;
    onClick: () => void;
    disabled: boolean;
    title: string;
  }) => (
    <button
      className="chessboard-btn chessboard-btn--nav"
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d={svgPath}
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );

  const activeTheme = THEMES[selectedThemeIndex];
  const isInFreePlay = freePlayChess !== null;

  return (
    <div className="chessboard-layout">
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

        {/* Board — onMouseDown fires instantly on press */}
        <div
          className="chessboard-board-wrap"
          onMouseDown={(e) => {
            const square = (e.target as HTMLElement)
              .closest("[data-square]")
              ?.getAttribute("data-square");
            if (!square) return;
            const piece = chessAtPosition.get(square as any);
            if (piece && piece.color === chessAtPosition.turn())
              showLegalMoves(square);
          }}
        >
          <Chessboard
            position={boardPosition}
            boardWidth={400}
            customSquareStyles={highlightedSquares}
            customDarkSquareStyle={{ backgroundColor: activeTheme.dark }}
            customLightSquareStyle={{ backgroundColor: activeTheme.light }}
            onSquareClick={onSquareClick}
            onPieceDragEnd={clearSelection}
            onPieceDrop={(fromSquare, toSquare) =>
              attemptMove(fromSquare, toSquare)
            }
          />
        </div>

        {/* Controls */}
        <div className="chessboard-controls">
          <NavButton
            svgPath="M3 3v10M13 3L7 8l6 5"
            onClick={() => goToMove(0)}
            disabled={currentMoveIndex === 0 && !isInFreePlay}
            title="Start (↑)"
          />
          <NavButton
            svgPath="M10 3L4 8l6 5"
            onClick={() => goToMove(Math.max(0, currentMoveIndex - 1))}
            disabled={currentMoveIndex === 0 && !isInFreePlay}
            title="Previous (←)"
          />
          <span className="chessboard-move-count">
            {currentMoveIndex}{" "}
            <span className="chessboard-move-count-sep">/</span> {totalMoves}
          </span>
          <NavButton
            svgPath="M6 3l6 5-6 5"
            onClick={() => goToMove(Math.min(totalMoves, currentMoveIndex + 1))}
            disabled={currentMoveIndex === totalMoves}
            title="Next (→)"
          />
          <NavButton
            svgPath="M13 3v10M3 3l6 5-6 5"
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
        <ol className="chessboard-movelist" ref={moveListRef}>
          {movePairs.map((pair, pairIndex) => (
            <li key={pairIndex} className="chessboard-movelist-row">
              <span className="chessboard-movelist-num">{pairIndex + 1}.</span>
              {(["white", "black"] as const).map((color, colorIndex) => {
                const moveIndex = pairIndex * 2 + colorIndex + 1;
                const san = color === "white" ? pair.white : pair.black;
                if (!san) return null;
                return (
                  <button
                    key={color}
                    ref={
                      currentMoveIndex === moveIndex ? activeMoveRef : undefined
                    }
                    className={`chessboard-movelist-move ${currentMoveIndex === moveIndex ? "chessboard-movelist-move--active" : ""}`}
                    onClick={() => goToMove(moveIndex)}
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
