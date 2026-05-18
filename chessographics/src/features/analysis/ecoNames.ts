// Maps ECO code ranges to base opening names
const ECO_RANGES: [number, number, string][] = [
  // A - Flank openings
  [0, 0, "Uncommon Opening"],
  [1, 3, "Bird's / Nimzowitsch-Larsen"],
  [4, 9, "Réti / King's Indian Attack"],
  [10, 39, "English Opening"],
  [40, 44, "Queen's Pawn / Benoni"],
  [45, 49, "Indian Defense / King's Indian"],
  [50, 59, "Indian Defense / Budapest / Benoni"],
  [60, 79, "Benoni Defense"],
  [80, 99, "Dutch Defense"],

  // B - Semi-open games
  [100, 100, "Uncommon King's Pawn"],
  [101, 101, "Scandinavian Defense"],
  [102, 105, "Alekhine's Defense"],
  [106, 106, "Modern Defense"],
  [107, 109, "Pirc Defense"],
  [110, 119, "Caro-Kann Defense"],
  [120, 199, "Sicilian Defense"],

  // C - Open games
  [200, 219, "French Defense"],
  [220, 220, "King's Pawn"],
  [221, 222, "Center Game"],
  [223, 224, "Bishop's Opening"],
  [225, 229, "Vienna Game"],
  [230, 239, "King's Gambit"],
  [240, 240, "King's Pawn"],
  [241, 241, "Philidor Defense"],
  [242, 243, "Russian Game"],
  [244, 244, "King's Pawn"],
  [245, 245, "Scotch Game"],
  [246, 249, "Four Knights"],
  [250, 259, "Italian Game"],
  [260, 299, "Ruy Lopez"],

  // D - Closed games
  [300, 300, "Queen's Pawn"],
  [301, 301, "Richter-Veresov Attack"],
  [302, 305, "Queen's Pawn"],
  [306, 309, "Queen's Gambit"],
  [310, 319, "Slav Defense"],
  [320, 329, "Queen's Gambit Accepted"],
  [330, 429, "Queen's Gambit Declined"],
  [430, 449, "Semi-Slav Defense"],
  [450, 499, "Queen's Gambit Declined"],
  [470, 499, "Grünfeld Defense"],

  // E - Indian defenses
  [500, 509, "Indian Defense"],
  [510, 519, "Bogo-Indian Defense"],
  [520, 599, "Queen's Indian / Nimzo-Indian"],
  [600, 699, "King's Indian Defense"],
];

function ecoToNumber(eco: string): number {
  const letter = eco.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3, E=4
  const num = parseInt(eco.slice(1));
  return letter * 100 + num;
}

export function ecoToName(eco: string): string | null {
  if (!eco) return null;
  const n = ecoToNumber(eco);
  for (const [min, max, name] of ECO_RANGES) {
    if (n >= min && n <= max) return name;
  }
  return null;
}
