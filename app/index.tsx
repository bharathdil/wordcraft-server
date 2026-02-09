import React, { useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, Pressable, Platform, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withDelay, withSpring, FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useGame } from '@/lib/game-context';

const { width } = Dimensions.get('window');

const MENU_ITEMS = [
  { id: 'play', label: 'Play Game', icon: 'play' as const, route: '/game', color: Colors.accent.teal, desc: 'vs Computer' },
  { id: 'multiplayer', label: 'Multiplayer', icon: 'users' as const, route: '/multiplayer', color: '#E85D75', desc: 'Play with Friends' },
  { id: 'practice', label: 'Practice', icon: 'target' as const, route: '/practice', color: Colors.accent.gold, desc: 'Anagram Trainer' },
  { id: 'tutorial', label: 'Tutorial', icon: 'book-open' as const, route: '/tutorial', color: '#7C6BC4', desc: 'Learn the Rules' },
  { id: 'rules', label: 'Rules', icon: 'file-text' as const, route: '/rules', color: '#C4856B', desc: '2024 Reference' },
];

function FloatingTile({ letter, delay, x, y }: { letter: string; delay: number; x: number; y: number }) {
  const float = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(0.15, { duration: 1000 }));
    float.value = withDelay(delay, withRepeat(withTiming(1, { duration: 3000 + Math.random() * 2000 }), -1, true));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value * -20 }, { rotate: `${float.value * 5 - 2.5}deg` }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.floatingTile, { left: x, top: y }, style]}>
      <Text style={styles.floatingTileLetter}>{letter}</Text>
    </Animated.View>
  );
}

function MenuItem({ item, index }: { item: typeof MENU_ITEMS[0]; index: number }) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    router.push(item.route as any);
  };

  return (
    <Animated.View entering={FadeInDown.delay(200 + index * 100).springify()} style={animStyle}>
      <Pressable onPress={handlePress} style={styles.menuItem}>
        <View style={[styles.menuIconContainer, { backgroundColor: item.color + '20' }]}>
          <Feather name={item.icon} size={22} color={item.color} />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={styles.menuLabel}>{item.label}</Text>
          <Text style={styles.menuDesc}>{item.desc}</Text>
        </View>
        <Feather name="chevron-right" size={20} color={Colors.ui.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { stats, loadStats } = useGame();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  useEffect(() => {
    loadStats();
  }, []);

  const floatingLetters = ['W', 'O', 'R', 'D', 'S', 'Q', 'Z'];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1510', '#0D0A07', '#0D0A07']}
        style={StyleSheet.absoluteFill}
      />

      {floatingLetters.map((letter, i) => (
        <FloatingTile
          key={letter}
          letter={letter}
          delay={i * 400}
          x={30 + (i * (width - 80) / floatingLetters.length)}
          y={120 + (i % 3) * 60}
        />
      ))}

      <View style={[styles.content, { paddingTop: (insets.top || webTopInset) + 40, paddingBottom: (insets.bottom || webBottomInset) + 20 }]}>
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoTile}>
              <Text style={styles.logoLetter}>W</Text>
              <Text style={styles.logoScore}>4</Text>
            </View>
            <View style={[styles.logoTile, { marginLeft: -4 }]}>
              <Text style={styles.logoLetter}>C</Text>
              <Text style={styles.logoScore}>3</Text>
            </View>
          </View>
          <Text style={styles.title}>WordCraft</Text>
          <Text style={styles.subtitle}>Master the Board</Text>
        </Animated.View>

        {stats.gamesPlayed > 0 && (
          <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.gamesPlayed}</Text>
              <Text style={styles.statLabel}>Played</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.gamesWon}</Text>
              <Text style={styles.statLabel}>Won</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.highScore}</Text>
              <Text style={styles.statLabel}>Best</Text>
            </View>
            {stats.bestWord ? (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.bestWord}</Text>
                  <Text style={styles.statLabel}>{stats.bestWordScore}pts</Text>
                </View>
              </>
            ) : null}
          </Animated.View>
        )}

        <View style={styles.menuContainer}>
          {MENU_ITEMS.map((item, i) => (
            <MenuItem key={item.id} item={item} index={i} />
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.footer}>
          <Text style={styles.footerText}>2024 Official Rules</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  logoTile: {
    width: 48,
    height: 48,
    backgroundColor: Colors.tile.face,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.tile.border,
  },
  logoLetter: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: Colors.tile.letter,
  },
  logoScore: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 8,
    color: Colors.tile.score,
    position: 'absolute',
    bottom: 3,
    right: 5,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 36,
    color: Colors.ui.text,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Colors.ui.textSecondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.ui.surfaceElevated,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.ui.cardBorder,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.ui.text,
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.ui.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.ui.cardBorder,
  },
  menuContainer: {
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.ui.cardBorder,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  menuLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.ui.text,
  },
  menuDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.ui.textSecondary,
    marginTop: 2,
  },
  floatingTile: {
    position: 'absolute',
    width: 32,
    height: 32,
    backgroundColor: Colors.tile.face,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.tile.border,
    zIndex: 0,
  },
  floatingTileLetter: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.tile.letter,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  footerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.ui.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
