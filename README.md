# Chessographics

A fun stats page where the chess.com public API is used to generate fun insights from your latest games.

## Planned Features

- Fetch your last X games from chess.com
- Analyze each game with Stockfish for move classifications (brilliant, best, inaccuracy, blunder etc.)
- Winrate broken down by opening
- And more fun stats!

## Built With

- [chess.com Public API](https://www.chess.com/news/view/published-data-api) — game data
- [chess.js](https://github.com/jhlywa/chess.js) — PGN parsing and move logic
- [react-chessboard](https://github.com/Clariity/react-chessboard) — board display
- [stockfish.js](https://github.com/nmrugg/stockfish.js) — in-browser position analysis
- [React Router](https://reactrouter.com) — client-side routing
- [Vite](https://vitejs.dev) — build tooling

## Credits

- Chessboard UI by [react-chessboard](https://github.com/Clariity/react-chessboard), licensed under BSD 3-Clause
- Chess logic by [chess.js](https://github.com/jhlywa/chess.js), licensed under BSD 3-Clause
- Engine analysis by [stockfish.js](https://github.com/nmrugg/stockfish.js), licensed under GPL
