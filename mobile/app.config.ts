import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "StockTracker",
  slug: "stocktracker",
  version: "1.0.0",
  orientation: "portrait",
  newArchEnabled: true,
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#1C1B18",
  },
  scheme: "stocktracker",
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.stocktracker.app",
    buildNumber: "1",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#1C1B18",
    },
    package: "com.stocktracker.app",
    versionCode: 1,
    googleServicesFile: "./google-services.json",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-font",
    [
      "expo-notifications",
      {
        icon: "./assets/icon.png",
        color: "#1C1B18",
        sounds: [],
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: "your-eas-project-id",
    },
  },
});
