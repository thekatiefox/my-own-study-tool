import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Difficulty } from '@/types';
import { previewIntervals, formatInterval, DEFAULT_EASE_FACTOR } from '@/lib/sm2';
import * as Haptics from 'expo-haptics';

interface DifficultyButtonsProps {
  onRate: (difficulty: Difficulty) => void;
  disabled?: boolean;
  easeFactor?: number;
  interval?: number;
  repetitions?: number;
}

const BUTTONS: { difficulty: Difficulty; label: string }[] = [
  { difficulty: 'again', label: 'Again' },
  { difficulty: 'hard', label: 'Hard' },
  { difficulty: 'good', label: 'Good' },
  { difficulty: 'easy', label: 'Easy' },
];

export default function DifficultyButtons({
  onRate,
  disabled,
  easeFactor = DEFAULT_EASE_FACTOR,
  interval = 0,
  repetitions = 0,
}: DifficultyButtonsProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const intervals = previewIntervals(easeFactor, interval, repetitions);

  const handleRate = (difficulty: Difficulty) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRate(difficulty);
  };

  const getButtonColor = (difficulty: Difficulty) => {
    switch (difficulty) {
      case 'again': return colors.danger;
      case 'hard': return colors.warning;
      case 'good': return colors.accent;
      case 'easy': return colors.primary;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.prompt, { color: colors.textSecondary }]}>
        How well did you know this?
      </Text>
      <View style={styles.buttonRow}>
        {BUTTONS.map(({ difficulty, label }) => (
          <Pressable
            key={difficulty}
            onPress={() => handleRate(difficulty)}
            disabled={disabled}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: pressed
                  ? getButtonColor(difficulty)
                  : colors.surface,
                borderColor: getButtonColor(difficulty),
                opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.buttonLabel,
                { color: colors.text },
              ]}
            >
              {label}
            </Text>
            <Text style={[styles.sublabel, { color: colors.textSecondary }]}>
              {formatInterval(intervals[difficulty])}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  prompt: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: 'transparent',
  },
  button: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.3,
  },
  sublabel: {
    fontSize: 10,
    marginTop: 3,
    letterSpacing: 0.2,
  },
});
