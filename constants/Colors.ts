// Japanese coffee shop palette
// Inspired by: light wood, concrete, warm amber backlighting, matcha
const primary = '#B8845C';       // warm caramel — the "backlighting"
const primaryLight = '#D4B896';  // light maple wood
const accent = '#7B9E87';        // matcha green
const danger = '#C47D5A';        // terracotta
const warning = '#D4A574';       // warm amber

const tintColorLight = primary;
const tintColorDark = '#D4A574';

export default {
  light: {
    text: '#2C2420',              // dark walnut
    textSecondary: '#8B8680',     // concrete gray
    background: '#F5F0EB',        // warm off-white concrete
    surface: '#FFFFFF',
    tint: tintColorLight,
    tabIconDefault: '#B5AFA8',    // muted concrete
    tabIconSelected: tintColorLight,
    primary,
    primaryLight,
    accent,
    danger,
    warning,
    border: '#E0D8D0',            // warm light border
    cardFront: '#FFFFFF',
    cardBack: '#FAF4ED',          // light warm linen
  },
  dark: {
    text: '#F0EBE5',              // warm white
    textSecondary: '#9B9590',     // warm gray
    background: '#1A1816',        // dark charcoal concrete
    surface: '#252220',           // slightly lighter dark
    tint: tintColorDark,
    tabIconDefault: '#5C5753',    // muted dark
    tabIconSelected: tintColorDark,
    primary: '#D4A574',           // brighter amber for dark mode
    primaryLight: '#E8C9A0',
    accent,
    danger,
    warning,
    border: '#3A3633',            // dark warm border
    cardFront: '#252220',
    cardBack: '#2D2926',          // subtle warm shift
  },
};
