import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Difficulty } from '@/types';
import * as Haptics from 'expo-haptics';

interface DifficultyButtonsProps {
  onRate: (difficulty: Difficulty) => void;
  disabled?: boolean;
}

const BUTTONS: { difficulty: Difficulty; label: string; sublabel: string }[] = [
  { difficulty: 'again', label: 'Again', sublabel: '<1 min' },
  { difficulty: 'hard', label: 'Hard', sublabel: '~1 day' },
  { difficulty: 'good', label: 'Good', sublabel: '~3 days' },
  { difficulty: 'easy', label: 'Easy', sublabel: '~7 days' },
];

export default function DifficultyButtons({ onRate, disabled }: DifficultyButtonsProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

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
        {BUTTONS.map(({ difficulty, label, sublabel }) => (
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
              {sublabel}
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
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: 'transparent',
  },
  button: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sublabel: {
    fontSize: 10,
    marginTop: 2,
  },
});
