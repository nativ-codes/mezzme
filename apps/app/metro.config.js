const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const child_process = require("child_process");

const monorepoRoot = path.resolve(__dirname, "../..");

const pnpmStore = child_process.execSync("pnpm store path").toString().trim();

const config = getDefaultConfig(__dirname);

config.watchFolders = [monorepoRoot, pnpmStore];

config.resolver.nodeModulesPaths = [
  path.join(__dirname, "node_modules"),
  path.join(monorepoRoot, "node_modules"),
];

config.resolver.unstable_enableSymlinks = true;

// Add alias support
config.resolver.alias = {
  "@": path.resolve(__dirname, "."),
};

module.exports = config;
