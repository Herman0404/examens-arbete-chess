import { useState, useEffect, useRef } from "react";

export interface StockfishEval {
  score: number; // centipawns, white's perspective
  mate: number | null; // moves to mate, or null
}

export function useStockfish(fen: string): StockfishEval | null {
  const sfRef = useRef<Worker | null>(null);
  const [ready, setReady] = useState(false);
  const [evaluation, setEvaluation] = useState<StockfishEval | null>(null);

  // Boot Stockfish via a Blob worker
  useEffect(() => {
    const workerCode = `
      importScripts("https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish-nnue-16-single.js");
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
        setEvaluation({
          score: cp ? parseInt(cp[1]) : 0,
          mate: mate ? parseInt(mate[1]) : null,
        });
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

  // Re-analyse whenever FEN changes
  useEffect(() => {
    const engine = sfRef.current;
    if (!ready || !fen || !engine) return;
    engine.postMessage("stop");
    engine.postMessage(`position fen ${fen}`);
    engine.postMessage("go depth 16");
  }, [fen, ready]);

  return evaluation;
}
