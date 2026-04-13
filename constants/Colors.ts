// Blue Bottle–inspired palette
// Clean, minimal: warm whites, soft grays, one restrained accent
const primary = '#6B8F9E';       // muted steel blue (Blue Bottle nod)
const primaryLight = '#A3BFC9';  // light blue-gray
const accent = '#7D9E82';        // sage green
const danger = '#C07060';        // soft terracotta
const warning = '#C9A06A';       // warm amber

const tintColorLight = primary;
const tintColorDark = '#8BB0BF';

export default {
  light: {
    text: '#1A1A1A',              // near-black — high contrast
    textSecondary: '#8C8C8C',     // neutral mid-gray
    background: '#F5F4F2',        // warm paper white
    surface: '#FFFFFF',           // clean white cards
    tint: tintColorLight,
    tabIconDefault: '#BFBFBF',
    tabIconSelected: tintColorLight,
    primary,
    primaryLight,
    accent,
    danger,
    warning,
    border: '#E8E6E3',            // light warm gray
    cardFront: '#FFFFFF',
    cardBack: '#FAFAF8',
  },
  dark: {
    text: '#EBEBEB',              // soft white
    textSecondary: '#858585',     // mid-gray
    background: '#141414',        // near-black
    surface: '#1E1E1E',           // dark card
    tint: tintColorDark,
    tabIconDefault: '#4A4A4A',
    tabIconSelected: tintColorDark,
    primary: '#8BB0BF',           // brighter blue for dark mode
    primaryLight: '#A3C5D3',
    accent,
    danger,
    warning,
    border: '#2A2A2A',            // subtle dark border
    cardFront: '#1E1E1E',
    cardBack: '#242424',
  },
};
