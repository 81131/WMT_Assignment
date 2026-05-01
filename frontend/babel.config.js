module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Note: react-native-reanimated/plugin is NOT included here because:
    // 1. We're not using Reanimated animated values/hooks directly
    // 2. It requires react-native-worklets which has native build requirements
    // 3. Basic React Native animations (Animated API) work without it
    plugins: [],
  };
};
