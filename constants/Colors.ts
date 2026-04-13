// Brand colors
const primary = '#6C5CE7';
const primaryLight = '#A29BFE';
const accent = '#00B894';
const danger = '#E17055';
const warning = '#FDCB6E';

const tintColorLight = primary;
const tintColorDark = primaryLight;

export default {
  light: {
    text: '#2D3436',
    textSecondary: '#636E72',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    tint: tintColorLight,
    tabIconDefault: '#B2BEC3',
    tabIconSelected: tintColorLight,
    primary,
    primaryLight,
    accent,
    danger,
    warning,
    border: '#DFE6E9',
    cardFront: '#FFFFFF',
    cardBack: '#F0EDFF',
  },
  dark: {
    text: '#F8F9FA',
    textSecondary: '#B2BEC3',
    background: '#1A1A2E',
    surface: '#16213E',
    tint: tintColorDark,
    tabIconDefault: '#636E72',
    tabIconSelected: tintColorDark,
    primary,
    primaryLight,
    accent,
    danger,
    warning,
    border: '#2D3436',
    cardFront: '#16213E',
    cardBack: '#1A1A3E',
  },
};
