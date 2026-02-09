export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  tip?: string;
}

export interface TutorialLesson {
  id: string;
  title: string;
  icon: string;
  steps: TutorialStep[];
}

export const TUTORIAL_LESSONS: TutorialLesson[] = [
  {
    id: 'basics',
    title: 'Game Basics',
    icon: 'grid',
    steps: [
      {
        id: 'basics-1',
        title: 'The Board',
        content: 'Scrabble is played on a 15x15 grid. The board has premium squares that multiply letter or word scores. The center square (marked with a star) is where the first word must be placed.',
      },
      {
        id: 'basics-2',
        title: 'Your Tiles',
        content: 'Each player draws 7 tiles from a bag of 100 tiles. Tiles have letters and point values. After playing tiles, you draw new ones to maintain 7 tiles in your rack.',
      },
      {
        id: 'basics-3',
        title: 'Taking Turns',
        content: 'On your turn, you can: Place tiles to form a word, Exchange tiles (if 7+ remain in bag), or Pass your turn. The game ends when the tile bag is empty and one player uses all their tiles, or when both players pass twice consecutively.',
        tip: 'Try to use all 7 tiles in one turn for a 50-point bonus!',
      },
    ],
  },
  {
    id: 'placement',
    title: 'Placing Words',
    icon: 'edit-3',
    steps: [
      {
        id: 'placement-1',
        title: 'Word Direction',
        content: 'Words must be placed in a straight line - either horizontally (left to right) or vertically (top to bottom). You cannot place tiles diagonally.',
      },
      {
        id: 'placement-2',
        title: 'Connecting Words',
        content: 'After the first word, every new word must connect to at least one existing tile on the board. All letters formed by your placement must create valid words, including any crosswords formed.',
      },
      {
        id: 'placement-3',
        title: 'No Gaps Allowed',
        content: 'Tiles in a single play must form one continuous line. You cannot leave empty spaces between tiles in your word (unless those spaces are filled by existing board tiles).',
        tip: 'Look for opportunities to play parallel to existing words - you can score multiple words in one play!',
      },
    ],
  },
  {
    id: 'scoring',
    title: 'Scoring',
    icon: 'star',
    steps: [
      {
        id: 'scoring-1',
        title: 'Tile Values',
        content: 'Each letter tile has a point value from 1-10. Common letters (E, A, I, O) are worth 1 point, while rare letters (Q, Z) are worth 10 points. Blank tiles are worth 0 but can represent any letter.',
      },
      {
        id: 'scoring-2',
        title: 'Premium Squares',
        content: 'Double Letter (light blue): Doubles the value of the tile placed on it.\nTriple Letter (teal): Triples the tile value.\nDouble Word (peach): Doubles the entire word score.\nTriple Word (red): Triples the entire word score.',
      },
      {
        id: 'scoring-3',
        title: 'Bingo Bonus',
        content: 'Using all 7 tiles from your rack in a single turn earns a 50-point bonus! This is called a "bingo" and is one of the most exciting plays in Scrabble.',
        tip: 'Premium squares only apply on the turn they are first covered. They do not multiply on subsequent turns.',
      },
    ],
  },
  {
    id: 'strategy',
    title: 'Strategy Tips',
    icon: 'zap',
    steps: [
      {
        id: 'strategy-1',
        title: 'Board Control',
        content: 'Control access to Triple Word squares. Avoid placing vowels next to premium squares that your opponent can exploit. Keep the board tight early and open it up when you have strong tiles.',
      },
      {
        id: 'strategy-2',
        title: 'Rack Management',
        content: 'Maintain a balance of vowels and consonants. Keep versatile tiles like S, blank, R, N, E. Consider exchanging tiles if your rack is unbalanced rather than making a low-scoring play.',
      },
      {
        id: 'strategy-3',
        title: 'Two-Letter Words',
        content: 'Learn two-letter words! Words like QI, ZA, XI, XU, JO are extremely valuable. Two-letter words let you play parallel to existing words and score on multiple words at once.',
        tip: 'The best players know all valid 2-letter words. They open up many scoring opportunities!',
      },
    ],
  },
  {
    id: 'rules2024',
    title: '2024 Rule Updates',
    icon: 'refresh-cw',
    steps: [
      {
        id: 'rules2024-1',
        title: 'Challenge Rules',
        content: 'Under 2024 rules, challenges are resolved immediately using the official word list. If a challenged word is valid, the challenger loses their next turn. If invalid, the tiles are returned and the player loses their turn.',
      },
      {
        id: 'rules2024-2',
        title: 'Time Controls',
        content: 'Tournament games now use 25 minutes per player with a 1-minute overtime buffer. Going over time deducts 10 points per minute. This encourages faster, more decisive play.',
      },
      {
        id: 'rules2024-3',
        title: 'Endgame Scoring',
        content: 'When the game ends, each player subtracts the sum of their unplayed tiles. If one player uses all their tiles, they receive the sum of the opponents remaining tile values as a bonus.',
        tip: 'Try to go out first! The endgame bonus from your opponent\'s remaining tiles can swing the game significantly.',
      },
    ],
  },
];

export const RULES_DATA = [
  {
    category: 'Setup',
    rules: [
      { title: 'Tile Count', description: 'The game includes 100 tiles: 98 letter tiles and 2 blank tiles.' },
      { title: 'Starting Tiles', description: 'Each player draws 7 tiles from the bag to start.' },
      { title: 'First Player', description: 'Players draw a tile - closest to A goes first. Blanks beat A.' },
      { title: 'First Word', description: 'The first word must cover the center star square and be at least 2 letters.' },
    ],
  },
  {
    category: 'Gameplay',
    rules: [
      { title: 'Valid Words', description: 'Words must be found in the Official Scrabble Players Dictionary (OSPD) or Tournament Word List (TWL).' },
      { title: 'Word Placement', description: 'All tiles played must be in a single row or column and form one continuous word.' },
      { title: 'Crosswords', description: 'All crosswords formed by a play must also be valid words.' },
      { title: 'Blank Tiles', description: 'Blanks can represent any letter but are worth 0 points. Once placed, their letter designation cannot change.' },
      { title: 'Exchanging', description: 'You may exchange 1-7 tiles on your turn (if 7+ tiles remain in bag), but you forfeit your turn.' },
      { title: 'Passing', description: 'You may pass your turn. If all players pass twice consecutively, the game ends.' },
    ],
  },
  {
    category: 'Scoring',
    rules: [
      { title: 'Premium Squares', description: 'DL = Double Letter, TL = Triple Letter, DW = Double Word, TW = Triple Word. Premium applies only on the first turn a tile covers it.' },
      { title: 'Multiple Words', description: 'If you form multiple words in one play, each word is scored separately and totaled.' },
      { title: 'Bingo (50 pts)', description: 'Playing all 7 tiles in one turn earns a 50-point bonus on top of the word score.' },
      { title: 'Endgame', description: 'Unplayed tile values are subtracted from each player\'s score. If one player uses all tiles, they get the opponent\'s remaining tile values added.' },
    ],
  },
  {
    category: 'Tile Values',
    rules: [
      { title: '1 Point', description: 'A, E, I, O, U, L, N, S, T, R (most common letters)' },
      { title: '2 Points', description: 'D, G' },
      { title: '3 Points', description: 'B, C, M, P' },
      { title: '4 Points', description: 'F, H, V, W, Y' },
      { title: '5 Points', description: 'K' },
      { title: '8 Points', description: 'J, X' },
      { title: '10 Points', description: 'Q, Z' },
      { title: '0 Points', description: 'Blank (?) - can be any letter' },
    ],
  },
];
