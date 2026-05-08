/**
 * App — the root component.
 * Sets up React Router with:
 *   /              → HomePage (username search)
 *   /profile/:username → ProfilePage (player stats + games)
 *
 * The Header and Footer are rendered on every route inside the layout.
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/general/Header";
import Footer from "./components/general/Footer";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import GamePage from "./pages/GamePage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="site-container">
        <Header />

        <div className="page-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/game/:gameId" element={<GamePage />} />
          </Routes>
        </div>

        <Footer />
      </div>
    </BrowserRouter>
  );
}
