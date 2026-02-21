import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView, TextInput, Alert,
  Dimensions, Platform, Modal, Share,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
  FadeIn, FadeInUp, FadeInDown, SlideInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { PremiumType } from '@/lib/scrabble-engine';
import { getApiUrl } from '@/lib/query-client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_PADDING = 4;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - BOARD_PADDING * 2 - 16) / 15);
const BOARD_SIZE = CELL_SIZE * 15;

const PREMIUM_LABELS: Record<string, string> = {
  none: '', DL: 'DL', TL: 'TL', DW: 'DW', TW: 'TW', CENTER: '',
};
const PREMIUM_COLORS: Record<string, string> = {
  none: Colors.board.grid,
  DL: Colors.premium.doubleLetter,
  TL: Colors.premium.tripleLetter,
  DW: Colors.premium.doubleWord,
  TW: Colors.premium.tripleWord,
  CENTER: Colors.premium.center,
};

interface GameState {
  board: { tile: { letter: string; value: number } | null; premium: string }[][];
  yourRack: { id: string; letter: string; value: number; isBlank: boolean }[];
  yourScore: number;
  opponentScore: number;
  opponentName: string;
  opponentRackCount: number;
  isYourTurn: boolean;
  isFirstMove: boolean;
  tilesLeft: number;
  gameOver: boolean;
  winner: string | null;
  moveHistory: { player: string; word: string; score: number; type: string }[];
  started: boolean;
  playerCount: number;
  yourName: string;
  code: string;
}

interface PendingTile {
  id: string;
  letter: string;
  value: number;
  isBlank: boolean;
  row: number;
  col: number;
}

function BoardCellView({
  premium, tile, isPending, onPress,
}: {
  premium: string;
  tile: { letter: string; value: number } | null;
  isPending: boolean;
  onPress: () => void;
}) {
  const bgColor = tile
    ? (isPending ? Colors.accent.tealLight : Colors.tile.face)
    : (PREMIUM_COLORS[premium] || Colors.board.grid) + (premium === 'none' ? '' : '30');

  const borderColor = isPending
    ? Colors.accent.teal
    : tile ? Colors.tile.border
      : (PREMIUM_COLORS[premium] || Colors.board.grid) + '50';

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.cell,
        {
          width: CELL_SIZE, height: CELL_SIZE,
          backgroundColor: bgColor, borderColor,
          borderWidth: tile || premium !== 'none' ? 1 : 0.5,
        },
      ]}
    >
      {tile ? (
        <>
          <Text style={[styles.cellLetter, { fontSize: CELL_SIZE > 22 ? 12 : 9, color: isPending ? '#FFF' : Colors.tile.letter }]}>
            {tile.letter}
          </Text>
          {tile.value > 0 && CELL_SIZE > 18 && (
            <Text style={[styles.cellScore, { fontSize: CELL_SIZE > 22 ? 6 : 5, color: isPending ? '#DDD' : Colors.tile.score }]}>
              {tile.value}
            </Text>
          )}
        </>
      ) : premium !== 'none' ? (
        <Text style={[styles.premiumLabel, { fontSize: CELL_SIZE > 22 ? 7 : 5, color: PREMIUM_COLORS[premium] || Colors.board.grid }]}>
          {premium === 'CENTER' ? '\u2605' : PREMIUM_LABELS[premium] || ''}
        </Text>
      ) : null}
    </Pressable>
  );
}

function RackTile({ letter, value, isSelected, onPress }: {
  letter: string; value: number; isSelected: boolean; onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: isSelected ? -8 : 0 }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          scale.value = withSpring(0.9, {}, () => { scale.value = withSpring(1); });
          onPress();
        }}
        style={[styles.rackTile, isSelected && styles.rackTileSelected]}
      >
        <Text style={styles.rackTileLetter}>{letter || '?'}</Text>
        <Text style={styles.rackTileScore}>{value}</Text>
      </Pressable>
    </Animated.View>
  );
}

type ScreenMode = 'lobby' | 'game';

export default function MultiplayerScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const [mode, setMode] = useState<ScreenMode>('lobby');
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [pendingTiles, setPendingTiles] = useState<PendingTile[]>([]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [lastMoveMsg, setLastMoveMsg] = useState('');
  const [showGameOver, setShowGameOver] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const playerIdRef = useRef<string>('');

  const connectWs = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return wsRef.current;

    const apiUrl = getApiUrl();
    const wsUrl = apiUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
       console.log("WS message:", event.data);   // 👈 ADD THIS
      let msg: any;
      try { msg = JSON.parse(event.data as string); } catch { return; }

      switch (msg.type) {
        case 'room_created':
          console.log("ROOM CREATED:", msg);   // 👈 ADD THIS
          setRoomCode(msg.code);
          playerIdRef.current = msg.playerId;
          setMode('game');
          setConnecting(false);
          break;
        case 'room_joined':
          setRoomCode(msg.code);
          playerIdRef.current = msg.playerId;
          setMode('game');
          setConnecting(false);
          break;
        case 'reconnected':
          playerIdRef.current = msg.playerId;
          setConnecting(false);
          break;
        case 'game_state':
          setGameState(msg as GameState);
          if (msg.gameOver && !showGameOver) {
            setTimeout(() => setShowGameOver(true), 500);
          }
          break;
        case 'game_started':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setOpponentDisconnected(false);
          break;
        case 'move_made':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          if (msg.word) {
            setLastMoveMsg(`${msg.player}: ${msg.word} (+${msg.score})`);
            setTimeout(() => setLastMoveMsg(''), 3000);
          }
          break;
        case 'move_rejected':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(msg.error || 'Invalid move');
          setTimeout(() => setError(''), 3000);
          break;
        case 'opponent_disconnected':
          setOpponentDisconnected(true);
          break;
        case 'error':
          setError(msg.message || 'An error occurred');
          setConnecting(false);
          setTimeout(() => setError(''), 3000);
          break;
      }
    };

    ws.onerror = () => {
      setError('Connection error');
      setConnecting(false);
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return ws;
  }, [showGameOver]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      setError('Enter your name first');
      setTimeout(() => setError(''), 2000);
      return;
    }
    setConnecting(true);
    const ws = connectWs();
    const send = () => ws?.send(JSON.stringify({ type: 'create_room', name: playerName.trim() }));
    if (ws?.readyState === WebSocket.OPEN) {
      send();
    } else {
      ws!.onopen = send;
    }
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      setError('Enter your name first');
      setTimeout(() => setError(''), 2000);
      return;
    }
    if (!joinCode.trim() || joinCode.trim().length < 6) {
      setError('Enter a valid 6-character code');
      setTimeout(() => setError(''), 2000);
      return;
    }
    setConnecting(true);
    const ws = connectWs();
    const send = () => ws?.send(JSON.stringify({ type: 'join_room', code: joinCode.trim().toUpperCase(), name: playerName.trim() }));
    if (ws?.readyState === WebSocket.OPEN) {
      send();
    } else {
      ws!.onopen = send;
    }
  };

  const handleShareCode = async () => {
    try {
      await Share.share({ message: `Join my WordCraft game! Code: ${roomCode}` });
    } catch {}
  };

  const placeTileOnBoard = (row: number, col: number) => {
    if (!gameState || !selectedTileId || !gameState.isYourTurn) return;
    if (gameState.board[row][col].tile !== null) return;
    if (pendingTiles.some(t => t.row === row && t.col === col)) return;

    const tile = gameState.yourRack.find(t => t.id === selectedTileId);
    if (!tile) return;
    if (pendingTiles.some(t => t.id === tile.id)) return;

    setPendingTiles(prev => [...prev, { ...tile, row, col }]);
    setSelectedTileId(null);
  };

  const recallTiles = () => {
    setPendingTiles([]);
    setSelectedTileId(null);
  };

  const shuffleRack = () => {
    if (!gameState) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const submitMove = () => {
    if (!wsRef.current || pendingTiles.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    wsRef.current.send(JSON.stringify({
      type: 'place_tiles',
      tiles: pendingTiles.map(t => ({
        id: t.id, letter: t.letter, value: t.value, isBlank: t.isBlank,
        row: t.row, col: t.col,
      })),
    }));

    setPendingTiles([]);
    setSelectedTileId(null);
  };

  const passTurn = () => {
    Alert.alert('Pass Turn', 'Are you sure you want to pass?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Pass', onPress: () => {
          if (wsRef.current) {
            recallTiles();
            wsRef.current.send(JSON.stringify({ type: 'pass_turn' }));
          }
        }
      },
    ]);
  };

  if (mode === 'lobby') {
    return (
      <View style={[styles.container, { paddingTop: (insets.top || webTopInset) + 16 }]}>
        <View style={styles.lobbyContainer}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={Colors.ui.text} />
          </Pressable>

          <Animated.View entering={FadeInUp.springify()} style={styles.lobbyContent}>
            <View style={styles.lobbyHeader}>
              <Feather name="users" size={32} color={Colors.accent.teal} />
              <Text style={styles.lobbyTitle}>Play with Friends</Text>
              <Text style={styles.lobbySubtitle}>Create or join a private game room</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Your Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your name..."
                placeholderTextColor={Colors.ui.textMuted}
                value={playerName}
                onChangeText={setPlayerName}
                maxLength={20}
                autoCapitalize="words"
              />
            </View>

            <Pressable
              onPress={handleCreateRoom}
              style={[styles.createButton, connecting && { opacity: 0.6 }]}
              disabled={connecting}
            >
              <Feather name="plus-circle" size={20} color="#FFF" />
              <Text style={styles.createButtonText}>
                {connecting ? 'Creating...' : 'Create Game Room'}
              </Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or join a game</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.joinRow}>
              <TextInput
                style={styles.codeInput}
                placeholder="ROOM CODE"
                placeholderTextColor={Colors.ui.textMuted}
                value={joinCode}
                onChangeText={(t) => setJoinCode(t.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Pressable
                onPress={handleJoinRoom}
                style={[styles.joinButton, connecting && { opacity: 0.6 }]}
                disabled={connecting}
              >
                <Feather name="log-in" size={20} color="#FFF" />
              </Pressable>
            </View>

            {error ? (
              <Animated.View entering={FadeIn} style={styles.lobbyError}>
                <Feather name="alert-circle" size={14} color={Colors.accent.error} />
                <Text style={styles.lobbyErrorText}>{error}</Text>
              </Animated.View>
            ) : null}
          </Animated.View>
        </View>
      </View>
    );
  }

  if (!gameState) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: (insets.top || webTopInset) + 16 }]}>
        <Text style={styles.loadingText}>Connecting...</Text>
      </View>
    );
  }

  if (!gameState.started) {
    return (
      <View style={[styles.container, { paddingTop: (insets.top || webTopInset) + 16 }]}>
        <View style={styles.lobbyContainer}>
          <Pressable onPress={() => { router.back(); wsRef.current?.close(); }} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={Colors.ui.text} />
          </Pressable>

          <View style={styles.waitingContent}>
            <Animated.View entering={FadeInDown.springify()} style={styles.waitingCard}>
              <Feather name="clock" size={40} color={Colors.accent.gold} />
              <Text style={styles.waitingTitle}>Waiting for Opponent</Text>
              <Text style={styles.waitingSubtitle}>Share this code with a friend</Text>

              <View style={styles.codeDisplay}>
                <Text style={styles.codeDisplayText}>{roomCode}</Text>
              </View>

              <Pressable onPress={handleShareCode} style={styles.shareButton}>
                <Feather name="share-2" size={18} color={Colors.accent.teal} />
                <Text style={styles.shareButtonText}>Share Code</Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </View>
    );
  }

  const rackMinusPending = gameState.yourRack.filter(t => !pendingTiles.some(pt => pt.id === t.id));

  return (
    <View style={[styles.container, { paddingTop: (insets.top || webTopInset) + 4 }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => { Alert.alert('Leave Game', 'Are you sure?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => { wsRef.current?.close(); router.back(); } },
        ]); }} style={styles.topBarButton}>
          <Feather name="arrow-left" size={20} color={Colors.ui.text} />
        </Pressable>

        <View style={styles.scoreBoard}>
          <View style={[styles.scoreItem, gameState.isYourTurn && styles.scoreItemActive]}>
            <Text style={styles.scoreLabel}>{gameState.yourName || 'YOU'}</Text>
            <Text style={styles.scoreValue}>{gameState.yourScore}</Text>
          </View>
          <View style={styles.scoreDivider}>
            <Text style={styles.scoreDividerText}>vs</Text>
          </View>
          <View style={[styles.scoreItem, !gameState.isYourTurn && styles.scoreItemActive]}>
            <Text style={styles.scoreLabel}>{gameState.opponentName}</Text>
            <Text style={styles.scoreValue}>{gameState.opponentScore}</Text>
          </View>
        </View>

        <View style={styles.bagCount}>
          <Feather name="package" size={14} color={Colors.ui.textMuted} />
          <Text style={styles.bagCountText}>{gameState.tilesLeft}</Text>
        </View>
      </View>

      {!gameState.isYourTurn && !gameState.gameOver && (
        <View style={styles.waitingBanner}>
          <Text style={styles.waitingBannerText}>
            {opponentDisconnected ? 'Opponent disconnected...' : `${gameState.opponentName}'s turn...`}
          </Text>
        </View>
      )}

      {gameState.isYourTurn && !gameState.gameOver && (
        <View style={styles.yourTurnBanner}>
          <Text style={styles.yourTurnText}>Your turn</Text>
        </View>
      )}

      {lastMoveMsg ? (
        <Animated.View entering={FadeIn} style={styles.moveBanner}>
          <Feather name="zap" size={14} color={Colors.accent.gold} />
          <Text style={styles.moveBannerText}>{lastMoveMsg}</Text>
        </Animated.View>
      ) : null}

      {error ? (
        <Animated.View entering={FadeIn} style={styles.errorBanner}>
          <Feather name="alert-circle" size={14} color={Colors.accent.error} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </Animated.View>
      ) : null}

      <ScrollView
        style={styles.boardScroll}
        contentContainerStyle={styles.boardScrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.board, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
          {gameState.board.map((row, r) =>
            row.map((cell, c) => {
              const pending = pendingTiles.find(t => t.row === r && t.col === c);
              const tile = pending ? { letter: pending.letter, value: pending.value } : cell.tile;
              return (
                <BoardCellView
                  key={`${r}-${c}`}
                  premium={cell.premium}
                  tile={tile}
                  isPending={!!pending}
                  onPress={() => placeTileOnBoard(r, c)}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      <View style={[styles.rackArea, { paddingBottom: (insets.bottom || webBottomInset) + 8 }]}>
        <View style={styles.rackContainer}>
          {rackMinusPending.map(tile => (
            <RackTile
              key={tile.id}
              letter={tile.letter}
              value={tile.value}
              isSelected={selectedTileId === tile.id}
              onPress={() => setSelectedTileId(selectedTileId === tile.id ? null : tile.id)}
            />
          ))}
        </View>

        <View style={styles.actionBar}>
          <Pressable onPress={shuffleRack} style={styles.actionButton}>
            <Feather name="shuffle" size={18} color={Colors.ui.textSecondary} />
          </Pressable>

          <Pressable
            onPress={recallTiles}
            style={styles.actionButton}
            disabled={pendingTiles.length === 0}
          >
            <Feather name="rotate-ccw" size={18} color={pendingTiles.length > 0 ? Colors.accent.warning : Colors.ui.textMuted} />
          </Pressable>

          <Pressable
            onPress={submitMove}
            style={[styles.submitButton, (pendingTiles.length === 0 || !gameState.isYourTurn) && styles.submitButtonDisabled]}
            disabled={pendingTiles.length === 0 || !gameState.isYourTurn}
          >
            <Feather name="check" size={20} color="#FFF" />
          </Pressable>

          <Pressable
            onPress={passTurn}
            style={styles.actionButton}
            disabled={!gameState.isYourTurn}
          >
            <Feather name="skip-forward" size={18} color={gameState.isYourTurn ? Colors.ui.textSecondary : Colors.ui.textMuted} />
          </Pressable>
        </View>
      </View>

      <Modal visible={showGameOver && !!gameState.gameOver} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View entering={SlideInDown.springify()} style={styles.gameOverModal}>
            <Text style={styles.gameOverTitle}>
              {gameState.winner === gameState.yourName ? 'You Win!' : gameState.winner === 'Tie' ? 'Tie Game' : `${gameState.winner} Wins`}
            </Text>

            <View style={styles.finalScores}>
              <View style={styles.finalScoreItem}>
                <Text style={styles.finalScoreLabel}>{gameState.yourName}</Text>
                <Text style={[styles.finalScoreValue, gameState.winner === gameState.yourName && { color: Colors.accent.success }]}>
                  {gameState.yourScore}
                </Text>
              </View>
              <Text style={styles.finalScoreDash}>-</Text>
              <View style={styles.finalScoreItem}>
                <Text style={styles.finalScoreLabel}>{gameState.opponentName}</Text>
                <Text style={[styles.finalScoreValue, gameState.winner === gameState.opponentName && { color: Colors.accent.success }]}>
                  {gameState.opponentScore}
                </Text>
              </View>
            </View>

            <View style={styles.gameOverActions}>
              <Pressable
                onPress={() => { setShowGameOver(false); wsRef.current?.close(); setMode('lobby'); setGameState(null); setPendingTiles([]); }}
                style={styles.gameOverButton}
              >
                <Feather name="refresh-cw" size={18} color={Colors.accent.teal} />
                <Text style={styles.gameOverButtonText}>New Game</Text>
              </Pressable>
              <Pressable
                onPress={() => { setShowGameOver(false); wsRef.current?.close(); router.back(); }}
                style={styles.gameOverButtonSecondary}
              >
                <Feather name="home" size={18} color={Colors.ui.textSecondary} />
                <Text style={styles.gameOverButtonTextSecondary}>Home</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.ui.background },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: 'Inter_500Medium', fontSize: 16, color: Colors.ui.textSecondary },
  lobbyContainer: { flex: 1, paddingHorizontal: 24 },
  backButton: { width: 44, height: 44, justifyContent: 'center' },
  lobbyContent: { flex: 1, justifyContent: 'center', gap: 20, paddingBottom: 60 },
  lobbyHeader: { alignItems: 'center', gap: 8, marginBottom: 8 },
  lobbyTitle: { fontFamily: 'Inter_700Bold', fontSize: 28, color: Colors.ui.text },
  lobbySubtitle: { fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.ui.textSecondary },
  inputGroup: { gap: 6 },
  inputLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.ui.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  textInput: {
    backgroundColor: Colors.ui.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: 'Inter_500Medium', fontSize: 16, color: Colors.ui.text,
    borderWidth: 1, borderColor: Colors.ui.cardBorder,
  },
  createButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.accent.teal, borderRadius: 16, paddingVertical: 18, gap: 10,
  },
  createButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#FFF' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.ui.cardBorder },
  dividerText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.ui.textMuted },
  joinRow: { flexDirection: 'row', gap: 10 },
  codeInput: {
    flex: 1, backgroundColor: Colors.ui.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.ui.text, letterSpacing: 4, textAlign: 'center',
    borderWidth: 1, borderColor: Colors.ui.cardBorder,
  },
  joinButton: {
    width: 54, borderRadius: 14, backgroundColor: Colors.accent.gold,
    justifyContent: 'center', alignItems: 'center',
  },
  lobbyError: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.accent.error + '15', borderRadius: 12, padding: 12,
  },
  lobbyErrorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.accent.error },
  waitingContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  waitingCard: {
    alignItems: 'center', gap: 16,
    backgroundColor: Colors.ui.surface, borderRadius: 24, padding: 32,
    borderWidth: 1, borderColor: Colors.ui.cardBorder, width: '100%',
  },
  waitingTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, color: Colors.ui.text },
  waitingSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.ui.textSecondary },
  codeDisplay: {
    backgroundColor: Colors.ui.surfaceElevated, borderRadius: 16, paddingVertical: 20, paddingHorizontal: 40,
    borderWidth: 2, borderColor: Colors.accent.teal + '40', borderStyle: 'dashed',
  },
  codeDisplayText: { fontFamily: 'Inter_700Bold', fontSize: 32, color: Colors.accent.teal, letterSpacing: 6 },
  shareButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.accent.teal + '15', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24,
    borderWidth: 1, borderColor: Colors.accent.teal + '30',
  },
  shareButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.accent.teal },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  topBarButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scoreBoard: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  scoreItem: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  scoreItemActive: { backgroundColor: Colors.accent.teal + '20' },
  scoreLabel: { fontFamily: 'Inter_500Medium', fontSize: 9, color: Colors.ui.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  scoreValue: { fontFamily: 'Inter_700Bold', fontSize: 22, color: Colors.ui.text },
  scoreDivider: { paddingHorizontal: 4 },
  scoreDividerText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.ui.textMuted },
  bagCount: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 8 },
  bagCountText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.ui.textMuted },
  waitingBanner: { backgroundColor: Colors.accent.gold + '20', paddingVertical: 6, alignItems: 'center' },
  waitingBannerText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.accent.gold },
  yourTurnBanner: { backgroundColor: Colors.accent.teal + '20', paddingVertical: 6, alignItems: 'center' },
  yourTurnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.accent.teal },
  moveBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.accent.gold + '15', paddingVertical: 6, paddingHorizontal: 16,
  },
  moveBannerText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.accent.gold },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.accent.error + '15', paddingVertical: 8, paddingHorizontal: 16,
  },
  errorBannerText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.accent.error },
  boardScroll: { flex: 1 },
  boardScrollContent: { alignItems: 'center', paddingVertical: 4 },
  board: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: Colors.board.gridLine, borderRadius: 4, overflow: 'hidden' },
  cell: { justifyContent: 'center', alignItems: 'center', borderColor: Colors.board.gridLine },
  cellLetter: { fontFamily: 'Inter_700Bold' },
  cellScore: { fontFamily: 'Inter_500Medium', position: 'absolute', bottom: 1, right: 2 },
  premiumLabel: { fontFamily: 'Inter_700Bold', textAlign: 'center' },
  rackArea: {
    backgroundColor: Colors.board.surface, borderTopWidth: 1, borderTopColor: Colors.ui.cardBorder,
    paddingTop: 12, paddingHorizontal: 12,
  },
  rackContainer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 10 },
  rackTile: {
    width: 42, height: 46, backgroundColor: Colors.tile.face, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.tile.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3,
  },
  rackTileSelected: {
    borderColor: Colors.accent.teal, backgroundColor: Colors.accent.teal + '15',
    shadowColor: Colors.accent.teal, shadowOpacity: 0.3,
  },
  rackTileLetter: { fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.tile.letter },
  rackTileScore: { fontFamily: 'Inter_500Medium', fontSize: 8, color: Colors.tile.score, position: 'absolute', bottom: 3, right: 5 },
  actionBar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16 },
  actionButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.ui.surfaceElevated,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.ui.cardBorder,
  },
  submitButton: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accent.teal,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.accent.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  submitButtonDisabled: { backgroundColor: Colors.ui.surfaceElevated, shadowOpacity: 0 },
  modalOverlay: { flex: 1, backgroundColor: Colors.ui.overlay, justifyContent: 'center', alignItems: 'center', padding: 32 },
  gameOverModal: {
    backgroundColor: Colors.ui.surface, borderRadius: 24, padding: 32, width: '100%', maxWidth: 360,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.ui.cardBorder,
  },
  gameOverTitle: { fontFamily: 'Inter_700Bold', fontSize: 28, color: Colors.ui.text, marginBottom: 24 },
  finalScores: { flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 32 },
  finalScoreItem: { alignItems: 'center' },
  finalScoreLabel: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.ui.textSecondary, marginBottom: 4 },
  finalScoreValue: { fontFamily: 'Inter_700Bold', fontSize: 36, color: Colors.ui.text },
  finalScoreDash: { fontFamily: 'Inter_400Regular', fontSize: 24, color: Colors.ui.textMuted },
  gameOverActions: { gap: 12, width: '100%' },
  gameOverButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.accent.teal + '15', borderRadius: 14, paddingVertical: 16, gap: 10,
    borderWidth: 1, borderColor: Colors.accent.teal + '30',
  },
  gameOverButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.accent.teal },
  gameOverButtonSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 10 },
  gameOverButtonTextSecondary: { fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.ui.textSecondary },
});
