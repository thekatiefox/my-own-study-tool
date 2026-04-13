import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Text, View } from '@/components/Themed';
import { NewsStory, timeAgo } from '@/lib/news';
import * as WebBrowser from 'expo-web-browser';

interface Props {
  story: NewsStory;
  colors: Record<string, string>;
}

export default function NewsCard({ story, colors }: Props) {
  const handlePress = () => {
    WebBrowser.openBrowserAsync(story.url);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
        {story.title}
      </Text>
      {story.summary ? (
        <View style={styles.summaryBox}>
          {story.summary.split('\n').map((line, i) => (
            <Text key={i} style={[styles.bullet, { color: colors.textSecondary }]}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={styles.meta}>
        <Text style={[styles.source, { color: colors.primary }]}>
          {story.source}
        </Text>
        <Text style={[styles.dot, { color: colors.textSecondary }]}>·</Text>
        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
          {timeAgo(story.time)}
        </Text>
        <Text style={[styles.dot, { color: colors.textSecondary }]}>·</Text>
        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
          ▲ {story.score}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
  },
  summary: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  summaryBox: {
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  bullet: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  source: {
    fontSize: 12,
    fontWeight: '600',
  },
  dot: {
    fontSize: 12,
    marginHorizontal: 5,
  },
  metaText: {
    fontSize: 12,
  },
});
