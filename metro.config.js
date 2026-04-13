const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add wasm to asset extensions so expo-sqlite's wa-sqlite works on web
config.resolver.assetExts = [...(config.resolver.assetExts || []), 'wasm'];

module.exports = config;
