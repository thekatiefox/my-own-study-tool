import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import * as Haptics from 'expo-haptics';

interface PackCardProps {
  name: string;
  description: string;
  icon: string;
  totalCards: number;
  learnedCards: number;
  dueCards: number;
  onPress: () => void;
}

export default function PackCard({
  name,
  description,
  icon,
  totalCards,
  learnedCards,
  dueCards,
  onPress,
}: PackCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const progress = totalCards > 0 ? learnedCards / totalCards : 0;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.border }]}>
          <Text style={[styles.icon, { color: colors.text }]}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {description}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.accent,
              width: `${progress * 100}%`,
            },
          ]}
        />
      </View>

      <View style={styles.stats}>
        <Text style={[styles.stat, { color: colors.textSecondary }]}>
          {learnedCards}/{totalCards} learned
        </Text>
        {dueCards > 0 && (
          <View style={[styles.dueBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.dueText}>{dueCards} due</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 15,
    fontWeight: '500',
  },
  headerText: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.1,
  },
  progressTrack: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  stat: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  dueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dueText: {
    color: '#FFF9F4',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});
