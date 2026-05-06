/**
 * HomePage — the root route ("/").
 * Provides a search form that navigates to /profile/:username
 * when the user submits a Chess.com username.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  /** The text currently typed in the input field */
  const [username, setUsername] = useState('');

  const navigate = useNavigate();

  /** On submit, navigate to the profile route for the entered username */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed) {
      navigate(`/profile/${trimmed}`);
    }
  };

  return (
    <main>
      <h1>Chess Stats</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter Chess.com username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>
    </main>
  );
}
