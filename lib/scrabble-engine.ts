export interface Tile {
  id: string;
  letter: string;
  value: number;
  isBlank: boolean;
}

export interface PlacedTile extends Tile {
  row: number;
  col: number;
}

export interface BoardCell {
  tile: Tile | null;
  premium: PremiumType;
}

export type PremiumType = 'none' | 'DL' | 'TL' | 'DW' | 'TW' | 'CENTER';

export interface GameState {
  board: BoardCell[][];
  playerRack: Tile[];
  aiRack: Tile[];
  tileBag: Tile[];
  playerScore: number;
  aiScore: number;
  currentTurn: 'player' | 'ai';
  moveHistory: MoveRecord[];
  isFirstMove: boolean;
  consecutivePasses: number;
  gameOver: boolean;
  winner: 'player' | 'ai' | 'tie' | null;
}

export interface MoveRecord {
  player: 'player' | 'ai';
  word: string;
  score: number;
  tiles: PlacedTile[];
  type: 'play' | 'exchange' | 'pass';
}

const TILE_DISTRIBUTION: Record<string, { count: number; value: number }> = {
  A: { count: 9, value: 1 }, B: { count: 2, value: 3 }, C: { count: 2, value: 3 },
  D: { count: 4, value: 2 }, E: { count: 12, value: 1 }, F: { count: 2, value: 4 },
  G: { count: 3, value: 2 }, H: { count: 2, value: 4 }, I: { count: 9, value: 1 },
  J: { count: 1, value: 8 }, K: { count: 1, value: 5 }, L: { count: 4, value: 1 },
  M: { count: 2, value: 3 }, N: { count: 6, value: 1 }, O: { count: 8, value: 1 },
  P: { count: 2, value: 3 }, Q: { count: 1, value: 10 }, R: { count: 6, value: 1 },
  S: { count: 4, value: 1 }, T: { count: 6, value: 1 }, U: { count: 4, value: 1 },
  V: { count: 2, value: 4 }, W: { count: 2, value: 4 }, X: { count: 1, value: 8 },
  Y: { count: 2, value: 4 }, Z: { count: 1, value: 10 },
  '?': { count: 2, value: 0 },
};

const PREMIUM_MAP: Record<string, PremiumType> = {};

function initPremiumMap() {
  const TW = [
    [0,0],[0,7],[0,14],[7,0],[7,14],[14,0],[14,7],[14,14]
  ];
  const DW = [
    [1,1],[2,2],[3,3],[4,4],[10,10],[11,11],[12,12],[13,13],
    [1,13],[2,12],[3,11],[4,10],[10,4],[11,3],[12,2],[13,1],
  ];
  const TL = [
    [1,5],[1,9],[5,1],[5,5],[5,9],[5,13],
    [9,1],[9,5],[9,9],[9,13],[13,5],[13,9],
  ];
  const DL = [
    [0,3],[0,11],[2,6],[2,8],[3,0],[3,7],[3,14],
    [6,2],[6,6],[6,8],[6,12],
    [7,3],[7,11],
    [8,2],[8,6],[8,8],[8,12],
    [11,0],[11,7],[11,14],[12,6],[12,8],[14,3],[14,11],
  ];

  TW.forEach(([r, c]) => { PREMIUM_MAP[`${r},${c}`] = 'TW'; });
  DW.forEach(([r, c]) => { PREMIUM_MAP[`${r},${c}`] = 'DW'; });
  TL.forEach(([r, c]) => { PREMIUM_MAP[`${r},${c}`] = 'TL'; });
  DL.forEach(([r, c]) => { PREMIUM_MAP[`${r},${c}`] = 'DL'; });
  PREMIUM_MAP['7,7'] = 'CENTER';
}

initPremiumMap();

export function getPremiumType(row: number, col: number): PremiumType {
  return PREMIUM_MAP[`${row},${col}`] || 'none';
}

let tileIdCounter = 0;
function generateTileId(): string {
  tileIdCounter++;
  return `tile_${Date.now()}_${tileIdCounter}_${Math.random().toString(36).substr(2, 5)}`;
}

export function createTileBag(): Tile[] {
  const tiles: Tile[] = [];
  for (const [letter, info] of Object.entries(TILE_DISTRIBUTION)) {
    for (let i = 0; i < info.count; i++) {
      tiles.push({
        id: generateTileId(),
        letter: letter === '?' ? '' : letter,
        value: info.value,
        isBlank: letter === '?',
      });
    }
  }
  return shuffleArray(tiles);
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createEmptyBoard(): BoardCell[][] {
  const board: BoardCell[][] = [];
  for (let r = 0; r < 15; r++) {
    const row: BoardCell[] = [];
    for (let c = 0; c < 15; c++) {
      row.push({ tile: null, premium: getPremiumType(r, c) });
    }
    board.push(row);
  }
  return board;
}

export function drawTiles(bag: Tile[], count: number): { drawn: Tile[]; remaining: Tile[] } {
  const drawn = bag.slice(0, Math.min(count, bag.length));
  const remaining = bag.slice(drawn.length);
  return { drawn, remaining };
}

export function initializeGame(): GameState {
  const tileBag = createTileBag();
  const { drawn: playerTiles, remaining: bag1 } = drawTiles(tileBag, 7);
  const { drawn: aiTiles, remaining: bag2 } = drawTiles(bag1, 7);

  return {
    board: createEmptyBoard(),
    playerRack: playerTiles,
    aiRack: aiTiles,
    tileBag: bag2,
    playerScore: 0,
    aiScore: 0,
    currentTurn: 'player',
    moveHistory: [],
    isFirstMove: true,
    consecutivePasses: 0,
    gameOver: false,
    winner: null,
  };
}

export function validatePlacement(
  board: BoardCell[][],
  placedTiles: PlacedTile[],
  isFirstMove: boolean
): { valid: boolean; error?: string } {
  if (placedTiles.length === 0) {
    return { valid: false, error: 'No tiles placed' };
  }

  const sameRow = placedTiles.every(t => t.row === placedTiles[0].row);
  const sameCol = placedTiles.every(t => t.col === placedTiles[0].col);

  if (!sameRow && !sameCol) {
    return { valid: false, error: 'Tiles must be in a single row or column' };
  }

  for (const t of placedTiles) {
    if (t.row < 0 || t.row > 14 || t.col < 0 || t.col > 14) {
      return { valid: false, error: 'Tile out of bounds' };
    }
    if (board[t.row][t.col].tile !== null) {
      return { valid: false, error: 'Cell already occupied' };
    }
  }

  if (isFirstMove) {
    const coversCenter = placedTiles.some(t => t.row === 7 && t.col === 7);
    if (!coversCenter) {
      return { valid: false, error: 'First word must cover the center square' };
    }
    if (placedTiles.length < 2) {
      return { valid: false, error: 'First word must be at least 2 letters' };
    }
  }

  if (!isFirstMove) {
    let touchesExisting = false;
    for (const t of placedTiles) {
      const neighbors = [
        [t.row - 1, t.col], [t.row + 1, t.col],
        [t.row, t.col - 1], [t.row, t.col + 1],
      ];
      for (const [nr, nc] of neighbors) {
        if (nr >= 0 && nr < 15 && nc >= 0 && nc < 15) {
          if (board[nr][nc].tile !== null) {
            touchesExisting = true;
            break;
          }
        }
      }
      if (touchesExisting) break;
    }
    if (!touchesExisting) {
      return { valid: false, error: 'Word must connect to existing tiles' };
    }
  }

  if (sameRow) {
    const row = placedTiles[0].row;
    const cols = placedTiles.map(t => t.col).sort((a, b) => a - b);
    for (let c = cols[0]; c <= cols[cols.length - 1]; c++) {
      const isPlaced = placedTiles.some(t => t.col === c);
      const hasExisting = board[row][c].tile !== null;
      if (!isPlaced && !hasExisting) {
        return { valid: false, error: 'Gaps in word placement' };
      }
    }
  } else {
    const col = placedTiles[0].col;
    const rows = placedTiles.map(t => t.row).sort((a, b) => a - b);
    for (let r = rows[0]; r <= rows[rows.length - 1]; r++) {
      const isPlaced = placedTiles.some(t => t.row === r);
      const hasExisting = board[r][col].tile !== null;
      if (!isPlaced && !hasExisting) {
        return { valid: false, error: 'Gaps in word placement' };
      }
    }
  }

  return { valid: true };
}

export function getFormedWords(
  board: BoardCell[][],
  placedTiles: PlacedTile[]
): { word: string; tiles: { row: number; col: number; letter: string; value: number; isNew: boolean }[] }[] {
  const tempBoard = board.map(row => row.map(cell => ({ ...cell })));
  for (const t of placedTiles) {
    tempBoard[t.row][t.col] = { ...tempBoard[t.row][t.col], tile: t };
  }

  const words: { word: string; tiles: { row: number; col: number; letter: string; value: number; isNew: boolean }[] }[] = [];
  const placedSet = new Set(placedTiles.map(t => `${t.row},${t.col}`));

  const sameRow = placedTiles.every(t => t.row === placedTiles[0].row);

  function getWordAt(startRow: number, startCol: number, horizontal: boolean) {
    let r = startRow;
    let c = startCol;
    while ((horizontal ? c : r) > 0) {
      const nr = horizontal ? r : r - 1;
      const nc = horizontal ? c - 1 : c;
      if (tempBoard[nr][nc].tile) {
        if (horizontal) c--; else r--;
      } else break;
    }

    const tiles: { row: number; col: number; letter: string; value: number; isNew: boolean }[] = [];
    let word = '';
    while ((horizontal ? c : r) < 15 && tempBoard[r][c].tile) {
      const tile = tempBoard[r][c].tile!;
      word += tile.letter || '?';
      tiles.push({
        row: r, col: c,
        letter: tile.letter || '?',
        value: tile.value,
        isNew: placedSet.has(`${r},${c}`),
      });
      if (horizontal) c++; else r++;
    }

    if (word.length >= 2) {
      words.push({ word, tiles });
    }
  }

  if (sameRow || placedTiles.length === 1) {
    getWordAt(placedTiles[0].row, placedTiles[0].col, true);
  }
  if (!sameRow || placedTiles.length === 1) {
    getWordAt(placedTiles[0].row, placedTiles[0].col, false);
  }

  for (const t of placedTiles) {
    if (sameRow || placedTiles.length === 1) {
      getWordAt(t.row, t.col, false);
    }
    if (!sameRow || placedTiles.length === 1) {
      getWordAt(t.row, t.col, true);
    }
  }

  const uniqueWords = new Map<string, typeof words[0]>();
  for (const w of words) {
    const key = `${w.tiles[0].row},${w.tiles[0].col}-${w.tiles[w.tiles.length-1].row},${w.tiles[w.tiles.length-1].col}`;
    if (!uniqueWords.has(key)) {
      uniqueWords.set(key, w);
    }
  }

  return Array.from(uniqueWords.values());
}

export function calculateMoveScore(
  board: BoardCell[][],
  placedTiles: PlacedTile[]
): number {
  const formedWords = getFormedWords(board, placedTiles);
  let totalScore = 0;

  for (const { tiles } of formedWords) {
    let wordScore = 0;
    let wordMultiplier = 1;

    for (const t of tiles) {
      let letterScore = t.value;
      if (t.isNew) {
        const premium = board[t.row][t.col].premium;
        if (premium === 'DL') letterScore *= 2;
        else if (premium === 'TL') letterScore *= 3;
        else if (premium === 'DW' || premium === 'CENTER') wordMultiplier *= 2;
        else if (premium === 'TW') wordMultiplier *= 3;
      }
      wordScore += letterScore;
    }
    totalScore += wordScore * wordMultiplier;
  }

  if (placedTiles.length === 7) {
    totalScore += 50;
  }

  return totalScore;
}

const COMMON_WORDS = new Set([
  'AA','AB','AD','AE','AG','AH','AI','AL','AM','AN','AR','AS','AT','AW','AX','AY',
  'BA','BE','BI','BO','BY',
  'DA','DE','DO',
  'ED','EF','EH','EL','EM','EN','ER','ES','ET','EW','EX',
  'FA','FE',
  'GI','GO',
  'HA','HE','HI','HM','HO',
  'ID','IF','IN','IS','IT',
  'JO',
  'KA','KI',
  'LA','LI','LO',
  'MA','ME','MI','MM','MO','MU','MY',
  'NA','NE','NO','NU',
  'OD','OE','OF','OH','OI','OK','OM','ON','OP','OR','OS','OW','OX','OY',
  'PA','PE','PI','PO',
  'QI',
  'RE',
  'SH','SI','SO',
  'TA','TI','TO',
  'UH','UM','UN','UP','US','UT',
  'WE','WO',
  'XI','XU',
  'YA','YE',
  'ZA',
  'THE','AND','FOR','ARE','BUT','NOT','YOU','ALL','CAN','HER','WAS','ONE',
  'OUR','OUT','DAY','HAD','HAS','HIS','HOW','MAN','NEW','NOW','OLD','SEE',
  'WAY','WHO','BOY','DID','GET','HIM','HIT','HOT','LET','MAY','RUN','SAY',
  'SHE','TOO','USE','DAD','MOM','SET','TEN','TOP','RED','BIG','BAD','END',
  'FAR','PUT','RAN','SIT','TRY','ASK','CAR','EAT','FUN','GOD','HAT','JAR',
  'KEY','LAP','MAP','NET','OWL','PEN','RAG','SAT','TAP','VAN','WAR','YAM',
  'ZAP','ACE','AGE','AID','AIM','AIR','ALE','ANT','APE','ARC','ARK','ARM',
  'ART','ATE','AWE','AXE','BAG','BAN','BAR','BAT','BED','BET','BIT','BOW',
  'BOX','BUD','BUG','BUS','BUY','CAB','CAP','CAT','COP','COT','COW','CRY',
  'CUB','CUP','CUT','DAM','DEN','DEW','DIG','DIM','DIP','DOC','DOG','DOT',
  'DRY','DUB','DUG','DUN','DUO','EAR','EEL','EGG','ELF','ELK','ELM','EMU',
  'ERA','EVE','EWE','EYE','FAN','FAT','FAX','FED','FEW','FIG','FIN','FIT',
  'FIX','FLY','FOB','FOE','FOG','FOP','FOX','FRY','FUR','GAB','GAG','GAP',
  'GAS','GEL','GEM','GNU','GOB','GOT','GUM','GUN','GUT','GUY','GYM',
  'ABLE','ALSO','AREA','ARMY','AWAY','BACK','BALL','BAND','BANK','BASE',
  'BATH','BEAN','BEAR','BEAT','BEEN','BEER','BELL','BELT','BEND','BEST',
  'BILL','BIRD','BITE','BLOW','BLUE','BOAT','BODY','BOLD','BOMB','BOND',
  'BONE','BOOK','BOOT','BORE','BORN','BOSS','BOTH','BOWL','BULK','BURN',
  'BUSY','CAKE','CALL','CALM','CAME','CAMP','CARD','CARE','CART','CASE',
  'CASH','CAST','CAVE','CHIP','CITY','CLAD','CLAY','CLIP','CLUB','CLUE',
  'COAL','COAT','CODE','COIN','COLD','COLE','COME','COOK','COOL','COPE',
  'COPY','CORD','CORE','CORN','COST','CREW','CROP','CROW','CURE','CURL',
  'CUTE','DALE','DAME','DAMN','DARE','DARK','DASH','DATA','DATE','DAWN',
  'DEAD','DEAF','DEAL','DEAN','DEAR','DEBT','DECK','DEED','DEEM','DEEP',
  'DEER','DENY','DESK','DIAL','DICE','DIET','DIRE','DIRT','DISH','DISK',
  'DOCK','DOES','DONE','DOOM','DOOR','DOSE','DOWN','DRAG','DRAW','DREW',
  'DROP','DRUM','DUAL','DUEL','DUKE','DULL','DUMB','DUMP','DUNE','DUST',
  'DUTY','EACH','EARL','EARN','EASE','EAST','EASY','EDGE','EDIT','ELSE',
  'EVEN','EVER','EVIL','EXAM','EXEC','FACE','FACT','FADE','FAIL','FAIR',
  'FAKE','FALL','FAME','FANG','FARE','FARM','FAST','FATE','FEAR','FEAT',
  'FEED','FEEL','FEET','FELL','FELT','FILE','FILL','FILM','FIND','FINE',
  'FIRE','FIRM','FISH','FIST','FLAG','FLAT','FLED','FLEW','FLIP','FLOW',
  'FOAM','FOLD','FOLK','FOND','FONT','FOOD','FOOL','FOOT','FORD','FORE',
  'FORK','FORM','FORT','FOUL','FOUR','FREE','FROM','FUEL','FULL','FUND',
  'FURY','FUSE','GAIN','GALE','GAME','GANG','GAPE','GATE','GAVE','GAZE',
  'GEAR','GENE','GIFT','GIRL','GIVE','GLAD','GLEN','GLOW','GLUE','GOAT',
  'GOES','GOLD','GOLF','GONE','GOOD','GRAB','GRAY','GREW','GRID','GRIM',
  'GRIN','GRIP','GROW','GULF','GURU','GUST',
  'QUIZ','QUAG','QUAD','QOPH',
  'JAZZ','BUZZ','FIZZ','FUZZ','RAZZ','TIZZ',
  'ZEAL','ZERO','ZINC','ZONE','ZOOM',
  'JINX','JIVE','JOKE','JUMP','JURY','JUST',
  'TAXI','TEXT','NEXT','EXIT','APEX','OXEN',
  'KNOB','KNEE','KNEW','KNIT','KNOT','KNOW',
  'WREN','WRAP','WRIT','WAKE','WAGE','WADE','WAIT','WALK','WALL','WANT',
  'WARD','WARM','WARN','WARP','WASH','WAVE','WEAK','WEAR','WEED','WEEK',
  'WELL','WENT','WERE','WEST','WHAT','WHEN','WHOM','WIDE','WIFE','WILD',
  'WILL','WIND','WINE','WING','WIRE','WISE','WISH','WITH','WOKE','WOLF',
  'WOMB','WOOD','WOOL','WORD','WORE','WORK','WORM','WORN','WRAP',
  'WORLD','WOULD','WRITE','WRONG','ABOUT','ABOVE','AFTER','AGAIN','BEING',
  'BELOW','BLACK','BOARD','BRAIN','BREAD','BREAK','BRING','BROAD','BROWN',
  'BUILD','CARRY','CATCH','CAUSE','CHAIN','CHAIR','CHEAP','CHECK','CHIEF',
  'CHILD','CHINA','CLAIM','CLASS','CLEAN','CLEAR','CLIMB','CLOCK','CLOSE',
  'CLOUD','COACH','COAST','COLOR','COMES','COULD','COUNT','COURT','COVER',
  'CRAFT','CRASH','CRAZY','CREAM','CRIME','CROSS','CROWD','CROWN','CURVE',
  'CYCLE','DANCE','DEATH','DEPTH','DOUBT','DRAFT','DRAIN','DRAMA','DRAWN',
  'DREAM','DRESS','DRIED','DRINK','DRIVE','DROVE','DYING','EAGER','EARLY',
  'EARTH','EIGHT','ELECT','ELITE','EMPTY','ENEMY','ENJOY','ENTER','ENTRY',
  'EQUAL','ERROR','EVENT','EVERY','EXACT','EXTRA','FAITH','FALSE','FAULT',
  'FEAST','FENCE','FEWER','FIBER','FIELD','FIFTH','FIFTY','FIGHT','FINAL',
  'FINDS','FIRST','FIXED','FLAME','FLASH','FLEET','FLESH','FLIES','FLOAT',
  'FLOOD','FLOOR','FLOUR','FLUID','FLUSH','FOCUS','FORCE','FORTH','FOUND',
  'FRAME','FRANK','FRAUD','FRESH','FRONT','FROST','FRUIT','FULLY','FUNNY',
]);

export function isValidWord(word: string): boolean {
  return COMMON_WORDS.has(word.toUpperCase());
}

export function getLetterValue(letter: string): number {
  const entry = TILE_DISTRIBUTION[letter.toUpperCase()];
  return entry ? entry.value : 0;
}

export function generateAIMove(
  board: BoardCell[][],
  aiRack: Tile[],
  difficulty: 'easy' | 'medium' | 'hard',
  isFirstMove: boolean
): PlacedTile[] | null {
  const possibleMoves: { tiles: PlacedTile[]; score: number }[] = [];

  if (isFirstMove) {
    const horizontalWords = findWordsFromRack(aiRack, 2, 7);
    for (const word of horizontalWords) {
      const tiles: PlacedTile[] = word.map((tile, i) => ({
        ...tile,
        row: 7,
        col: 7 - Math.floor(word.length / 2) + i,
      }));
      const validation = validatePlacement(board, tiles, true);
      if (validation.valid) {
        const score = calculateMoveScore(board, tiles);
        possibleMoves.push({ tiles, score });
      }
    }
  } else {
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if (board[r][c].tile) {
          tryExtendFromPosition(board, aiRack, r, c, possibleMoves);
        }
      }
    }
  }

  if (possibleMoves.length === 0) return null;

  possibleMoves.sort((a, b) => b.score - a.score);

  let moveIndex = 0;
  if (difficulty === 'easy') {
    moveIndex = Math.min(possibleMoves.length - 1, Math.floor(Math.random() * Math.min(possibleMoves.length, 5)) + Math.floor(possibleMoves.length * 0.5));
  } else if (difficulty === 'medium') {
    moveIndex = Math.floor(Math.random() * Math.min(possibleMoves.length, 3));
  }

  return possibleMoves[moveIndex]?.tiles || null;
}

function findWordsFromRack(rack: Tile[], minLen: number, maxLen: number): Tile[][] {
  const results: Tile[][] = [];
  const letters = rack.map(t => t.letter.toUpperCase());

  for (const word of COMMON_WORDS) {
    if (word.length < minLen || word.length > maxLen) continue;

    const available = [...letters];
    const usedTiles: Tile[] = [];
    let canForm = true;

    for (const ch of word) {
      const idx = available.indexOf(ch);
      if (idx !== -1) {
        available.splice(idx, 1);
        const tileIdx = rack.findIndex(
          (t, ti) => t.letter.toUpperCase() === ch && !usedTiles.some(ut => ut.id === t.id)
        );
        if (tileIdx !== -1) usedTiles.push(rack[tileIdx]);
        else canForm = false;
      } else {
        const blankIdx = available.indexOf('');
        if (blankIdx !== -1) {
          available.splice(blankIdx, 1);
          const blankTile = rack.find(
            t => t.isBlank && !usedTiles.some(ut => ut.id === t.id)
          );
          if (blankTile) usedTiles.push({ ...blankTile, letter: ch });
          else canForm = false;
        } else {
          canForm = false;
        }
      }
      if (!canForm) break;
    }

    if (canForm && usedTiles.length === word.length) {
      results.push(usedTiles);
    }
  }

  return results;
}

function tryExtendFromPosition(
  board: BoardCell[][],
  rack: Tile[],
  row: number,
  col: number,
  moves: { tiles: PlacedTile[]; score: number }[]
) {
  for (let len = 1; len <= Math.min(rack.length, 4); len++) {
    for (const horizontal of [true, false]) {
      for (let offset = -len; offset <= 0; offset++) {
        const tiles: PlacedTile[] = [];
        const usedRackIndices: number[] = [];
        let valid = true;

        for (let i = 0; i < len; i++) {
          const r = horizontal ? row : row + offset + i;
          const c = horizontal ? col + offset + i : col;

          if (r < 0 || r >= 15 || c < 0 || c >= 15) { valid = false; break; }
          if (board[r][c].tile !== null) { valid = false; break; }

          const rackIdx = rack.findIndex((_, idx) => !usedRackIndices.includes(idx));
          if (rackIdx === -1) { valid = false; break; }

          usedRackIndices.push(rackIdx);
          tiles.push({ ...rack[rackIdx], row: r, col: c });
        }

        if (!valid || tiles.length === 0) continue;

        const validation = validatePlacement(board, tiles, false);
        if (validation.valid) {
          const formedWords = getFormedWords(board, tiles);
          const allValid = formedWords.every(w => isValidWord(w.word));
          if (allValid && formedWords.length > 0) {
            const score = calculateMoveScore(board, tiles);
            moves.push({ tiles, score });
          }
        }
      }
    }
  }
}

export function getTileCount(letter: string): number {
  return TILE_DISTRIBUTION[letter.toUpperCase()]?.count || 0;
}

export function getRemainingTileCount(bag: Tile[]): number {
  return bag.length;
}

export function calculateEndgameDeductions(rack: Tile[]): number {
  return rack.reduce((sum, t) => sum + t.value, 0);
}
