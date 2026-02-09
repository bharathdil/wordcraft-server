import { WebSocket } from "ws";

interface Tile {
  id: string;
  letter: string;
  value: number;
  isBlank: boolean;
}

interface PlacedTile extends Tile {
  row: number;
  col: number;
}

interface BoardCell {
  tile: Tile | null;
  premium: string;
}

interface Player {
  ws: WebSocket;
  id: string;
  name: string;
  rack: Tile[];
  score: number;
  connected: boolean;
}

interface GameRoom {
  code: string;
  players: Player[];
  board: BoardCell[][];
  tileBag: Tile[];
  currentTurnIndex: number;
  isFirstMove: boolean;
  consecutivePasses: number;
  gameOver: boolean;
  winner: string | null;
  moveHistory: any[];
  createdAt: number;
  started: boolean;
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
  "?": { count: 2, value: 0 },
};

type PremiumType = "none" | "DL" | "TL" | "DW" | "TW" | "CENTER";

const PREMIUM_MAP: Record<string, PremiumType> = {};
function initPremiumMap() {
  const TW = [[0,0],[0,7],[0,14],[7,0],[7,14],[14,0],[14,7],[14,14]];
  const DW = [[1,1],[2,2],[3,3],[4,4],[10,10],[11,11],[12,12],[13,13],[1,13],[2,12],[3,11],[4,10],[10,4],[11,3],[12,2],[13,1]];
  const TL = [[1,5],[1,9],[5,1],[5,5],[5,9],[5,13],[9,1],[9,5],[9,9],[9,13],[13,5],[13,9]];
  const DL = [[0,3],[0,11],[2,6],[2,8],[3,0],[3,7],[3,14],[6,2],[6,6],[6,8],[6,12],[7,3],[7,11],[8,2],[8,6],[8,8],[8,12],[11,0],[11,7],[11,14],[12,6],[12,8],[14,3],[14,11]];
  TW.forEach(([r, c]) => { PREMIUM_MAP[`${r},${c}`] = "TW"; });
  DW.forEach(([r, c]) => { PREMIUM_MAP[`${r},${c}`] = "DW"; });
  TL.forEach(([r, c]) => { PREMIUM_MAP[`${r},${c}`] = "TL"; });
  DL.forEach(([r, c]) => { PREMIUM_MAP[`${r},${c}`] = "DL"; });
  PREMIUM_MAP["7,7"] = "CENTER";
}
initPremiumMap();

const COMMON_WORDS = new Set([
  "AA","AB","AD","AE","AG","AH","AI","AL","AM","AN","AR","AS","AT","AW","AX","AY",
  "BA","BE","BI","BO","BY","DA","DE","DO","ED","EF","EH","EL","EM","EN","ER","ES",
  "ET","EW","EX","FA","FE","GI","GO","HA","HE","HI","HM","HO","ID","IF","IN","IS",
  "IT","JO","KA","KI","LA","LI","LO","MA","ME","MI","MM","MO","MU","MY","NA","NE",
  "NO","NU","OD","OE","OF","OH","OI","OK","OM","ON","OP","OR","OS","OW","OX","OY",
  "PA","PE","PI","PO","QI","RE","SH","SI","SO","TA","TI","TO","UH","UM","UN","UP",
  "US","UT","WE","WO","XI","XU","YA","YE","ZA",
  "THE","AND","FOR","ARE","BUT","NOT","YOU","ALL","CAN","HER","WAS","ONE",
  "OUR","OUT","DAY","HAD","HAS","HIS","HOW","MAN","NEW","NOW","OLD","SEE",
  "WAY","WHO","BOY","DID","GET","HIM","HIT","HOT","LET","MAY","RUN","SAY",
  "SHE","TOO","USE","DAD","MOM","SET","TEN","TOP","RED","BIG","BAD","END",
  "FAR","PUT","RAN","SIT","TRY","ASK","CAR","EAT","FUN","GOD","HAT","JAR",
  "KEY","LAP","MAP","NET","OWL","PEN","RAG","SAT","TAP","VAN","WAR","YAM",
  "ZAP","ACE","AGE","AID","AIM","AIR","ALE","ANT","APE","ARC","ARK","ARM",
  "ART","ATE","AWE","AXE","BAG","BAN","BAR","BAT","BED","BET","BIT","BOW",
  "BOX","BUD","BUG","BUS","BUY","CAB","CAP","CAT","COP","COT","COW","CRY",
  "CUB","CUP","CUT","DAM","DEN","DEW","DIG","DIM","DIP","DOC","DOG","DOT",
  "DRY","DUB","DUG","DUN","DUO","EAR","EEL","EGG","ELF","ELK","ELM","EMU",
  "ERA","EVE","EWE","EYE","FAN","FAT","FAX","FED","FEW","FIG","FIN","FIT",
  "FIX","FLY","FOB","FOE","FOG","FOP","FOX","FRY","FUR","GAB","GAG","GAP",
  "GAS","GEL","GEM","GNU","GOB","GOT","GUM","GUN","GUT","GUY","GYM",
  "ABLE","ALSO","AREA","ARMY","AWAY","BACK","BALL","BAND","BANK","BASE",
  "BATH","BEAN","BEAR","BEAT","BEEN","BEER","BELL","BELT","BEND","BEST",
  "BILL","BIRD","BITE","BLOW","BLUE","BOAT","BODY","BOLD","BOMB","BOND",
  "BONE","BOOK","BOOT","BORE","BORN","BOSS","BOTH","BOWL","BULK","BURN",
  "BUSY","CAKE","CALL","CALM","CAME","CAMP","CARD","CARE","CART","CASE",
  "CASH","CAST","CAVE","CHIP","CITY","CLAD","CLAY","CLIP","CLUB","CLUE",
  "COAL","COAT","CODE","COIN","COLD","COLE","COME","COOK","COOL","COPE",
  "COPY","CORD","CORE","CORN","COST","CREW","CROP","CROW","CURE","CURL",
  "CUTE","DALE","DAME","DAMN","DARE","DARK","DASH","DATA","DATE","DAWN",
  "DEAD","DEAF","DEAL","DEAN","DEAR","DEBT","DECK","DEED","DEEM","DEEP",
  "DEER","DENY","DESK","DIAL","DICE","DIET","DIRE","DIRT","DISH","DISK",
  "DOCK","DOES","DONE","DOOM","DOOR","DOSE","DOWN","DRAG","DRAW","DREW",
  "DROP","DRUM","DUAL","DUEL","DUKE","DULL","DUMB","DUMP","DUNE","DUST",
  "DUTY","EACH","EARL","EARN","EASE","EAST","EASY","EDGE","EDIT","ELSE",
  "EVEN","EVER","EVIL","EXAM","EXEC","FACE","FACT","FADE","FAIL","FAIR",
  "FAKE","FALL","FAME","FANG","FARE","FARM","FAST","FATE","FEAR","FEAT",
  "FEED","FEEL","FEET","FELL","FELT","FILE","FILL","FILM","FIND","FINE",
  "FIRE","FIRM","FISH","FIST","FLAG","FLAT","FLED","FLEW","FLIP","FLOW",
  "FOAM","FOLD","FOLK","FOND","FONT","FOOD","FOOL","FOOT","FORD","FORE",
  "FORK","FORM","FORT","FOUL","FOUR","FREE","FROM","FUEL","FULL","FUND",
  "FURY","FUSE","GAIN","GALE","GAME","GANG","GAPE","GATE","GAVE","GAZE",
  "GEAR","GENE","GIFT","GIRL","GIVE","GLAD","GLEN","GLOW","GLUE","GOAT",
  "GOES","GOLD","GOLF","GONE","GOOD","GRAB","GRAY","GREW","GRID","GRIM",
  "GRIN","GRIP","GROW","GULF","GURU","GUST",
  "QUIZ","QUAG","QUAD","QOPH","JAZZ","BUZZ","FIZZ","FUZZ","RAZZ","TIZZ",
  "ZEAL","ZERO","ZINC","ZONE","ZOOM","JINX","JIVE","JOKE","JUMP","JURY",
  "JUST","TAXI","TEXT","NEXT","EXIT","APEX","OXEN","KNOB","KNEE","KNEW",
  "KNIT","KNOT","KNOW","WREN","WRAP","WRIT","WAKE","WAGE","WADE","WAIT",
  "WALK","WALL","WANT","WARD","WARM","WARN","WARP","WASH","WAVE","WEAK",
  "WEAR","WEED","WEEK","WELL","WENT","WERE","WEST","WHAT","WHEN","WHOM",
  "WIDE","WIFE","WILD","WILL","WIND","WINE","WING","WIRE","WISE","WISH",
  "WITH","WOKE","WOLF","WOMB","WOOD","WOOL","WORD","WORE","WORK","WORM",
  "WORN","WORLD","WOULD","WRITE","WRONG","ABOUT","ABOVE","AFTER","AGAIN",
  "BEING","BELOW","BLACK","BOARD","BRAIN","BREAD","BREAK","BRING","BROAD",
  "BROWN","BUILD","CARRY","CATCH","CAUSE","CHAIN","CHAIR","CHEAP","CHECK",
  "CHIEF","CHILD","CHINA","CLAIM","CLASS","CLEAN","CLEAR","CLIMB","CLOCK",
  "CLOSE","CLOUD","COACH","COAST","COLOR","COMES","COULD","COUNT","COURT",
  "COVER","CRAFT","CRASH","CRAZY","CREAM","CRIME","CROSS","CROWD","CROWN",
  "CURVE","CYCLE","DANCE","DEATH","DEPTH","DOUBT","DRAFT","DRAIN","DRAMA",
  "DRAWN","DREAM","DRESS","DRIED","DRINK","DRIVE","DROVE","DYING","EAGER",
  "EARLY","EARTH","EIGHT","ELECT","ELITE","EMPTY","ENEMY","ENJOY","ENTER",
  "ENTRY","EQUAL","ERROR","EVENT","EVERY","EXACT","EXTRA","FAITH","FALSE",
  "FAULT","FEAST","FENCE","FEWER","FIBER","FIELD","FIFTH","FIFTY","FIGHT",
  "FINAL","FINDS","FIRST","FIXED","FLAME","FLASH","FLEET","FLESH","FLIES",
  "FLOAT","FLOOD","FLOOR","FLOUR","FLUID","FLUSH","FOCUS","FORCE","FORTH",
  "FOUND","FRAME","FRANK","FRAUD","FRESH","FRONT","FROST","FRUIT","FULLY",
  "FUNNY",
]);

function isValidWord(word: string): boolean {
  return COMMON_WORDS.has(word.toUpperCase());
}

const rooms = new Map<string, GameRoom>();

let tileIdCounter = 0;
function genTileId(): string {
  tileIdCounter++;
  return `st_${Date.now()}_${tileIdCounter}_${Math.random().toString(36).substr(2, 5)}`;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function createTileBag(): Tile[] {
  const tiles: Tile[] = [];
  for (const [letter, info] of Object.entries(TILE_DISTRIBUTION)) {
    for (let i = 0; i < info.count; i++) {
      tiles.push({ id: genTileId(), letter: letter === "?" ? "" : letter, value: info.value, isBlank: letter === "?" });
    }
  }
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}

function createEmptyBoard(): BoardCell[][] {
  const board: BoardCell[][] = [];
  for (let r = 0; r < 15; r++) {
    const row: BoardCell[] = [];
    for (let c = 0; c < 15; c++) {
      row.push({ tile: null, premium: PREMIUM_MAP[`${r},${c}`] || "none" });
    }
    board.push(row);
  }
  return board;
}

function drawTiles(bag: Tile[], count: number): { drawn: Tile[]; remaining: Tile[] } {
  const drawn = bag.slice(0, Math.min(count, bag.length));
  const remaining = bag.slice(drawn.length);
  return { drawn, remaining };
}

function validatePlacement(board: BoardCell[][], placedTiles: PlacedTile[], isFirstMove: boolean): { valid: boolean; error?: string } {
  if (placedTiles.length === 0) return { valid: false, error: "No tiles placed" };

  const sameRow = placedTiles.every(t => t.row === placedTiles[0].row);
  const sameCol = placedTiles.every(t => t.col === placedTiles[0].col);
  if (!sameRow && !sameCol) return { valid: false, error: "Tiles must be in a single row or column" };

  for (const t of placedTiles) {
    if (t.row < 0 || t.row > 14 || t.col < 0 || t.col > 14) return { valid: false, error: "Tile out of bounds" };
    if (board[t.row][t.col].tile !== null) return { valid: false, error: "Cell already occupied" };
  }

  if (isFirstMove) {
    if (!placedTiles.some(t => t.row === 7 && t.col === 7)) return { valid: false, error: "First word must cover center" };
    if (placedTiles.length < 2) return { valid: false, error: "First word must be at least 2 letters" };
  }

  if (!isFirstMove) {
    let touches = false;
    for (const t of placedTiles) {
      const adj = [[t.row-1,t.col],[t.row+1,t.col],[t.row,t.col-1],[t.row,t.col+1]];
      for (const [nr, nc] of adj) {
        if (nr >= 0 && nr < 15 && nc >= 0 && nc < 15 && board[nr][nc].tile !== null) { touches = true; break; }
      }
      if (touches) break;
    }
    if (!touches) return { valid: false, error: "Word must connect to existing tiles" };
  }

  if (sameRow) {
    const row = placedTiles[0].row;
    const cols = placedTiles.map(t => t.col).sort((a, b) => a - b);
    for (let c = cols[0]; c <= cols[cols.length - 1]; c++) {
      if (!placedTiles.some(t => t.col === c) && board[row][c].tile === null) return { valid: false, error: "Gaps in placement" };
    }
  } else {
    const col = placedTiles[0].col;
    const rows = placedTiles.map(t => t.row).sort((a, b) => a - b);
    for (let r = rows[0]; r <= rows[rows.length - 1]; r++) {
      if (!placedTiles.some(t => t.row === r) && board[r][col].tile === null) return { valid: false, error: "Gaps in placement" };
    }
  }

  return { valid: true };
}

function getFormedWords(board: BoardCell[][], placedTiles: PlacedTile[]) {
  const tempBoard = board.map(row => row.map(cell => ({ ...cell })));
  for (const t of placedTiles) tempBoard[t.row][t.col] = { ...tempBoard[t.row][t.col], tile: t };

  const words: { word: string; tiles: { row: number; col: number; letter: string; value: number; isNew: boolean }[] }[] = [];
  const placedSet = new Set(placedTiles.map(t => `${t.row},${t.col}`));
  const sameRow = placedTiles.every(t => t.row === placedTiles[0].row);

  function getWordAt(startRow: number, startCol: number, horizontal: boolean) {
    let r = startRow, c = startCol;
    while ((horizontal ? c : r) > 0) {
      const nr = horizontal ? r : r - 1;
      const nc = horizontal ? c - 1 : c;
      if (tempBoard[nr][nc].tile) { if (horizontal) c--; else r--; } else break;
    }
    const tiles: { row: number; col: number; letter: string; value: number; isNew: boolean }[] = [];
    let word = "";
    while ((horizontal ? c : r) < 15 && tempBoard[r][c].tile) {
      const tile = tempBoard[r][c].tile!;
      word += tile.letter || "?";
      tiles.push({ row: r, col: c, letter: tile.letter || "?", value: tile.value, isNew: placedSet.has(`${r},${c}`) });
      if (horizontal) c++; else r++;
    }
    if (word.length >= 2) words.push({ word, tiles });
  }

  if (sameRow || placedTiles.length === 1) getWordAt(placedTiles[0].row, placedTiles[0].col, true);
  if (!sameRow || placedTiles.length === 1) getWordAt(placedTiles[0].row, placedTiles[0].col, false);
  for (const t of placedTiles) {
    if (sameRow || placedTiles.length === 1) getWordAt(t.row, t.col, false);
    if (!sameRow || placedTiles.length === 1) getWordAt(t.row, t.col, true);
  }

  const unique = new Map<string, typeof words[0]>();
  for (const w of words) {
    const key = `${w.tiles[0].row},${w.tiles[0].col}-${w.tiles[w.tiles.length-1].row},${w.tiles[w.tiles.length-1].col}`;
    if (!unique.has(key)) unique.set(key, w);
  }
  return Array.from(unique.values());
}

function calculateScore(board: BoardCell[][], placedTiles: PlacedTile[]): number {
  const formedWords = getFormedWords(board, placedTiles);
  let total = 0;
  for (const { tiles } of formedWords) {
    let wordScore = 0, wordMult = 1;
    for (const t of tiles) {
      let ls = t.value;
      if (t.isNew) {
        const p = board[t.row][t.col].premium;
        if (p === "DL") ls *= 2;
        else if (p === "TL") ls *= 3;
        else if (p === "DW" || p === "CENTER") wordMult *= 2;
        else if (p === "TW") wordMult *= 3;
      }
      wordScore += ls;
    }
    total += wordScore * wordMult;
  }
  if (placedTiles.length === 7) total += 50;
  return total;
}

function sendToPlayer(player: Player, data: any) {
  if (player.ws.readyState === WebSocket.OPEN) {
    player.ws.send(JSON.stringify(data));
  }
}

function broadcastRoom(room: GameRoom, data: any) {
  for (const p of room.players) sendToPlayer(p, data);
}

function getPublicBoard(board: BoardCell[][]): any[][] {
  return board.map(row => row.map(cell => ({
    tile: cell.tile ? { letter: cell.tile.letter, value: cell.tile.value } : null,
    premium: cell.premium,
  })));
}

function getRoomState(room: GameRoom, forPlayerId: string) {
  const player = room.players.find(p => p.id === forPlayerId);
  const opponent = room.players.find(p => p.id !== forPlayerId);

  return {
    type: "game_state",
    code: room.code,
    board: getPublicBoard(room.board),
    yourRack: player?.rack || [],
    yourScore: player?.score || 0,
    opponentScore: opponent?.score || 0,
    opponentName: opponent?.name || "Waiting...",
    opponentRackCount: opponent?.rack.length || 0,
    isYourTurn: room.started && room.players[room.currentTurnIndex]?.id === forPlayerId,
    isFirstMove: room.isFirstMove,
    tilesLeft: room.tileBag.length,
    gameOver: room.gameOver,
    winner: room.winner,
    moveHistory: room.moveHistory,
    started: room.started,
    playerCount: room.players.length,
    yourName: player?.name || "",
  };
}

function cleanupOldRooms() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > 3600000) {
      rooms.delete(code);
    }
  }
}

setInterval(cleanupOldRooms, 60000);

export function handleWebSocket(ws: WebSocket) {
  let playerId = "";
  let currentRoomCode = "";

  ws.on("message", (raw) => {
    let msg: any;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    switch (msg.type) {
      case "create_room": {
        let code = generateCode();
        while (rooms.has(code)) code = generateCode();

        playerId = genTileId();
        const playerName = (msg.name || "Player 1").slice(0, 20);

        const tileBag = createTileBag();
        const { drawn, remaining } = drawTiles(tileBag, 7);

        const room: GameRoom = {
          code,
          players: [{ ws, id: playerId, name: playerName, rack: drawn, score: 0, connected: true }],
          board: createEmptyBoard(),
          tileBag: remaining,
          currentTurnIndex: 0,
          isFirstMove: true,
          consecutivePasses: 0,
          gameOver: false,
          winner: null,
          moveHistory: [],
          createdAt: Date.now(),
          started: false,
        };

        rooms.set(code, room);
        currentRoomCode = code;

        sendToPlayer(room.players[0], {
          type: "room_created",
          code,
          playerId,
        });
        sendToPlayer(room.players[0], getRoomState(room, playerId));
        break;
      }

      case "join_room": {
        const code = (msg.code || "").toUpperCase().trim();
        const room = rooms.get(code);

        if (!room) {
          ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
          return;
        }
        if (room.players.length >= 2) {
          const disconnected = room.players.find(p => !p.connected);
          if (disconnected) {
            disconnected.ws = ws;
            disconnected.connected = true;
            playerId = disconnected.id;
            currentRoomCode = code;
            sendToPlayer(disconnected, { type: "reconnected", playerId });
            sendToPlayer(disconnected, getRoomState(room, playerId));
            const other = room.players.find(p => p.id !== playerId);
            if (other) sendToPlayer(other, getRoomState(room, other.id));
            return;
          }
          ws.send(JSON.stringify({ type: "error", message: "Room is full" }));
          return;
        }

        playerId = genTileId();
        const playerName = (msg.name || "Player 2").slice(0, 20);
        const { drawn, remaining } = drawTiles(room.tileBag, 7);
        room.tileBag = remaining;

        room.players.push({ ws, id: playerId, name: playerName, rack: drawn, score: 0, connected: true });
        currentRoomCode = code;

        room.started = true;

        sendToPlayer(room.players[1], { type: "room_joined", code, playerId });

        for (const p of room.players) {
          sendToPlayer(p, getRoomState(room, p.id));
        }

        broadcastRoom(room, { type: "game_started" });
        break;
      }

      case "place_tiles": {
        const room = rooms.get(currentRoomCode);
        if (!room || !room.started || room.gameOver) return;

        const playerIndex = room.players.findIndex(p => p.id === playerId);
        if (playerIndex !== room.currentTurnIndex) {
          sendToPlayer(room.players[playerIndex], { type: "error", message: "Not your turn" });
          return;
        }

        const player = room.players[playerIndex];
        const placedTiles: PlacedTile[] = msg.tiles || [];

        if (placedTiles.length === 0) {
          sendToPlayer(player, { type: "error", message: "No tiles placed" });
          return;
        }

        const rackIds = new Set(player.rack.map(t => t.id));
        for (const pt of placedTiles) {
          if (!rackIds.has(pt.id)) {
            sendToPlayer(player, { type: "error", message: "Invalid tile" });
            return;
          }
        }

        const validation = validatePlacement(room.board, placedTiles, room.isFirstMove);
        if (!validation.valid) {
          sendToPlayer(player, { type: "move_rejected", error: validation.error });
          return;
        }

        const formedWords = getFormedWords(room.board, placedTiles);
        const invalid = formedWords.filter(w => !isValidWord(w.word));
        if (invalid.length > 0) {
          sendToPlayer(player, { type: "move_rejected", error: `"${invalid[0].word}" is not a valid word` });
          return;
        }

        const score = calculateScore(room.board, placedTiles);

        for (const t of placedTiles) {
          room.board[t.row][t.col] = { ...room.board[t.row][t.col], tile: t };
        }

        player.rack = player.rack.filter(t => !placedTiles.some(pt => pt.id === t.id));
        const needed = 7 - player.rack.length;
        const { drawn, remaining } = drawTiles(room.tileBag, Math.max(0, needed));
        player.rack = [...player.rack, ...drawn];
        room.tileBag = remaining;

        player.score += score;
        room.isFirstMove = false;
        room.consecutivePasses = 0;

        const mainWord = formedWords.length > 0 ? formedWords[0].word : "";
        room.moveHistory.push({ player: player.name, word: mainWord, score, type: "play" });

        let isGameOver = remaining.length === 0 && player.rack.length === 0;
        if (isGameOver) {
          room.gameOver = true;
          const opponent = room.players.find(p => p.id !== playerId)!;
          const deduction = opponent.rack.reduce((s, t) => s + t.value, 0);
          opponent.score -= deduction;
          player.score += deduction;
          room.winner = player.score > opponent.score ? player.name : opponent.score > player.score ? opponent.name : "Tie";
        }

        room.currentTurnIndex = (room.currentTurnIndex + 1) % 2;

        broadcastRoom(room, { type: "move_made", player: player.name, word: mainWord, score });
        for (const p of room.players) sendToPlayer(p, getRoomState(room, p.id));
        break;
      }

      case "pass_turn": {
        const room = rooms.get(currentRoomCode);
        if (!room || !room.started || room.gameOver) return;

        const playerIndex = room.players.findIndex(p => p.id === playerId);
        if (playerIndex !== room.currentTurnIndex) return;

        room.consecutivePasses++;
        room.moveHistory.push({ player: room.players[playerIndex].name, word: "", score: 0, type: "pass" });

        if (room.consecutivePasses >= 4) {
          room.gameOver = true;
          for (const p of room.players) {
            p.score -= p.rack.reduce((s, t) => s + t.value, 0);
          }
          room.winner = room.players[0].score > room.players[1].score ? room.players[0].name :
            room.players[1].score > room.players[0].score ? room.players[1].name : "Tie";
        }

        room.currentTurnIndex = (room.currentTurnIndex + 1) % 2;
        for (const p of room.players) sendToPlayer(p, getRoomState(room, p.id));
        break;
      }

      case "exchange_tiles": {
        const room = rooms.get(currentRoomCode);
        if (!room || !room.started || room.gameOver) return;
        if (room.tileBag.length < 7) {
          sendToPlayer(room.players.find(p => p.id === playerId)!, { type: "error", message: "Not enough tiles to exchange" });
          return;
        }

        const playerIndex = room.players.findIndex(p => p.id === playerId);
        if (playerIndex !== room.currentTurnIndex) return;

        const player = room.players[playerIndex];
        const tileIds: string[] = msg.tileIds || [];
        const tilesToExchange = player.rack.filter(t => tileIds.includes(t.id));
        player.rack = player.rack.filter(t => !tileIds.includes(t.id));

        const { drawn, remaining } = drawTiles(room.tileBag, tilesToExchange.length);
        player.rack = [...player.rack, ...drawn];
        room.tileBag = [...remaining, ...tilesToExchange];
        for (let i = room.tileBag.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [room.tileBag[i], room.tileBag[j]] = [room.tileBag[j], room.tileBag[i]];
        }

        room.consecutivePasses = 0;
        room.moveHistory.push({ player: player.name, word: "", score: 0, type: "exchange" });
        room.currentTurnIndex = (room.currentTurnIndex + 1) % 2;

        for (const p of room.players) sendToPlayer(p, getRoomState(room, p.id));
        break;
      }
    }
  });

  ws.on("close", () => {
    const room = rooms.get(currentRoomCode);
    if (room) {
      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.connected = false;
        const other = room.players.find(p => p.id !== playerId);
        if (other) sendToPlayer(other, { type: "opponent_disconnected" });
      }
      const allDisconnected = room.players.every(p => !p.connected);
      if (allDisconnected) {
        setTimeout(() => {
          const r = rooms.get(currentRoomCode);
          if (r && r.players.every(p => !p.connected)) rooms.delete(currentRoomCode);
        }, 300000);
      }
    }
  });
}
