import React, { useState } from 'react';
import { StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { QuizPack, QuizQuestion } from '@/types';
import * as Haptics from 'expo-haptics';

import codeReviewData from '@/data/quizzes/code-review-scenarios.json';
import codeReviewAdvData from '@/data/quizzes/code-review-advanced.json';
import systemDesignData from '@/data/quizzes/system-design-scenarios.json';

const quizPacks: QuizPack[] = [codeReviewData, codeReviewAdvData, systemDesignData] as QuizPack[];

export default function QuizScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [selectedPack, setSelectedPack] = useState<QuizPack | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [choosingCount, setChoosingCount] = useState(false);

  const QUESTION_COUNTS = [3, 5, 10];

  const resetQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowResult(false);
    setScore(0);
  };

  const handleSelectPack = (pack: QuizPack) => {
    setSelectedPack(pack);
    setChoosingCount(true);
  };

  const handleStartWithCount = (count: number) => {
    if (!selectedPack) return;
    resetQuiz();
    // Shuffle and pick N questions
    const shuffled = [...selectedPack.questions].sort(() => Math.random() - 0.5);
    setActiveQuestions(shuffled.slice(0, Math.min(count, shuffled.length)));
    setChoosingCount(false);
  };

  const handleBackToList = () => {
    setSelectedPack(null);
    setActiveQuestions([]);
    setChoosingCount(false);
    resetQuiz();
  };

  const handleSelectOption = (index: number) => {
    if (showResult) return;
    setSelectedOption(index);
    setShowResult(true);
    if (index === activeQuestions[currentIndex].correctIndex) {
      setScore((s) => s + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setShowResult(false);
    setCurrentIndex((i) => i + 1);
  };

  const isFinished = activeQuestions.length > 0 && currentIndex >= activeQuestions.length;
  const isPlaying = activeQuestions.length > 0 && !choosingCount;

  // --- Pack List ---
  if (!isPlaying && !choosingCount) {
    return (
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.title, { color: colors.text }]}>Quizzes</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Test your knowledge with scenarios
        </Text>

        {quizPacks.map((pack) => (
          <Pressable
            key={pack.id}
            onPress={() => handleSelectPack(pack)}
            style={({ pressed }) => [
              styles.packCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View style={styles.packHeader}>
              <Text style={styles.packIcon}>{pack.icon}</Text>
              <View style={styles.packHeaderText}>
                <Text style={[styles.packName, { color: colors.text }]}>
                  {pack.name}
                </Text>
                <Text
                  style={[styles.packDesc, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {pack.description}
                </Text>
              </View>
            </View>
            <View style={styles.packFooter}>
              <Text style={[styles.packStat, { color: colors.textSecondary }]}>
                {pack.questions.length} questions
              </Text>
              <View style={[styles.startBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.startBadgeText}>Start</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  // --- Question Count Picker ---
  if (choosingCount && selectedPack) {
    const maxQ = selectedPack.questions.length;
    return (
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.centeredContent}
      >
        <Pressable onPress={handleBackToList} style={styles.backContainer}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </Pressable>
        <Text style={styles.countIcon}>{selectedPack.icon}</Text>
        <Text style={[styles.countTitle, { color: colors.text }]}>{selectedPack.name}</Text>
        <Text style={[styles.countSubtitle, { color: colors.textSecondary }]}>
          How many questions?
        </Text>
        <View style={styles.countRow}>
          {QUESTION_COUNTS.filter(c => c <= maxQ).map((count) => (
            <Pressable
              key={count}
              onPress={() => handleStartWithCount(count)}
              style={({ pressed }) => [
                styles.countBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.countBtnNumber, { color: colors.primary }]}>{count}</Text>
              <Text style={[styles.countBtnLabel, { color: colors.textSecondary }]}>
                {count === 3 ? 'Quick' : count === 5 ? 'Standard' : 'Full'}
              </Text>
            </Pressable>
          ))}
          {maxQ > 10 && (
            <Pressable
              onPress={() => handleStartWithCount(maxQ)}
              style={({ pressed }) => [
                styles.countBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.countBtnNumber, { color: colors.primary }]}>All</Text>
              <Text style={[styles.countBtnLabel, { color: colors.textSecondary }]}>{maxQ}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    );
  }

  // --- Score Summary ---
  if (isFinished) {
    const percentage = Math.round((score / activeQuestions.length) * 100);
    return (
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.centeredContent}
      >
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            Quiz complete
          </Text>
          <Text style={[styles.summaryScore, { color: colors.primary }]}>
            {score} / {activeQuestions.length}
          </Text>
          <Text style={[styles.summaryPercent, { color: colors.textSecondary }]}>
            {percentage}% correct
          </Text>

          <Pressable
            onPress={() => {
              if (selectedPack) handleStartWithCount(activeQuestions.length);
            }}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={styles.actionButtonText}>Try Again</Text>
          </Pressable>

          <Pressable
            onPress={handleBackToList}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[styles.actionButtonText, { color: colors.text }]}>
              Back to Quizzes
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // --- Quiz Player ---
  const question: QuizQuestion = activeQuestions[currentIndex];
  const isCorrect = selectedOption === question.correctIndex;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.quizHeader}>
        <Pressable onPress={handleBackToList}>
          <Text style={[styles.backButton, { color: colors.primary }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.progress, { color: colors.textSecondary }]}>
          Question {currentIndex + 1} of {activeQuestions.length}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.primary,
              width: `${((currentIndex + 1) / activeQuestions.length) * 100}%`,
            },
          ]}
        />
      </View>

      {/* Scenario */}
      <View
        style={[
          styles.scenarioBox,
          { backgroundColor: colorScheme === 'dark' ? '#1A1816' : '#F5F0EB', borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.scenarioText,
            { color: colorScheme === 'dark' ? '#F0EBE5' : '#2C2420' },
          ]}
        >
          {question.scenario}
        </Text>
      </View>

      {/* Question */}
      <Text style={[styles.questionText, { color: colors.text }]}>
        {question.question}
      </Text>

      {/* Options */}
      {question.options.map((option, index) => {
        let optionBg = colors.surface;
        let optionBorder = colors.border;
        let optionTextColor = colors.text;

        if (showResult) {
          if (index === question.correctIndex) {
            optionBg = '#EDF5EF';
            optionBorder = '#7B9E87';
            optionTextColor = '#4A7A58';
            if (colorScheme === 'dark') {
              optionBg = '#1E2D22';
              optionTextColor = '#8FB89A';
            }
          } else if (index === selectedOption) {
            optionBg = '#F5EDEA';
            optionBorder = '#C47D5A';
            optionTextColor = '#9E5A3A';
            if (colorScheme === 'dark') {
              optionBg = '#2D1E1A';
              optionTextColor = '#D4976E';
            }
          }
        } else if (index === selectedOption) {
          optionBorder = colors.primary;
        }

        return (
          <Pressable
            key={index}
            onPress={() => handleSelectOption(index)}
            style={({ pressed }) => [
              styles.optionButton,
              {
                backgroundColor: optionBg,
                borderColor: optionBorder,
                opacity: pressed && !showResult ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[styles.optionLabel, { color: optionBorder === colors.border ? colors.textSecondary : optionBorder }]}>
              {String.fromCharCode(65 + index)}
            </Text>
            <Text style={[styles.optionText, { color: optionTextColor, flex: 1 }]}>
              {option}
            </Text>
          </Pressable>
        );
      })}

      {/* Explanation */}
      {showResult && (
        <View
          style={[
            styles.explanationBox,
            {
              backgroundColor: isCorrect
                ? (colorScheme === 'dark' ? '#1E2D22' : '#EDF5EF')
                : (colorScheme === 'dark' ? '#2D1E1A' : '#F5EDEA'),
              borderColor: isCorrect ? '#7B9E87' : '#C47D5A',
            },
          ]}
        >
          <Text
            style={[
              styles.explanationTitle,
              { color: isCorrect ? '#7B9E87' : '#C47D5A' },
            ]}
          >
            {isCorrect ? '✓ Correct!' : '✗ Not quite'}
          </Text>
          <Text
            style={[
              styles.explanationText,
              { color: colors.text },
            ]}
          >
            {question.explanation}
          </Text>
        </View>
      )}

      {/* Next button */}
      {showResult && (
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.nextButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex < activeQuestions.length - 1 ? 'Next Question' : 'See Results'}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  centeredContent: {
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter-Medium',
    letterSpacing: -0.3,
    marginBottom: 4,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    letterSpacing: 0.2,
    marginBottom: 24,
    paddingHorizontal: 24,
  },

  // Pack cards
  packCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 10,
  },
  packHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  packIcon: {
    fontSize: 15,
    marginRight: 12,
  },
  packHeaderText: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  packName: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  packDesc: {
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.1,
  },
  packFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  packStat: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  startBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  startBadgeText: {
    color: '#FFF9F4',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // Count picker
  countIcon: {
    fontSize: 36,
    marginBottom: 16,
  },
  countTitle: {
    fontSize: 20,
    fontWeight: '500',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  countSubtitle: {
    fontSize: 13,
    letterSpacing: 0.2,
    marginBottom: 28,
  },
  countRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  countBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 22,
    alignItems: 'center',
  },
  countBtnNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Light',
    letterSpacing: -0.5,
  },
  countBtnLabel: {
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  backContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  // Quiz player
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  backButton: {
    fontSize: 14,
    fontWeight: '500',
  },
  progress: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  progressTrack: {
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 24,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  scenarioBox: {
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  scenarioText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  questionText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    paddingHorizontal: 24,
    marginBottom: 16,
    lineHeight: 22,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 24,
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 12,
    width: 20,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  optionText: {
    fontSize: 13,
    lineHeight: 19,
  },
  explanationBox: {
    marginHorizontal: 24,
    marginTop: 10,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  explanationTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 20,
  },
  nextButton: {
    marginHorizontal: 24,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFF9F4',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // Summary
  summaryCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 32,
    marginHorizontal: 24,
    alignItems: 'center',
  },
  summaryEmoji: {
    fontSize: 36,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Medium',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  summaryScore: {
    fontSize: 32,
    fontFamily: 'Inter-Light',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  summaryPercent: {
    fontSize: 13,
    letterSpacing: 0.3,
    marginBottom: 28,
  },
  actionButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#FFF9F4',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
