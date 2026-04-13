import React from 'react';
import {
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CardContent } from '@/types';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = CARD_WIDTH * 0.85;

interface FlashCardProps {
  card: CardContent;
  isFlipped: boolean;
  onFlip: () => void;
}

export default function FlashCard({ card, isFlipped, onFlip }: FlashCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const flipAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 1 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  }, [isFlipped]);

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const handleFlip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onFlip();
  };

  return (
    <Pressable onPress={handleFlip} style={styles.container}>
      {/* Front of card */}
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.cardFront,
            borderColor: colors.border,
            transform: [{ rotateY: frontInterpolate }],
          },
        ]}
      >
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          QUESTION
        </Text>
        <Text style={[styles.cardText, { color: colors.text }]}>
          {card.front}
        </Text>
        <Text style={[styles.tapHint, { color: colors.textSecondary }]}>
          Tap to flip
        </Text>
      </Animated.View>

      {/* Back of card */}
      <Animated.View
        style={[
          styles.card,
          styles.cardBack,
          {
            backgroundColor: colors.cardBack,
            borderColor: colors.primary,
            transform: [{ rotateY: backInterpolate }],
          },
        ]}
      >
        <Text style={[styles.label, { color: colors.primary }]}>ANSWER</Text>
        <ScrollView
          style={styles.answerScroll}
          contentContainerStyle={styles.answerScrollContent}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          <Text style={[styles.cardText, styles.answerText, { color: colors.text }]}>
            {card.back}
          </Text>
        </ScrollView>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    minHeight: CARD_HEIGHT,
    alignSelf: 'center',
  },
  card: {
    width: '100%',
    minHeight: CARD_HEIGHT,
    borderRadius: 10,
    borderWidth: 1,
    padding: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backfaceVisibility: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardBack: {
    position: 'absolute',
    top: 0,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2.5,
    marginBottom: 20,
  },
  cardText: {
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center',
    fontWeight: '400',
  },
  answerScroll: {
    flex: 1,
    alignSelf: 'stretch',
    maxHeight: CARD_HEIGHT - 80,
  },
  answerScrollContent: {
    paddingBottom: 8,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  tapHint: {
    fontSize: 12,
    marginTop: 20,
    letterSpacing: 0.3,
  },
});
