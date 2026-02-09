import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView, Alert,
  Dimensions, Platform, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  FadeIn, FadeInUp, SlideInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useGame } from '@/lib/game-context';
import { PremiumType, getRemainingTileCount } from '@/lib/scrabble-engine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_PADDING = 4;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - BOARD_PADDING * 2 - 16) / 15);
const BOARD_SIZE = CELL_SIZE * 15;

const PREMIUM_LABELS: Record<PremiumType, string> = {
  none: '',
  DL: 'DL',
  TL: 'TL',
  DW: 'DW',
  TW: 'TW',
  CENTER: '',
};

const PREMIUM_COLORS: Record<PremiumType, string> = {
  none: Colors.board.grid,
  DL: Colors.premium.doubleLetter,
  TL: Colors.premium.tripleLetter,
  DW: Colors.premium.doubleWord,
  TW: Colors.premium.tripleWord,
  CENTER: Colors.premium.center,
};

function BoardCellView({
  row, col, premium, tile, isPending, isSelected, onPress,
}: {
  row: number; col: number; premium: PremiumType;
  tile: { letter: string; value: number } | null;
  isPending: boolean; isSelected: boolean;
  onPress: () => void;
}) {
  const bgColor = tile
    ? (isPending ? Colors.accent.tealLight : Colors.tile.face)
    : PREMIUM_COLORS[premium] + (premium === 'none' ? '' : '30');

  const borderColor = isPending
    ? Colors.accent.teal
    : tile
      ? Colors.tile.border
      : PREMIUM_COLORS[premium] + '50';

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.cell,
        {
          width: CELL_SIZE,
          height: CELL_SIZE,
          backgroundColor: bgColor,
          borderColor,
          borderWidth: tile || premium !== 'none' ? 1 : 0.5,
        },
        isSelected && styles.cellSelected,
      ]}
    >
      {tile ? (
        <>
          <Text style={[
            styles.cellLetter,
            { fontSize: CELL_SIZE > 22 ? 12 : 9, color: isPending ? '#FFF' : Colors.tile.letter },
          ]}>
            {tile.letter}
          </Text>
          {tile.value > 0 && CELL_SIZE > 18 && (
            <Text style={[
              styles.cellScore,
              { fontSize: CELL_SIZE > 22 ? 6 : 5, color: isPending ? '#DDD' : Colors.tile.score },
            ]}>
              {tile.value}
            </Text>
          )}
        </>
      ) : premium !== 'none' ? (
        <Text style={[
          styles.premiumLabel,
          { fontSize: CELL_SIZE > 22 ? 7 : 5, color: PREMIUM_COLORS[premium] },
        ]}>
          {premium === 'CENTER' ? '\u2605' : PREMIUM_LABELS[premium]}
        </Text>
      ) : null}
    </Pressable>
  );
}

function RackTile({
  letter, value, isSelected, onPress,
}: {
  letter: string; value: number; isSelected: boolean; onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: isSelected ? -8 : 0 }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.9, {}, () => { scale.value = withSpring(1); });
    onPress();
  };

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.rackTile,
          isSelected && styles.rackTileSelected,
        ]}
      >
        <Text style={styles.rackTileLetter}>{letter || '?'}</Text>
        <Text style={styles.rackTileScore}>{value}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  const {
    gameState, pendingTiles, selectedTileId, difficulty,
    startNewGame, setDifficulty, selectTile, placeTileOnBoard,
    recallTiles, shuffleRack, submitMove, passTurn,
    getPreviewScore,
  } = useGame();

  const [showSetup, setShowSetup] = useState(true);
  const [showGameOver, setShowGameOver] = useState(false);
  const [lastError, setLastError] = useState('');
  const [scorePopup, setScorePopup] = useState<{ score: number; visible: boolean }>({ score: 0, visible: false });

  useEffect(() => {
    if (gameState?.gameOver && !showGameOver) {
      setShowGameOver(true);
    }
  }, [gameState?.gameOver]);

  const handleStartGame = () => {
    startNewGame();
    setShowSetup(false);
    setShowGameOver(false);
  };

  const handleCellPress = (row: number, col: number) => {
    if (!gameState || gameState.currentTurn !== 'player') return;
    if (selectedTileId) {
      placeTileOnBoard(row, col);
    }
  };

  const handleSubmit = () => {
    const result = submitMove();
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLastError('');
      setScorePopup({ score: result.score || 0, visible: true });
      setTimeout(() => setScorePopup(prev => ({ ...prev, visible: false })), 2000);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLastError(result.error || 'Invalid move');
    }
  };

  const handlePass = () => {
    Alert.alert('Pass Turn', 'Are you sure you want to pass?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Pass', onPress: () => { passTurn(); setLastError(''); } },
    ]);
  };

  const previewScore = getPreviewScore();
  const isPlayerTurn = gameState?.currentTurn === 'player';
  const tilesLeft = gameState ? getRemainingTileCount(gameState.tileBag) : 0;

  if (showSetup) {
    return (
      <View style={[styles.container, { paddingTop: (insets.top || webTopInset) + 16 }]}>
        <View style={styles.setupContainer}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={Colors.ui.text} />
          </Pressable>

          <Animated.View entering={FadeInUp.springify()} style={styles.setupContent}>
            <Text style={styles.setupTitle}>New Game</Text>
            <Text style={styles.setupSubtitle}>Choose your difficulty</Text>

            <View style={styles.difficultyContainer}>
              {(['easy', 'medium', 'hard'] as const).map((d) => (
                <Pressable
                  key={d}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDifficulty(d);
                  }}
                  style={[
                    styles.difficultyOption,
                    difficulty === d && styles.difficultySelected,
                  ]}
                >
                  <Feather
                    name={d === 'easy' ? 'smile' : d === 'medium' ? 'trending-up' : 'zap'}
                    size={24}
                    color={difficulty === d ? Colors.accent.teal : Colors.ui.textSecondary}
                  />
                  <Text style={[
                    styles.difficultyLabel,
                    difficulty === d && styles.difficultyLabelActive,
                  ]}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </Text>
                  <Text style={styles.difficultyDesc}>
                    {d === 'easy' ? 'Relaxed play' : d === 'medium' ? 'Balanced' : 'Expert AI'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={handleStartGame} style={styles.startButton}>
              <Feather name="play" size={20} color="#FFF" />
              <Text style={styles.startButtonText}>Start Game</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    );
  }

  if (!gameState) return null;

  return (
    <View style={[styles.container, { paddingTop: (insets.top || webTopInset) + 4 }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.topBarButton}>
          <Feather name="arrow-left" size={20} color={Colors.ui.text} />
        </Pressable>

        <View style={styles.scoreBoard}>
          <View style={[styles.scoreItem, isPlayerTurn && styles.scoreItemActive]}>
            <Text style={styles.scoreLabel}>YOU</Text>
            <Text style={styles.scoreValue}>{gameState.playerScore}</Text>
          </View>
          <View style={styles.scoreDivider}>
            <Text style={styles.scoreDividerText}>vs</Text>
          </View>
          <View style={[styles.scoreItem, !isPlayerTurn && styles.scoreItemActive]}>
            <Text style={styles.scoreLabel}>AI</Text>
            <Text style={styles.scoreValue}>{gameState.aiScore}</Text>
          </View>
        </View>

        <View style={styles.bagCount}>
          <Feather name="package" size={14} color={Colors.ui.textMuted} />
          <Text style={styles.bagCountText}>{tilesLeft}</Text>
        </View>
      </View>

      {!isPlayerTurn && !gameState.gameOver && (
        <Animated.View entering={FadeIn} style={styles.thinkingBanner}>
          <Text style={styles.thinkingText}>AI is thinking...</Text>
        </Animated.View>
      )}

      {lastError ? (
        <Animated.View entering={FadeIn} style={styles.errorBanner}>
          <Feather name="alert-circle" size={14} color={Colors.accent.error} />
          <Text style={styles.errorText}>{lastError}</Text>
          <Pressable onPress={() => setLastError('')}>
            <Feather name="x" size={14} color={Colors.accent.error} />
          </Pressable>
        </Animated.View>
      ) : null}

      <ScrollView
        style={styles.boardScroll}
        contentContainerStyle={styles.boardScrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
        maximumZoomScale={2}
        minimumZoomScale={1}
      >
        <View style={[styles.board, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
          {gameState.board.map((row, r) =>
            row.map((cell, c) => {
              const pending = pendingTiles.find(t => t.row === r && t.col === c);
              const tile = pending || cell.tile;
              return (
                <BoardCellView
                  key={`${r}-${c}`}
                  row={r}
                  col={c}
                  premium={cell.premium}
                  tile={tile ? { letter: tile.letter, value: tile.value } : null}
                  isPending={!!pending}
                  isSelected={false}
                  onPress={() => handleCellPress(r, c)}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      {previewScore > 0 && (
        <Animated.View entering={FadeIn} style={styles.previewScore}>
          <Text style={styles.previewScoreText}>+{previewScore}</Text>
        </Animated.View>
      )}

      {scorePopup.visible && (
        <Animated.View entering={FadeIn} style={styles.scorePopup}>
          <Text style={styles.scorePopupText}>+{scorePopup.score}</Text>
        </Animated.View>
      )}

      <View style={[styles.rackArea, { paddingBottom: (insets.bottom || webBottomInset) + 8 }]}>
        <View style={styles.rackContainer}>
          {gameState.playerRack.map(tile => (
            <RackTile
              key={tile.id}
              letter={tile.letter}
              value={tile.value}
              isSelected={selectedTileId === tile.id}
              onPress={() => selectTile(selectedTileId === tile.id ? null : tile.id)}
            />
          ))}
        </View>

        <View style={styles.actionBar}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); shuffleRack(); }}
            style={styles.actionButton}
          >
            <Feather name="shuffle" size={18} color={Colors.ui.textSecondary} />
          </Pressable>

          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); recallTiles(); }}
            style={styles.actionButton}
            disabled={pendingTiles.length === 0}
          >
            <Feather name="rotate-ccw" size={18} color={pendingTiles.length > 0 ? Colors.accent.warning : Colors.ui.textMuted} />
          </Pressable>

          <Pressable
            onPress={handleSubmit}
            style={[styles.submitButton, pendingTiles.length === 0 && styles.submitButtonDisabled]}
            disabled={pendingTiles.length === 0 || !isPlayerTurn}
          >
            <Feather name="check" size={20} color="#FFF" />
          </Pressable>

          <Pressable
            onPress={handlePass}
            style={styles.actionButton}
            disabled={!isPlayerTurn}
          >
            <Feather name="skip-forward" size={18} color={isPlayerTurn ? Colors.ui.textSecondary : Colors.ui.textMuted} />
          </Pressable>
        </View>
      </View>

      <Modal visible={showGameOver} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View entering={SlideInDown.springify()} style={styles.gameOverModal}>
            <Text style={styles.gameOverTitle}>
              {gameState.winner === 'player' ? 'You Win!' : gameState.winner === 'ai' ? 'AI Wins' : 'Tie Game'}
            </Text>

            <View style={styles.finalScores}>
              <View style={styles.finalScoreItem}>
                <Text style={styles.finalScoreLabel}>You</Text>
                <Text style={[
                  styles.finalScoreValue,
                  gameState.winner === 'player' && { color: Colors.accent.success },
                ]}>
                  {gameState.playerScore}
                </Text>
              </View>
              <Text style={styles.finalScoreDash}>-</Text>
              <View style={styles.finalScoreItem}>
                <Text style={styles.finalScoreLabel}>AI</Text>
                <Text style={[
                  styles.finalScoreValue,
                  gameState.winner === 'ai' && { color: Colors.accent.success },
                ]}>
                  {gameState.aiScore}
                </Text>
              </View>
            </View>

            <View style={styles.gameOverActions}>
              <Pressable
                onPress={() => { setShowGameOver(false); setShowSetup(true); }}
                style={styles.gameOverButton}
              >
                <Feather name="refresh-cw" size={18} color={Colors.accent.teal} />
                <Text style={styles.gameOverButtonText}>New Game</Text>
              </Pressable>
              <Pressable
                onPress={() => { setShowGameOver(false); router.back(); }}
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
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  setupContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  setupContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
    paddingBottom: 60,
  },
  setupTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    color: Colors.ui.text,
    textAlign: 'center',
  },
  setupSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Colors.ui.textSecondary,
    textAlign: 'center',
    marginTop: -12,
  },
  difficultyContainer: {
    gap: 12,
  },
  difficultyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: Colors.ui.cardBorder,
    gap: 14,
  },
  difficultySelected: {
    borderColor: Colors.accent.teal,
    backgroundColor: Colors.accent.teal + '10',
  },
  difficultyLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.ui.textSecondary,
    flex: 1,
  },
  difficultyLabelActive: {
    color: Colors.ui.text,
  },
  difficultyDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.ui.textMuted,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent.teal,
    borderRadius: 16,
    paddingVertical: 18,
    gap: 10,
    marginTop: 8,
  },
  startButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: '#FFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  topBarButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBoard: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  scoreItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 10,
  },
  scoreItemActive: {
    backgroundColor: Colors.accent.teal + '20',
  },
  scoreLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: Colors.ui.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  scoreValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.ui.text,
  },
  scoreDivider: {
    paddingHorizontal: 4,
  },
  scoreDividerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.ui.textMuted,
  },
  bagCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 8,
  },
  bagCountText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.ui.textMuted,
  },
  thinkingBanner: {
    backgroundColor: Colors.accent.gold + '20',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  thinkingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.accent.gold,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent.error + '15',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.accent.error,
    flex: 1,
  },
  boardScroll: {
    flex: 1,
  },
  boardScrollContent: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.board.gridLine,
    borderRadius: 4,
    overflow: 'hidden',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: Colors.board.gridLine,
  },
  cellSelected: {
    borderColor: Colors.accent.teal,
    borderWidth: 2,
  },
  cellLetter: {
    fontFamily: 'Inter_700Bold',
  },
  cellScore: {
    fontFamily: 'Inter_500Medium',
    position: 'absolute',
    bottom: 1,
    right: 2,
  },
  premiumLabel: {
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  previewScore: {
    position: 'absolute',
    right: 16,
    top: '45%',
    backgroundColor: Colors.accent.teal,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  previewScoreText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFF',
  },
  scorePopup: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    backgroundColor: Colors.accent.success,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  scorePopupText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#FFF',
  },
  rackArea: {
    backgroundColor: Colors.board.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.ui.cardBorder,
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  rackContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
  },
  rackTile: {
    width: 42,
    height: 46,
    backgroundColor: Colors.tile.face,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.tile.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  rackTileSelected: {
    borderColor: Colors.accent.teal,
    backgroundColor: Colors.accent.teal + '15',
    shadowColor: Colors.accent.teal,
    shadowOpacity: 0.3,
  },
  rackTileLetter: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: Colors.tile.letter,
  },
  rackTileScore: {
    fontFamily: 'Inter_500Medium',
    fontSize: 8,
    color: Colors.tile.score,
    position: 'absolute',
    bottom: 3,
    right: 5,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.ui.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.ui.cardBorder,
  },
  submitButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent.teal,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.accent.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.ui.surfaceElevated,
    shadowOpacity: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.ui.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  gameOverModal: {
    backgroundColor: Colors.ui.surface,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.ui.cardBorder,
  },
  gameOverTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: Colors.ui.text,
    marginBottom: 24,
  },
  finalScores: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 32,
  },
  finalScoreItem: {
    alignItems: 'center',
  },
  finalScoreLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.ui.textSecondary,
    marginBottom: 4,
  },
  finalScoreValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 36,
    color: Colors.ui.text,
  },
  finalScoreDash: {
    fontFamily: 'Inter_400Regular',
    fontSize: 24,
    color: Colors.ui.textMuted,
  },
  gameOverActions: {
    gap: 12,
    width: '100%',
  },
  gameOverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent.teal + '15',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.accent.teal + '30',
  },
  gameOverButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.accent.teal,
  },
  gameOverButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  gameOverButtonTextSecondary: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.ui.textSecondary,
  },
});
