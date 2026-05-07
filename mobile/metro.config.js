const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Enable SVG import as React components
config.transformer.babelTransformerPath = require.resolve(
  "react-native-svg-transformer"
);

// Remove svg from asset handling
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "svg"
);

// Add svg as source code
config.resolver.sourceExts.push("svg");

module.exports = config;