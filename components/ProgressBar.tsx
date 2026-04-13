import React from 'react';
import { StyleSheet } from 'react-native';
import { View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const progress = total > 0 ? current / total : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.border }]}>
      <View
        style={[
          styles.fill,
          {
            backgroundColor: colors.primary,
            width: `${Math.min(progress * 100, 100)}%`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginHorizontal: 24,
    marginVertical: 8,
  },
  fill: {
    height: '100%',
    borderRadius: 1.5,
  },
});
