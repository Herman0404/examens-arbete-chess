/**
 * App — the root component.
 * Sets up React Router with:
 *   /              → HomePage (username search)
 *   /profile/:username → ProfilePage (player stats + games)
 *
 * The Header and Footer are rendered on every route inside the layout.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/general/Header';
import Footer from './components/general/Footer';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <BrowserRouter>
      {/* Persistent layout wrapper */}
      <Header />

      <Routes>
        {/* Home: search form */}
        <Route path="/" element={<HomePage />} />

        {/* Profile: player stats and recent games */}
        <Route path="/profile/:username" element={<ProfilePage />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}
