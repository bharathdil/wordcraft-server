import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, Pressable, TextInput, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, {
  FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { getRandomPuzzle, shuffleString, AnagramPuzzle } from '@/lib/anagram-data';

function LetterTile({ letter, index }: { letter: string; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <View style={styles.puzzleTile}>
        <Text style={styles.puzzleTileLetter}>{letter}</Text>
      </View>
    </Animated.View>
  );
}

export default function PracticeScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  const [puzzle, setPuzzle] = useState<AnagramPuzzle | null>(null);
  const [shuffledLetters, setShuffledLetters] = useState('');
  const [guess, setGuess] = useState('');
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'duplicate'; text: string } | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const inputRef = useRef<TextInput>(null);

  const startPuzzle = useCallback((diff: 'easy' | 'medium' | 'hard') => {
    const p = getRandomPuzzle(diff);
    setPuzzle(p);
    setShuffledLetters(shuffleString(p.letters));
    setFoundWords([]);
    setGuess('');
    setFeedback(null);
  }, []);

  useEffect(() => {
    startPuzzle(difficulty);
  }, []);

  const handleReshuffle = () => {
    if (puzzle) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShuffledLetters(shuffleString(puzzle.letters));
    }
  };

  const handleSubmitGuess = () => {
    if (!puzzle || !guess.trim()) return;

    const upperGuess = guess.toUpperCase().trim();

    if (foundWords.includes(upperGuess)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setFeedback({ type: 'duplicate', text: 'Already found!' });
      setGuess('');
      setTimeout(() => setFeedback(null), 1500);
      return;
    }

    if (puzzle.answers.includes(upperGuess)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const newFound = [...foundWords, upperGuess];
      setFoundWords(newFound);
      const wordScore = upperGuess.length * 10;
      setScore(prev => prev + wordScore);
      setStreak(prev => prev + 1);
      setFeedback({ type: 'success', text: `+${wordScore} points!` });
      setGuess('');

      if (newFound.length === puzzle.answers.length) {
        setTimeout(() => {
          setFeedback({ type: 'success', text: 'All words found! Loading next...' });
          setTimeout(() => startPuzzle(difficulty), 1500);
        }, 800);
      } else {
        setTimeout(() => setFeedback(null), 1500);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStreak(0);
      setFeedback({ type: 'error', text: 'Not a valid word' });
      setGuess('');
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStreak(0);
    startPuzzle(difficulty);
  };

  const handleDifficultyChange = (d: 'easy' | 'medium' | 'hard') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDifficulty(d);
    startPuzzle(d);
  };

  if (!puzzle) return null;

  return (
    <View style={[styles.container, {
      paddingTop: (insets.top || webTopInset) + 12,
      paddingBottom: (insets.bottom || webBottomInset) + 12,
    }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={Colors.ui.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Anagram Trainer</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statBox}>
          <Text style={styles.statBoxValue}>{score}</Text>
          <Text style={styles.statBoxLabel}>Score</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statBoxValue}>{streak}</Text>
          <Text style={styles.statBoxLabel}>Streak</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statBoxValue}>{foundWords.length}/{puzzle.answers.length}</Text>
          <Text style={styles.statBoxLabel}>Found</Text>
        </View>
      </View>

      <View style={styles.difficultyTabs}>
        {(['easy', 'medium', 'hard'] as const).map((d) => (
          <Pressable
            key={d}
            onPress={() => handleDifficultyChange(d)}
            style={[styles.diffTab, difficulty === d && styles.diffTabActive]}
          >
            <Text style={[styles.diffTabText, difficulty === d && styles.diffTabTextActive]}>
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.puzzleArea}>
        <Text style={styles.puzzleLabel}>Rearrange these letters:</Text>
        <View style={styles.letterRow}>
          {shuffledLetters.split('').map((letter, i) => (
            <LetterTile key={`${letter}-${i}-${shuffledLetters}`} letter={letter} index={i} />
          ))}
        </View>

        <Pressable onPress={handleReshuffle} style={styles.reshuffleButton}>
          <Feather name="shuffle" size={16} color={Colors.accent.teal} />
          <Text style={styles.reshuffleText}>Shuffle</Text>
        </Pressable>
      </View>

      {feedback && (
        <Animated.View
          entering={FadeIn}
          style={[
            styles.feedbackBanner,
            {
              backgroundColor: feedback.type === 'success'
                ? Colors.accent.success + '20'
                : feedback.type === 'duplicate'
                  ? Colors.accent.warning + '20'
                  : Colors.accent.error + '20',
            },
          ]}
        >
          <Feather
            name={feedback.type === 'success' ? 'check-circle' : feedback.type === 'duplicate' ? 'alert-circle' : 'x-circle'}
            size={16}
            color={feedback.type === 'success' ? Colors.accent.success : feedback.type === 'duplicate' ? Colors.accent.warning : Colors.accent.error}
          />
          <Text style={[
            styles.feedbackText,
            {
              color: feedback.type === 'success' ? Colors.accent.success : feedback.type === 'duplicate' ? Colors.accent.warning : Colors.accent.error,
            },
          ]}>
            {feedback.text}
          </Text>
        </Animated.View>
      )}

      <View style={styles.inputArea}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Type your word..."
          placeholderTextColor={Colors.ui.textMuted}
          value={guess}
          onChangeText={setGuess}
          onSubmitEditing={handleSubmitGuess}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="go"
        />
        <Pressable onPress={handleSubmitGuess} style={styles.submitGuessButton}>
          <Feather name="check" size={20} color="#FFF" />
        </Pressable>
      </View>

      {foundWords.length > 0 && (
        <View style={styles.foundContainer}>
          <Text style={styles.foundLabel}>Found Words:</Text>
          <View style={styles.foundRow}>
            {foundWords.map(w => (
              <View key={w} style={styles.foundChip}>
                <Text style={styles.foundChipText}>{w}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.bottomActions}>
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Feather name="skip-forward" size={16} color={Colors.ui.textSecondary} />
          <Text style={styles.skipText}>Skip Puzzle</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.ui.text,
    textAlign: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 8,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.ui.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.ui.cardBorder,
  },
  statBoxValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: Colors.ui.text,
  },
  statBoxLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.ui.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  difficultyTabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 8,
    backgroundColor: Colors.ui.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.ui.cardBorder,
  },
  diffTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  diffTabActive: {
    backgroundColor: Colors.accent.teal + '20',
  },
  diffTabText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.ui.textMuted,
  },
  diffTabTextActive: {
    color: Colors.accent.teal,
  },
  puzzleArea: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 16,
  },
  puzzleLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.ui.textSecondary,
  },
  letterRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  puzzleTile: {
    width: 48,
    height: 52,
    backgroundColor: Colors.tile.face,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.tile.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  puzzleTileLetter: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: Colors.tile.letter,
  },
  reshuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.accent.teal + '15',
  },
  reshuffleText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.accent.teal,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 8,
  },
  feedbackText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  inputArea: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.ui.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: Colors.ui.text,
    borderWidth: 1,
    borderColor: Colors.ui.cardBorder,
    letterSpacing: 2,
  },
  submitGuessButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.accent.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foundContainer: {
    paddingHorizontal: 20,
  },
  foundLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.ui.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  foundRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  foundChip: {
    backgroundColor: Colors.accent.success + '20',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.accent.success + '30',
  },
  foundChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.accent.success,
    letterSpacing: 1,
  },
  bottomActions: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 16,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.ui.textSecondary,
  },
});
