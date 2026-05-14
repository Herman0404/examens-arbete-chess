import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  // Navigate to profile on submit
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
