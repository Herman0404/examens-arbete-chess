import { useState, useEffect, useRef } from "react";

export interface StockfishEval {
  score: number; // centipawns, always from white's perspective
  mate: number | null; // positive = white mates, negative = black mates
}

export function useStockfish(fen: string): StockfishEval | null {
  const sfRef = useRef<Worker | null>(null);
  const fenRef = useRef<string>(fen);
  const [ready, setReady] = useState(false);
  const [evaluation, setEvaluation] = useState<StockfishEval | null>(null);

  // Keep fenRef in sync so the message handler always reads the current FEN
  useEffect(() => {
    fenRef.current = fen;
  }, [fen]);

  // Boot engine once
  useEffect(() => {
    const workerCode = `
      importScripts("https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js");
    `;
    let engine: Worker;
    try {
      const blob = new Blob([workerCode], { type: "application/javascript" });
      engine = new Worker(URL.createObjectURL(blob));
    } catch (err) {
      console.warn("Stockfish failed to load:", err);
      return;
    }
    sfRef.current = engine;

    const onMsg = (e: MessageEvent) => {
      const line: string =
        typeof e.data === "string" ? e.data : String(e.data ?? "");

      if (line === "uciok") {
        engine.postMessage("isready");
        return;
      }
      if (line === "readyok") {
        setReady(true);
        return;
      }
      if (
        line.startsWith("info") &&
        line.includes("depth") &&
        line.includes("score")
      ) {
        const cp = line.match(/score cp (-?\d+)/);
        const mate = line.match(/score mate (-?\d+)/);

        // Read current FEN from ref (avoids stale closure)
        const currentFen = fenRef.current;
        // FEN format: "rnbqkbnr/... w KQkq - 0 1" — field [1] is side to move
        const isBlackToMove = currentFen.split(" ")[1] === "b";

        let score = cp ? parseInt(cp[1]) : 0;
        let mateVal = mate ? parseInt(mate[1]) : null;

        // Stockfish always scores from side-to-move perspective — negate for black
        if (isBlackToMove) {
          score = -score;
          if (mateVal !== null) mateVal = -mateVal;
        }

        setEvaluation({ score, mate: mateVal });
      }
    };

    engine.addEventListener("message", onMsg);
    engine.onerror = (err) => console.warn("Stockfish worker error:", err);
    engine.postMessage("uci");

    return () => {
      engine.removeEventListener("message", onMsg);
      engine.terminate();
    };
  }, []);

  // Send new position to engine whenever FEN changes
  useEffect(() => {
    const engine = sfRef.current;
    if (!ready || !fen || !engine) return;
    engine.postMessage("stop");
    engine.postMessage(`position fen ${fen}`);
    engine.postMessage("go depth 16");
  }, [fen, ready]);

  return evaluation;
}
