import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { QuizPack, QuizQuestion } from '@/types';
import * as Haptics from 'expo-haptics';
import { saveQuizResult, recordQuizQuestionResult } from '@/lib/database';
import { selectSmartQuestions, getDailyReviewQuestions } from '@/lib/quizSelection';
import { explainSimpler } from '@/lib/summarizer';
import { useLocalSearchParams } from 'expo-router';

import codeReviewData from '@/data/quizzes/code-review-scenarios.json';
import codeReviewAdvData from '@/data/quizzes/code-review-advanced.json';
import systemDesignData from '@/data/quizzes/system-design-scenarios.json';

let debuggingData: QuizPack | null = null;
let bestPracticesData: QuizPack | null = null;
try { debuggingData = require('@/data/quizzes/debugging-scenarios.json'); } catch {}
try { bestPracticesData = require('@/data/quizzes/best-practices.json'); } catch {}

const quizPacks: QuizPack[] = [
  codeReviewData,
  codeReviewAdvData,
  systemDesignData,
  ...(debuggingData ? [debuggingData] : []),
  ...(bestPracticesData ? [bestPracticesData] : []),
] as QuizPack[];

export default function QuizScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const params = useLocalSearchParams<{ mode?: string }>();

  const [selectedPack, setSelectedPack] = useState<QuizPack | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [choosingCount, setChoosingCount] = useState(false);
  const [eli5Text, setEli5Text] = useState<string | null>(null);
  const [eli5Loading, setEli5Loading] = useState(false);

  // Handle deep link from home for daily review
  useEffect(() => {
    if (params.mode === 'review') {
      (async () => {
        const allQuestions = quizPacks.flatMap(p => p.questions) as QuizQuestion[];
        const reviewQs = await getDailyReviewQuestions(allQuestions, 10);
        if (reviewQs.length > 0) {
          setSelectedPack({
            id: 'daily-review',
            name: 'Daily Review',
            icon: '',
            description: 'Questions to reinforce from previous sessions',
            questions: reviewQs,
          } as QuizPack);
          resetQuiz();
          setActiveQuestions(reviewQs);
          setChoosingCount(false);
        }
      })();
    }
  }, [params.mode]);

  const handleSurpriseMe = async () => {
    const allQuestions = quizPacks.flatMap(p => p.questions) as QuizQuestion[];
    const smart = await selectSmartQuestions(allQuestions, 5);
    setSelectedPack({ id: 'surprise', name: 'Surprise Mix', icon: '', description: 'A random mix from all packs', questions: smart } as QuizPack);
    resetQuiz();
    setActiveQuestions(smart);
    setChoosingCount(false);
  };

  const QUESTION_COUNTS = [3, 5, 10];

  const resetQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowResult(false);
    setScore(0);
    setEli5Text(null);
    setEli5Loading(false);
  };

  const handleStartWithCount = async (pack: QuizPack, count: number) => {
    setSelectedPack(pack);
    resetQuiz();
    const smart = await selectSmartQuestions(pack.questions as QuizQuestion[], count);
    setActiveQuestions(smart);
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
    const correct = index === activeQuestions[currentIndex].correctIndex;
    recordQuizQuestionResult(activeQuestions[currentIndex].id, correct).catch(() => {});
    if (correct) {
      setScore((s) => s + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setShowResult(false);
    setEli5Text(null);
    setEli5Loading(false);
    setCurrentIndex((i) => i + 1);
  };

  const isFinished = activeQuestions.length > 0 && currentIndex >= activeQuestions.length;
  const isPlaying = activeQuestions.length > 0 && !choosingCount;

  // Persist quiz result when finished
  const savedRef = useRef(false);
  useEffect(() => {
    if (isFinished && selectedPack && !savedRef.current) {
      savedRef.current = true;
      saveQuizResult(selectedPack.name, score, activeQuestions.length).catch(() => {});
    }
    if (!isFinished) savedRef.current = false;
  }, [isFinished]);

  // --- Pack List with inline count chips ---
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

        {/* Surprise Me — zero-decision quick start */}
        <Pressable
          onPress={handleSurpriseMe}
          style={({ pressed }) => [
            styles.surpriseButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={styles.surpriseTextWrap}>
            <Text style={styles.surpriseTitle}>Surprise me</Text>
            <Text style={styles.surpriseDesc}>5 smart-picked questions from all packs</Text>
          </View>
        </Pressable>

        {/* Category mix buttons */}
        <Text style={[styles.mixSectionLabel, { color: colors.textSecondary }]}>MIX BY AREA</Text>
        <View style={styles.mixRow}>
          {[
            { label: 'Core Skills', ids: ['code-review-scenarios', 'best-practices'] },
            { label: 'Advanced', ids: ['code-review-advanced', 'debugging-scenarios'] },
            { label: 'Senior', ids: ['system-design-scenarios'] },
          ].map(({ label, ids }) => {
            const poolPacks = quizPacks.filter(p => ids.includes(p.id));
            const total = poolPacks.reduce((s, p) => s + p.questions.length, 0);
            if (total === 0) return null;
            return (
              <Pressable
                key={label}
                onPress={async () => {
                  const pool = poolPacks.flatMap(p => p.questions) as QuizQuestion[];
                  const smart = await selectSmartQuestions(pool, Math.min(10, pool.length));
                  setSelectedPack({ id: `mix-${label}`, name: `${label} Mix`, icon: '', description: `Questions from ${label}`, questions: smart } as QuizPack);
                  resetQuiz();
                  setActiveQuestions(smart);
                  setChoosingCount(false);
                }}
                style={({ pressed }) => [
                  styles.mixChip,
                  { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[styles.mixChipLabel, { color: colors.text }]}>{label}</Text>
                <Text style={[styles.mixChipCount, { color: colors.textSecondary }]}>{total}q</Text>
              </Pressable>
            );
          })}
        </View>

        {quizPacks.map((pack) => {
          const maxQ = pack.questions.length;
          const counts = QUESTION_COUNTS.filter(c => c <= maxQ);
          return (
            <View
              key={pack.id}
              style={[
                styles.packCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
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
              <View style={styles.chipRow}>
                {counts.map((count) => (
                  <Pressable
                    key={count}
                    onPress={() => handleStartWithCount(pack, count)}
                    style={({ pressed }) => [
                      styles.chip,
                      { borderColor: colors.primary, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: colors.primary }]}>
                      {count === 3 ? '3 Quick' : count === 5 ? '5 Std' : `${count}`}
                    </Text>
                  </Pressable>
                ))}
                {maxQ > 10 && (
                  <Pressable
                    onPress={() => handleStartWithCount(pack, maxQ)}
                    style={({ pressed }) => [
                      styles.chip,
                      { borderColor: colors.primary, backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: '#FFF9F4' }]}>All {maxQ}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
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
              if (selectedPack) handleStartWithCount(selectedPack, activeQuestions.length);
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
            {isCorrect ? 'Correct' : 'Not quite'}
          </Text>
          <Text
            style={[
              styles.explanationText,
              { color: colors.text, marginBottom: 10 },
            ]}
          >
            {question.explanation}
          </Text>
          {question.optionExplanations && question.optionExplanations.some(e => e) && (
            <View style={styles.wrongAnswerBreakdown}>
              <Text style={[styles.breakdownTitle, { color: colors.textSecondary }]}>
                Why the other answers are wrong:
              </Text>
              {question.options.map((opt, i) => {
                if (i === question.correctIndex) return null;
                const explanation = question.optionExplanations?.[i];
                if (!explanation) return null;
                return (
                  <View key={i} style={styles.breakdownItem}>
                    <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
                      {String.fromCharCode(65 + i)}.
                    </Text>
                    <Text style={[styles.breakdownText, { color: colors.text }]}>
                      {explanation}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* ELI5 deeper explanation */}
          {!eli5Text && !eli5Loading && (
            <Pressable
              onPress={async () => {
                setEli5Loading(true);
                const result = await explainSimpler(
                  question.question,
                  question.options,
                  question.correctIndex,
                  question.explanation
                );
                setEli5Text(result);
                setEli5Loading(false);
              }}
              style={({ pressed }) => [
                styles.eli5Button,
                { borderColor: colors.primary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.eli5ButtonText, { color: colors.primary }]}>Explain simpler</Text>
            </Pressable>
          )}
          {eli5Loading && (
            <View style={styles.eli5Loading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.eli5LoadingText, { color: colors.textSecondary }]}>
                Generating beginner-friendly explanation...
              </Text>
            </View>
          )}
          {eli5Text && (
            <View style={[styles.eli5Box, { backgroundColor: colorScheme === 'dark' ? '#1A2335' : '#EDF2FA', borderColor: colors.primary + '40' }]}>
              <Text style={[styles.eli5Label, { color: colors.primary }]}>ELI5 Explanation</Text>
              <Text style={[styles.eli5Content, { color: colors.text }]}>{eli5Text}</Text>
            </View>
          )}
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
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center',
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

  // Surprise Me
  surpriseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 20,
    padding: 16,
    borderRadius: 10,
  },
  surpriseTextWrap: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  surpriseTitle: {
    color: '#FFF9F4',
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  surpriseDesc: {
    color: 'rgba(255,249,244,0.75)',
    fontSize: 12,
    letterSpacing: 0.1,
  },

  // Mix by area
  mixSectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    letterSpacing: 2,
    marginHorizontal: 24,
    marginBottom: 10,
    marginTop: 4,
  },
  mixRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 24,
    marginBottom: 20,
  },
  mixChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  mixChipLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  mixChipCount: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
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
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'transparent',
  },
  chip: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.3,
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
  wrongAnswerBreakdown: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 2,
  },
  breakdownLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 20,
    marginTop: 1,
  },
  breakdownText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  eli5Button: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  eli5ButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  eli5Loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: 'transparent',
  },
  eli5LoadingText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  eli5Box: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  eli5Label: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    marginBottom: 6,
  },
  eli5Content: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Inter-Regular',
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
