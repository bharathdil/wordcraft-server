import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GameState, PlacedTile, Tile, BoardCell,
  initializeGame, validatePlacement, calculateMoveScore,
  getFormedWords, isValidWord, drawTiles, generateAIMove,
  calculateEndgameDeductions,
} from './scrabble-engine';

interface GameContextValue {
  gameState: GameState | null;
  pendingTiles: PlacedTile[];
  selectedTileId: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  startNewGame: () => void;
  setDifficulty: (d: 'easy' | 'medium' | 'hard') => void;
  selectTile: (tileId: string | null) => void;
  placeTileOnBoard: (row: number, col: number) => void;
  recallTiles: () => void;
  shuffleRack: () => void;
  submitMove: () => { success: boolean; error?: string; score?: number };
  passTurn: () => void;
  exchangeTiles: (tileIds: string[]) => void;
  getPreviewScore: () => number;
  stats: GameStats;
  loadStats: () => Promise<void>;
}

interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  highScore: number;
  bestWord: string;
  bestWordScore: number;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [pendingTiles, setPendingTiles] = useState<PlacedTile[]>([]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [stats, setStats] = useState<GameStats>({
    gamesPlayed: 0, gamesWon: 0, highScore: 0, bestWord: '', bestWordScore: 0,
  });

  const loadStats = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem('scrabble_stats');
      if (data) setStats(JSON.parse(data));
    } catch {}
  }, []);

  const saveStats = useCallback(async (newStats: GameStats) => {
    setStats(newStats);
    try {
      await AsyncStorage.setItem('scrabble_stats', JSON.stringify(newStats));
    } catch {}
  }, []);

  const startNewGame = useCallback(() => {
    const game = initializeGame();
    setGameState(game);
    setPendingTiles([]);
    setSelectedTileId(null);
  }, []);

  const selectTile = useCallback((tileId: string | null) => {
    setSelectedTileId(tileId);
  }, []);

  const placeTileOnBoard = useCallback((row: number, col: number) => {
    if (!gameState || !selectedTileId) return;
    if (gameState.currentTurn !== 'player') return;

    if (gameState.board[row][col].tile !== null) return;
    if (pendingTiles.some(t => t.row === row && t.col === col)) return;

    const tile = gameState.playerRack.find(t => t.id === selectedTileId);
    if (!tile) return;

    const placed: PlacedTile = { ...tile, row, col };
    setPendingTiles(prev => [...prev, placed]);
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        playerRack: prev.playerRack.filter(t => t.id !== selectedTileId),
      };
    });
    setSelectedTileId(null);
  }, [gameState, selectedTileId, pendingTiles]);

  const recallTiles = useCallback(() => {
    if (!gameState) return;
    const recalled = pendingTiles.map(({ row, col, ...tile }) => tile as Tile);
    setGameState(prev => {
      if (!prev) return prev;
      return { ...prev, playerRack: [...prev.playerRack, ...recalled] };
    });
    setPendingTiles([]);
    setSelectedTileId(null);
  }, [gameState, pendingTiles]);

  const shuffleRack = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      const shuffled = [...prev.playerRack];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return { ...prev, playerRack: shuffled };
    });
  }, []);

  const getPreviewScore = useCallback((): number => {
    if (!gameState || pendingTiles.length === 0) return 0;
    const validation = validatePlacement(gameState.board, pendingTiles, gameState.isFirstMove);
    if (!validation.valid) return 0;
    return calculateMoveScore(gameState.board, pendingTiles);
  }, [gameState, pendingTiles]);

  const doAiTurn = useCallback((state: GameState) => {
    setTimeout(() => {
      const aiMove = generateAIMove(state.board, state.aiRack, difficulty, state.isFirstMove);

      if (!aiMove) {
        setGameState(prev => {
          if (!prev) return prev;
          const newPasses = prev.consecutivePasses + 1;
          if (newPasses >= 4) {
            const playerDeduction = calculateEndgameDeductions(prev.playerRack);
            const aiDeduction = calculateEndgameDeductions(prev.aiRack);
            const finalPlayerScore = prev.playerScore - playerDeduction;
            const finalAiScore = prev.aiScore - aiDeduction;
            return {
              ...prev,
              currentTurn: 'player',
              consecutivePasses: newPasses,
              gameOver: true,
              playerScore: finalPlayerScore,
              aiScore: finalAiScore,
              winner: finalPlayerScore > finalAiScore ? 'player' : finalAiScore > finalPlayerScore ? 'ai' : 'tie',
              moveHistory: [...prev.moveHistory, { player: 'ai', word: '', score: 0, tiles: [], type: 'pass' }],
            };
          }
          return {
            ...prev,
            currentTurn: 'player',
            consecutivePasses: newPasses,
            moveHistory: [...prev.moveHistory, { player: 'ai', word: '', score: 0, tiles: [], type: 'pass' }],
          };
        });
        return;
      }

      setGameState(prev => {
        if (!prev) return prev;
        const newBoard = prev.board.map(row => row.map(cell => ({ ...cell })));
        for (const t of aiMove) {
          newBoard[t.row][t.col] = { ...newBoard[t.row][t.col], tile: t };
        }

        const score = calculateMoveScore(prev.board, aiMove);
        const words = getFormedWords(prev.board, aiMove);
        const mainWord = words.length > 0 ? words[0].word : '';

        const tilesNeeded = 7 - (prev.aiRack.length - aiMove.length);
        const { drawn, remaining } = drawTiles(prev.tileBag, Math.max(0, tilesNeeded));
        const newRack = prev.aiRack.filter(t => !aiMove.some(at => at.id === t.id));

        const isGameOver = remaining.length === 0 && newRack.length === 0;
        let finalPlayerScore = prev.playerScore;
        let finalAiScore = prev.aiScore + score;

        if (isGameOver) {
          const playerDeduction = calculateEndgameDeductions(prev.playerRack);
          finalPlayerScore -= playerDeduction;
          finalAiScore += playerDeduction;
        }

        return {
          ...prev,
          board: newBoard,
          aiRack: [...newRack, ...drawn],
          tileBag: remaining,
          aiScore: finalAiScore,
          playerScore: finalPlayerScore,
          currentTurn: 'player',
          isFirstMove: false,
          consecutivePasses: 0,
          gameOver: isGameOver,
          winner: isGameOver
            ? (finalPlayerScore > finalAiScore ? 'player' : finalAiScore > finalPlayerScore ? 'ai' : 'tie')
            : null,
          moveHistory: [...prev.moveHistory, {
            player: 'ai', word: mainWord, score, tiles: aiMove, type: 'play',
          }],
        };
      });
    }, 800 + Math.random() * 1200);
  }, [difficulty]);

  const submitMove = useCallback((): { success: boolean; error?: string; score?: number } => {
    if (!gameState || pendingTiles.length === 0) {
      return { success: false, error: 'No tiles placed' };
    }

    const validation = validatePlacement(gameState.board, pendingTiles, gameState.isFirstMove);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const formedWords = getFormedWords(gameState.board, pendingTiles);
    const invalidWords = formedWords.filter(w => !isValidWord(w.word));
    if (invalidWords.length > 0) {
      return { success: false, error: `"${invalidWords[0].word}" is not a valid word` };
    }

    const score = calculateMoveScore(gameState.board, pendingTiles);
    const mainWord = formedWords.length > 0 ? formedWords[0].word : '';

    const newBoard = gameState.board.map(row => row.map(cell => ({ ...cell })));
    for (const t of pendingTiles) {
      newBoard[t.row][t.col] = { ...newBoard[t.row][t.col], tile: t };
    }

    const tilesNeeded = 7 - gameState.playerRack.length;
    const { drawn, remaining } = drawTiles(gameState.tileBag, Math.max(0, tilesNeeded));

    const isGameOver = remaining.length === 0 && gameState.playerRack.length + drawn.length === 0;
    let finalPlayerScore = gameState.playerScore + score;
    let finalAiScore = gameState.aiScore;

    if (isGameOver) {
      const aiDeduction = calculateEndgameDeductions(gameState.aiRack);
      finalAiScore -= aiDeduction;
      finalPlayerScore += aiDeduction;
    }

    const newState: GameState = {
      ...gameState,
      board: newBoard,
      playerRack: [...gameState.playerRack, ...drawn],
      tileBag: remaining,
      playerScore: finalPlayerScore,
      aiScore: finalAiScore,
      currentTurn: 'ai',
      isFirstMove: false,
      consecutivePasses: 0,
      gameOver: isGameOver,
      winner: isGameOver
        ? (finalPlayerScore > finalAiScore ? 'player' : finalAiScore > finalPlayerScore ? 'ai' : 'tie')
        : null,
      moveHistory: [...gameState.moveHistory, {
        player: 'player', word: mainWord, score, tiles: pendingTiles, type: 'play',
      }],
    };

    setGameState(newState);
    setPendingTiles([]);
    setSelectedTileId(null);

    if (score > stats.bestWordScore) {
      saveStats({ ...stats, bestWord: mainWord, bestWordScore: score });
    }

    if (!isGameOver) {
      doAiTurn(newState);
    } else {
      const newStats = { ...stats, gamesPlayed: stats.gamesPlayed + 1 };
      if (finalPlayerScore > finalAiScore) newStats.gamesWon++;
      if (finalPlayerScore > newStats.highScore) newStats.highScore = finalPlayerScore;
      saveStats(newStats);
    }

    return { success: true, score };
  }, [gameState, pendingTiles, stats, saveStats, doAiTurn]);

  const passTurn = useCallback(() => {
    if (!gameState) return;
    recallTiles();

    const newPasses = gameState.consecutivePasses + 1;
    if (newPasses >= 4) {
      const playerDeduction = calculateEndgameDeductions(gameState.playerRack);
      const aiDeduction = calculateEndgameDeductions(gameState.aiRack);
      const finalPlayerScore = gameState.playerScore - playerDeduction;
      const finalAiScore = gameState.aiScore - aiDeduction;
      setGameState(prev => prev ? {
        ...prev,
        consecutivePasses: newPasses,
        gameOver: true,
        playerScore: finalPlayerScore,
        aiScore: finalAiScore,
        winner: finalPlayerScore > finalAiScore ? 'player' : finalAiScore > finalPlayerScore ? 'ai' : 'tie',
        moveHistory: [...prev.moveHistory, { player: 'player', word: '', score: 0, tiles: [], type: 'pass' }],
      } : prev);
      return;
    }

    const newState: GameState = {
      ...gameState,
      currentTurn: 'ai',
      consecutivePasses: newPasses,
      moveHistory: [...gameState.moveHistory, { player: 'player', word: '', score: 0, tiles: [], type: 'pass' }],
    };
    setGameState(newState);
    doAiTurn(newState);
  }, [gameState, recallTiles, doAiTurn]);

  const exchangeTiles = useCallback((tileIds: string[]) => {
    if (!gameState || gameState.tileBag.length < 7) return;
    recallTiles();

    const tilesToExchange = gameState.playerRack.filter(t => tileIds.includes(t.id));
    const remainingRack = gameState.playerRack.filter(t => !tileIds.includes(t.id));
    const { drawn, remaining } = drawTiles(gameState.tileBag, tilesToExchange.length);
    const newBag = [...remaining, ...tilesToExchange];

    for (let i = newBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newBag[i], newBag[j]] = [newBag[j], newBag[i]];
    }

    const newState: GameState = {
      ...gameState,
      playerRack: [...remainingRack, ...drawn],
      tileBag: newBag,
      currentTurn: 'ai',
      consecutivePasses: 0,
      moveHistory: [...gameState.moveHistory, {
        player: 'player', word: '', score: 0, tiles: [], type: 'exchange',
      }],
    };
    setGameState(newState);
    setPendingTiles([]);
    doAiTurn(newState);
  }, [gameState, recallTiles, doAiTurn]);

  const value = useMemo(() => ({
    gameState, pendingTiles, selectedTileId, difficulty,
    startNewGame, setDifficulty, selectTile, placeTileOnBoard,
    recallTiles, shuffleRack, submitMove, passTurn, exchangeTiles,
    getPreviewScore, stats, loadStats,
  }), [
    gameState, pendingTiles, selectedTileId, difficulty,
    startNewGame, selectTile, placeTileOnBoard,
    recallTiles, shuffleRack, submitMove, passTurn, exchangeTiles,
    getPreviewScore, stats, loadStats,
  ]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
