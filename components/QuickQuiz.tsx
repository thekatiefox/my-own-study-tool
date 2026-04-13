import React, { useState, useEffect } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import { QuizQuestion } from '@/types';
import * as Haptics from 'expo-haptics';

import codeReviewData from '@/data/quizzes/code-review-scenarios.json';
import codeReviewAdvData from '@/data/quizzes/code-review-advanced.json';
import systemDesignData from '@/data/quizzes/system-design-scenarios.json';

// Gather all questions from all quiz packs
const ALL_QUESTIONS: QuizQuestion[] = [
  ...codeReviewData.questions,
  ...codeReviewAdvData.questions,
  ...systemDesignData.questions,
] as QuizQuestion[];

function getRandomQuestion(): QuizQuestion {
  const index = Math.floor(Math.random() * ALL_QUESTIONS.length);
  return ALL_QUESTIONS[index];
}

interface Props {
  colors: Record<string, string>;
  colorScheme: string;
}

export default function QuickQuiz({ colors, colorScheme }: Props) {
  const [question, setQuestion] = useState<QuizQuestion>(getRandomQuestion);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelectedOption(index);
    setShowResult(true);
    if (index === question.correctIndex) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleNewQuestion = () => {
    setQuestion(getRandomQuestion());
    setSelectedOption(null);
    setShowResult(false);
  };

  if (dismissed) {
    return (
      <Pressable
        onPress={() => { setDismissed(false); handleNewQuestion(); }}
        style={[styles.dismissedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Text style={[styles.dismissedText, { color: colors.textSecondary }]}>
          🔍 Tap for another quick quiz
        </Text>
      </Pressable>
    );
  }

  const isCorrect = selectedOption === question.correctIndex;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.headerLabel, { color: colors.primary }]}>🔍 Quick Quiz</Text>
        <Pressable onPress={() => setDismissed(true)}>
          <Text style={[styles.dismissBtn, { color: colors.textSecondary }]}>✕</Text>
        </Pressable>
      </View>

      <Text style={[styles.question, { color: colors.text }]}>
        {question.question}
      </Text>

      {question.scenario ? (
        <View style={[styles.scenario, { backgroundColor: colorScheme === 'dark' ? '#1A1816' : '#F5F0EB', borderColor: colors.border }]}>
          <Text style={[styles.scenarioText, { color: colors.text }]} numberOfLines={4}>
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
            <Text style={[styles.optionText, { color: textColor }]} numberOfLines={2}>
              {option}
            </Text>
          </Pressable>
        );
      })}

      {showResult && (
        <View style={[styles.result, { backgroundColor: isCorrect ? (colorScheme === 'dark' ? '#1E2D22' : '#EDF5EF') : (colorScheme === 'dark' ? '#2D1E1A' : '#F5EDEA') }]}>
          <Text style={[styles.resultTitle, { color: isCorrect ? '#7B9E87' : '#C47D5A' }]}>
            {isCorrect ? '✓ Correct!' : '✗ Not quite'}
          </Text>
          <Text style={[styles.resultText, { color: colors.text }]} numberOfLines={3}>
            {question.explanation}
          </Text>
        </View>
      )}

      {showResult && (
        <Pressable
          onPress={handleNewQuestion}
          style={[styles.nextBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.nextBtnText}>Next Question</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dismissBtn: {
    fontSize: 18,
    padding: 4,
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    marginBottom: 10,
  },
  scenario: {
    padding: 10,
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
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 6,
  },
  optionLetter: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 10,
    width: 18,
    textAlign: 'center',
  },
  optionText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  result: {
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 12,
    lineHeight: 17,
  },
  nextBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  nextBtnText: {
    color: '#FFF9F4',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissedCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  dismissedText: {
    fontSize: 14,
  },
});
