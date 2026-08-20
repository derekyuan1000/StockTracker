import { Redirect } from "expo-router";

// Route conflict guard: app/(tabs)/analysis.tsx owns /analysis.
// This redirect ensures any deep-link or push to /analysis lands on the tab.
export default function AnalysisRedirect() {
  return <Redirect href="/(tabs)/analysis" />;
}
