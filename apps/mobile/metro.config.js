// Monorepo Metro config.
//
// packages/api-contracts and packages/shared both ship raw TypeScript with no
// build step (see their package.json `main`), so Metro must be told to look
// outside this app's own directory, transform their TS, and resolve hoisted
// dependencies from the workspace root's node_modules.
const { getDefaultConfig } = require("expo/metro-config");
// metro-config's package.json only exposes deep imports under "private/*" in
// this version — "src/defaults/exclusionList" (the path used in older Metro
// docs/examples) 404s against the package's "exports" map.
const exclusionList = require("metro-config/private/defaults/exclusionList").default;
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const config = getDefaultConfig(projectRoot);

// Windows has no Watchman, so Metro falls back to Node's fs.watch. Watching the
// whole workspace root would crawl src/, drizzle/, .output/, .git/, etc. and is
// slow / prone to EMFILE. Narrow to exactly what mobile imports from outside
// its own tree: the workspace packages, and root node_modules for hoisted deps.
config.watchFolders = [
  path.resolve(workspaceRoot, "packages"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Force a single copy of React / React Native even if npm's hoisting nests one.
// (extraNodeModules alone is enough for this — it's checked before Metro falls
// back to hierarchical lookup. Disabling hierarchical lookup entirely, which an
// earlier version of this config did, breaks resolution of transitive deps
// like `semver` that packages such as react-native-reanimated expect to find
// via normal Node module walk-up rather than declaring directly.)
config.resolver.extraNodeModules = {
  react: path.resolve(workspaceRoot, "node_modules/react"),
  "react-native": path.resolve(workspaceRoot, "node_modules/react-native"),
};

config.resolver.blockList = exclusionList([
  /.*\/\.tanstack\/.*/,
  /.*\/\.output\/.*/,
  /.*\/\.nitro\/.*/,
  /.*\/\.vercel\/.*/,
]);

module.exports = config;
