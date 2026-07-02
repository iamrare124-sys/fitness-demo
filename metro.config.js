// metro.config.js
// CRITICAL: The unstable_enablePackageExports:false workaround is required
// for @supabase/supabase-js compatibility with Metro bundler.
// See: https://github.com/supabase/supabase-js/issues/1400
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix supabase-js ws/stream Node module issue in React Native
config.resolver.unstable_enablePackageExports = false;

// Ensure SVG works
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

module.exports = config;
