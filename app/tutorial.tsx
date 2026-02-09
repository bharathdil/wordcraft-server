import React, { useState } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInRight, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { TUTORIAL_LESSONS, TutorialLesson } from '@/lib/tutorial-data';

function LessonCard({ lesson, onPress, index }: { lesson: TutorialLesson; onPress: () => void; index: number }) {
  const iconColors = [Colors.accent.teal, Colors.accent.gold, '#7C6BC4', '#C4856B', Colors.accent.success];
  const color = iconColors[index % iconColors.length];

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 80).springify()}>
      <Pressable onPress={onPress} style={styles.lessonCard}>
        <View style={[styles.lessonIcon, { backgroundColor: color + '20' }]}>
          <Feather name={lesson.icon as any} size={22} color={color} />
        </View>
        <View style={styles.lessonInfo}>
          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <Text style={styles.lessonSteps}>{lesson.steps.length} steps</Text>
        </View>
        <Feather name="chevron-right" size={20} color={Colors.ui.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

function LessonDetail({ lesson, onBack }: { lesson: TutorialLesson; onBack: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = lesson.steps[currentStep];
  const isLast = currentStep === lesson.steps.length - 1;
  const isFirst = currentStep === 0;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLast) {
      onBack();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isFirst) setCurrentStep(prev => prev - 1);
  };

  return (
    <View style={styles.detailContainer}>
      <View style={styles.detailHeader}>
        <Pressable onPress={onBack} style={styles.detailBackButton}>
          <Feather name="arrow-left" size={20} color={Colors.ui.text} />
        </Pressable>
        <Text style={styles.detailTitle}>{lesson.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressBar}>
        {lesson.steps.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i <= currentStep && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View key={step.id} entering={FadeInRight.springify()}>
          <Text style={styles.stepCounter}>Step {currentStep + 1} of {lesson.steps.length}</Text>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepText}>{step.content}</Text>

          {step.tip ? (
            <View style={styles.tipBox}>
              <Feather name="info" size={16} color={Colors.accent.gold} />
              <Text style={styles.tipText}>{step.tip}</Text>
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      <View style={styles.navButtons}>
        <Pressable
          onPress={handlePrev}
          style={[styles.navButton, isFirst && styles.navButtonDisabled]}
          disabled={isFirst}
        >
          <Feather name="chevron-left" size={20} color={isFirst ? Colors.ui.textMuted : Colors.ui.text} />
          <Text style={[styles.navButtonText, isFirst && styles.navButtonTextDisabled]}>Back</Text>
        </Pressable>

        <Pressable onPress={handleNext} style={styles.navButtonPrimary}>
          <Text style={styles.navButtonPrimaryText}>{isLast ? 'Done' : 'Next'}</Text>
          <Feather name={isLast ? 'check' : 'chevron-right'} size={20} color="#FFF" />
        </Pressable>
      </View>
    </View>
  );
}

export default function TutorialScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  const [selectedLesson, setSelectedLesson] = useState<TutorialLesson | null>(null);

  if (selectedLesson) {
    return (
      <View style={[styles.container, {
        paddingTop: (insets.top || webTopInset) + 12,
        paddingBottom: (insets.bottom || webBottomInset) + 12,
      }]}>
        <LessonDetail lesson={selectedLesson} onBack={() => setSelectedLesson(null)} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: (insets.top || webTopInset) + 12 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={Colors.ui.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Tutorial</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: (insets.bottom || webBottomInset) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Learn to Play</Text>
        <Text style={styles.sectionSubtitle}>
          Master Scrabble with these interactive lessons
        </Text>

        <View style={styles.lessonList}>
          {TUTORIAL_LESSONS.map((lesson, i) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              index={i}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setSelectedLesson(lesson);
              }}
            />
          ))}
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: Colors.ui.text,
  },
  sectionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.ui.textSecondary,
    marginTop: 6,
    marginBottom: 24,
  },
  lessonList: {
    gap: 10,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.ui.cardBorder,
  },
  lessonIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonInfo: {
    flex: 1,
    marginLeft: 14,
  },
  lessonTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.ui.text,
  },
  lessonSteps: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.ui.textSecondary,
    marginTop: 2,
  },
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  detailBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  detailTitle: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.ui.text,
    textAlign: 'center',
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  progressDot: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.ui.cardBorder,
  },
  progressDotActive: {
    backgroundColor: Colors.accent.teal,
  },
  stepScroll: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  stepCounter: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.accent.teal,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  stepTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: Colors.ui.text,
    marginBottom: 16,
  },
  stepText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Colors.ui.textSecondary,
    lineHeight: 26,
  },
  tipBox: {
    flexDirection: 'row',
    backgroundColor: Colors.accent.gold + '15',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.accent.gold + '30',
  },
  tipText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.accent.goldLight,
    flex: 1,
    lineHeight: 22,
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 6,
    backgroundColor: Colors.ui.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.ui.cardBorder,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.ui.text,
  },
  navButtonTextDisabled: {
    color: Colors.ui.textMuted,
  },
  navButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 6,
    backgroundColor: Colors.accent.teal,
  },
  navButtonPrimaryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FFF',
  },
});
