module.exports = function (api) {
  api.cache(true);
  return {
    presets: [require.resolve("babel-preset-expo")],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./src"],
          alias: {
            "@": "./src",
          },
        },
      ],
    ],
  };
};
