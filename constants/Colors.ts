// Japanese coffee shop palette
// Inspired by: raw concrete, light wood grain, warm amber backlight, matcha
const primary = '#A07A56';       // muted warm wood — restrained accent
const primaryLight = '#C9B69C';  // light ash wood
const accent = '#728F7B';        // desaturated matcha
const danger = '#B07260';        // muted terracotta
const warning = '#C49B72';       // warm amber

const tintColorLight = primary;
const tintColorDark = '#C49B72';

export default {
  light: {
    text: '#2A2623',              // dark charcoal (not quite black)
    textSecondary: '#948E87',     // concrete gray
    background: '#F0EDEA',        // cool concrete off-white
    surface: '#F8F7F5',           // warm off-white (not pure white)
    tint: tintColorLight,
    tabIconDefault: '#B5AFA8',
    tabIconSelected: tintColorLight,
    primary,
    primaryLight,
    accent,
    danger,
    warning,
    border: '#E3DED8',            // subtle warm gray
    cardFront: '#F8F7F5',
    cardBack: '#F4F1ED',
  },
  dark: {
    text: '#E8E4DF',              // warm off-white
    textSecondary: '#8A857F',     // muted warm gray
    background: '#191716',        // near-black charcoal
    surface: '#232120',           // dark surface
    tint: tintColorDark,
    tabIconDefault: '#504C48',
    tabIconSelected: tintColorDark,
    primary: '#C49B72',           // brighter amber for dark mode
    primaryLight: '#D9C0A0',
    accent,
    danger,
    warning,
    border: '#333029',            // dark warm border
    cardFront: '#232120',
    cardBack: '#2A2724',
  },
};
