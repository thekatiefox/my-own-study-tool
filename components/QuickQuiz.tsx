import React, { useState, useEffect } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import { QuizQuestion } from '@/types';
import * as Haptics from 'expo-haptics';
import { recordQuizQuestionResult } from '@/lib/database';
import { selectSmartQuestions } from '@/lib/quizSelection';

import codeReviewData from '@/data/quizzes/code-review-scenarios.json';
import codeReviewAdvData from '@/data/quizzes/code-review-advanced.json';
import systemDesignData from '@/data/quizzes/system-design-scenarios.json';

let debuggingData: any = null;
let bestPracticesData: any = null;
try { debuggingData = require('@/data/quizzes/debugging-scenarios.json'); } catch {}
try { bestPracticesData = require('@/data/quizzes/best-practices.json'); } catch {}

const ALL_QUESTIONS: QuizQuestion[] = [
  ...codeReviewData.questions,
  ...codeReviewAdvData.questions,
  ...systemDesignData.questions,
  ...(debuggingData ? debuggingData.questions : []),
  ...(bestPracticesData ? bestPracticesData.questions : []),
] as QuizQuestion[];

function getRandomQuestion(): QuizQuestion {
  return ALL_QUESTIONS[Math.floor(Math.random() * ALL_QUESTIONS.length)];
}

interface Props {
  colors: Record<string, string>;
  colorScheme: string;
}

export default function QuickQuiz({ colors, colorScheme }: Props) {
  const [question, setQuestion] = useState<QuizQuestion>(getRandomQuestion);
  const [expanded, setExpanded] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Replace initial random question with smart-selected one
  useEffect(() => {
    selectSmartQuestions(ALL_QUESTIONS, 1).then(q => {
      if (q[0]) setQuestion(q[0]);
    }).catch(() => {});
  }, []);

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelectedOption(index);
    setShowResult(true);
    const correct = index === question.correctIndex;
    recordQuizQuestionResult(question.id, correct).catch(() => {});
    Haptics.notificationAsync(
      correct
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error
    );
  };

  const handleNext = async () => {
    const smart = await selectSmartQuestions(ALL_QUESTIONS, 1);
    setQuestion(smart[0] || getRandomQuestion());
    setSelectedOption(null);
    setShowResult(false);
    setExpanded(true);
  };

  // Collapsed state — compact teaser card
  if (!expanded) {
    return (
      <Pressable
        onPress={() => { setExpanded(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        style={({ pressed }) => [
          styles.teaser,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={styles.teaserRow}>
          <Text style={[styles.teaserLabel, { color: colors.primary }]}>QUICK QUIZ</Text>
          <Text style={[styles.teaserArrow, { color: colors.textSecondary }]}>›</Text>
        </View>
        <Text style={[styles.teaserQuestion, { color: colors.text }]} numberOfLines={1}>
          {question.question}
        </Text>
      </Pressable>
    );
  }

  const isCorrect = selectedOption === question.correctIndex;

  // Expanded state — full quiz interaction
  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable onPress={() => setExpanded(false)} style={styles.header}>
        <Text style={[styles.headerLabel, { color: colors.primary }]}>QUICK QUIZ</Text>
        <Text style={[styles.collapseBtn, { color: colors.textSecondary }]}>Done</Text>
      </Pressable>

      <Text style={[styles.question, { color: colors.text }]}>
        {question.question}
      </Text>

      {question.scenario ? (
        <View style={[styles.scenario, { backgroundColor: colorScheme === 'dark' ? '#1A1816' : '#F5F0EB', borderColor: colors.border }]}>
          <Text style={[styles.scenarioText, { color: colors.text }]}>
            {question.scenario}
          </Text>
        </View>
      ) : null}

      {question.options.map((option, index) => {
        let optionBg = 'transparent';
        let optionBorder = colors.border;
        let textColor = colors.text;

        if (showResult) {
          if (index === question.correctIndex) {
            optionBg = colorScheme === 'dark' ? '#1E2D22' : '#EDF5EF';
            optionBorder = '#7B9E87';
            textColor = colorScheme === 'dark' ? '#8FB89A' : '#4A7A58';
          } else if (index === selectedOption) {
            optionBg = colorScheme === 'dark' ? '#2D1E1A' : '#F5EDEA';
            optionBorder = '#C47D5A';
            textColor = colorScheme === 'dark' ? '#D4976E' : '#9E5A3A';
          }
        }

        return (
          <Pressable
            key={index}
            onPress={() => handleSelect(index)}
            style={[styles.option, { backgroundColor: optionBg, borderColor: optionBorder }]}
          >
            <Text style={[styles.optionLetter, { color: optionBorder === colors.border ? colors.textSecondary : optionBorder }]}>
              {String.fromCharCode(65 + index)}
            </Text>
            <Text style={[styles.optionText, { color: textColor }]}>
              {option}
            </Text>
          </Pressable>
        );
      })}

      {showResult && (
        <View style={[styles.result, { backgroundColor: isCorrect ? (colorScheme === 'dark' ? '#1E2D22' : '#EDF5EF') : (colorScheme === 'dark' ? '#2D1E1A' : '#F5EDEA') }]}>
          <Text style={[styles.resultLabel, { color: isCorrect ? '#7B9E87' : '#C47D5A' }]}>
            {isCorrect ? 'Correct' : 'Not quite'}
          </Text>
          <Text style={[styles.resultText, { color: colors.text, marginBottom: 8 }]}>
            {question.explanation}
          </Text>
          {question.optionExplanations && question.optionExplanations.some((e: string) => e) && (
            <View style={styles.wrongBreakdown}>
              <Text style={[styles.wrongBreakdownTitle, { color: colors.textSecondary }]}>
                Why the other answers are wrong:
              </Text>
              {question.options.map((opt: string, i: number) => {
                if (i === question.correctIndex) return null;
                const explanation = question.optionExplanations?.[i];
                if (!explanation) return null;
                return (
                  <View key={i} style={styles.wrongBreakdownItem}>
                    <Text style={[styles.wrongBreakdownLabel, { color: colors.textSecondary }]}>
                      {String.fromCharCode(65 + i)}.
                    </Text>
                    <Text style={[styles.wrongBreakdownText, { color: colors.text }]}>
                      {explanation}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {showResult && (
        <Pressable
          onPress={handleNext}
          style={[styles.nextBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.nextBtnText}>Next Question</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Collapsed teaser
  teaser: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  teaserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  teaserLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    letterSpacing: 2,
  },
  teaserArrow: {
    fontSize: 16,
    fontWeight: '300',
  },
  teaserQuestion: {
    fontSize: 13,
    lineHeight: 19,
  },
  // Expanded
  container: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  headerLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    letterSpacing: 2,
  },
  collapseBtn: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  question: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    lineHeight: 20,
    marginBottom: 10,
  },
  scenario: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  scenarioText: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'monospace',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 6,
  },
  optionLetter: {
    fontSize: 11,
    fontWeight: '500',
    marginRight: 10,
    width: 16,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  optionText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  result: {
    borderRadius: 8,
    padding: 14,
    marginTop: 6,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  resultText: {
    fontSize: 12,
    lineHeight: 18,
  },
  wrongBreakdown: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  wrongBreakdownTitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  wrongBreakdownItem: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 2,
  },
  wrongBreakdownLabel: {
    fontSize: 11,
    fontWeight: '600',
    width: 18,
    marginTop: 1,
  },
  wrongBreakdownText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  nextBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  nextBtnText: {
    color: '#FFF9F4',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
