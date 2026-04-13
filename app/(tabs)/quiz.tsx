import React, { useState } from 'react';
import { StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { QuizPack, QuizQuestion } from '@/types';
import * as Haptics from 'expo-haptics';

import codeReviewData from '@/data/quizzes/code-review-scenarios.json';
import systemDesignData from '@/data/quizzes/system-design-scenarios.json';

const quizPacks: QuizPack[] = [codeReviewData, systemDesignData] as QuizPack[];

export default function QuizScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [activeQuiz, setActiveQuiz] = useState<QuizPack | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  const resetQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowResult(false);
    setScore(0);
  };

  const handleSelectPack = (pack: QuizPack) => {
    resetQuiz();
    setActiveQuiz(pack);
  };

  const handleBackToList = () => {
    setActiveQuiz(null);
    resetQuiz();
  };

  const handleSelectOption = (index: number) => {
    if (showResult) return;
    setSelectedOption(index);
    setShowResult(true);
    if (index === activeQuiz!.questions[currentIndex].correctIndex) {
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

  const isFinished = activeQuiz ? currentIndex >= activeQuiz.questions.length : false;

  // --- Pack List ---
  if (!activeQuiz) {
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

  // --- Score Summary ---
  if (isFinished) {
    const percentage = Math.round((score / activeQuiz.questions.length) * 100);
    return (
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.centeredContent}
      >
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.summaryEmoji}>
            {percentage >= 80 ? '🎉' : percentage >= 50 ? '👍' : '📚'}
          </Text>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            Quiz Complete!
          </Text>
          <Text style={[styles.summaryScore, { color: colors.primary }]}>
            {score} / {activeQuiz.questions.length}
          </Text>
          <Text style={[styles.summaryPercent, { color: colors.textSecondary }]}>
            {percentage}% correct
          </Text>

          <Pressable
            onPress={() => {
              resetQuiz();
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
  const question: QuizQuestion = activeQuiz.questions[currentIndex];
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
          Question {currentIndex + 1} of {activeQuiz.questions.length}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.primary,
              width: `${((currentIndex + 1) / activeQuiz.questions.length) * 100}%`,
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
            {currentIndex < activeQuiz.questions.length - 1 ? 'Next Question' : 'See Results'}
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
    paddingTop: 16,
    paddingBottom: 32,
  },
  centeredContent: {
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 20,
    paddingHorizontal: 24,
  },

  // Pack cards
  packCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 12,
    shadowColor: '#B8845C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  packHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  packIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  packHeaderText: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  packName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  packDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  packFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  packStat: {
    fontSize: 12,
  },
  startBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
  },
  startBadgeText: {
    color: '#FFF9F4',
    fontSize: 13,
    fontWeight: '600',
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
    fontSize: 16,
    fontWeight: '600',
  },
  progress: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginHorizontal: 24,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  scenarioBox: {
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  scenarioText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  questionText: {
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 24,
    marginBottom: 16,
    lineHeight: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    marginHorizontal: 24,
    marginBottom: 10,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 12,
    width: 22,
    textAlign: 'center',
  },
  optionText: {
    fontSize: 15,
    lineHeight: 21,
  },
  explanationBox: {
    marginHorizontal: 24,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  explanationTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  nextButton: {
    marginHorizontal: 24,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFF9F4',
    fontSize: 16,
    fontWeight: '600',
  },

  // Summary
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    marginHorizontal: 24,
    alignItems: 'center',
  },
  summaryEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  summaryScore: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryPercent: {
    fontSize: 16,
    marginBottom: 24,
  },
  actionButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#FFF9F4',
    fontSize: 16,
    fontWeight: '600',
  },
});
