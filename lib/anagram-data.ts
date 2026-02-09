export interface AnagramPuzzle {
  letters: string;
  answers: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export const ANAGRAM_PUZZLES: AnagramPuzzle[] = [
  { letters: 'ACERT', answers: ['CRATE', 'TRACE', 'CATER', 'REACT', 'CARTE'], difficulty: 'easy' },
  { letters: 'AELST', answers: ['STEAL', 'TALES', 'STALE', 'LEAST', 'SLATE', 'TESLA'], difficulty: 'easy' },
  { letters: 'EINRS', answers: ['REINS', 'RINSE', 'SIREN', 'RISEN'], difficulty: 'easy' },
  { letters: 'ADERT', answers: ['TRADE', 'TREAD', 'DATER', 'RATED'], difficulty: 'easy' },
  { letters: 'AELPS', answers: ['LEAPS', 'PEALS', 'SEPAL', 'PLEAS', 'LAPSE'], difficulty: 'easy' },
  { letters: 'AEGLR', answers: ['LARGE', 'LAGER', 'REGAL', 'GLARE'], difficulty: 'easy' },
  { letters: 'EINST', answers: ['INSET', 'STEIN', 'TINES', 'ONSET'], difficulty: 'easy' },
  { letters: 'DORWS', answers: ['WORDS', 'SWORD'], difficulty: 'easy' },
  { letters: 'AELRT', answers: ['LATER', 'ALTER', 'ALERT'], difficulty: 'easy' },
  { letters: 'ANOST', answers: ['OATS', 'TANS', 'ANTS', 'TONS', 'NOTES', 'STONE', 'ONSET', 'ATONE'], difficulty: 'medium' },
  { letters: 'DEIRS', answers: ['RIDES', 'DRIES', 'SIRED', 'RESID'], difficulty: 'medium' },
  { letters: 'AEGRT', answers: ['GREAT', 'GRATE', 'TARGE'], difficulty: 'medium' },
  { letters: 'EINPR', answers: ['RIPEN', 'REPIN'], difficulty: 'medium' },
  { letters: 'AELNS', answers: ['LANES', 'LEANS', 'ELANS'], difficulty: 'medium' },
  { letters: 'CEIST', answers: ['CITES', 'CESTI'], difficulty: 'medium' },
  { letters: 'AEGINS', answers: ['EASING'], difficulty: 'hard' },
  { letters: 'AEINRT', answers: ['RETAIN', 'RETINA', 'RATINE'], difficulty: 'hard' },
  { letters: 'DEINRS', answers: ['DINERS', 'SNIDER', 'RINSED'], difficulty: 'hard' },
  { letters: 'AELRST', answers: ['ALERTS', 'ALTERS', 'STELAR', 'SLATER'], difficulty: 'hard' },
  { letters: 'CEIRST', answers: ['CITERS', 'STERIC', 'RECITS'], difficulty: 'hard' },
];

export function getRandomPuzzle(diff?: 'easy' | 'medium' | 'hard'): AnagramPuzzle {
  const filtered = diff ? ANAGRAM_PUZZLES.filter(p => p.difficulty === diff) : ANAGRAM_PUZZLES;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

export function shuffleString(str: string): string {
  const arr = str.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}
