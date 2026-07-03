import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { apiFetch } from "@/api/client";
import { tokens } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";

const SLIDES = [
  {
    title: "Track every lot",
    body: "Add positions, see unrealised gains, and track your average buy price across multiple purchases.",
  },
  {
    title: "Financial data, not noise",
    body: "Fundamentals, earnings, news — focused on what matters for long-term investors.",
  },
  {
    title: "Your community",
    body: "See how other investors are positioned. Share your portfolio publicly or keep it private.",
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);

  const finish = async () => {
    await apiFetch("/api/v1/settings", {
      method: "PATCH",
      body: JSON.stringify({ onboarded: true }),
    }).catch(() => {});
    router.replace("/(tabs)");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        horizontal
        pagingEnabled
        style={styles.scroll}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(
            e.nativeEvent.contentOffset.x / width,
          );
          setCurrentIndex(newIndex);
        }}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <Text style={[styles.slideNumber, { color: colors.inkFaint }]}>
              {i + 1} / {SLIDES.length}
            </Text>
            <Text style={[styles.slideTitle, { color: colors.ink }]}>
              {s.title}
            </Text>
            <Text style={[styles.slideBody, { color: colors.inkMuted }]}>
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === currentIndex ? colors.ink : colors.border },
            ]}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.ink }]}
        onPress={finish}
        accessibilityLabel="Get started"
      >
        <Text style={[styles.btnText, { color: colors.bg }]}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: 48 },
  scroll: { flex: 1 },
  slide: {
    padding: tokens.spacing.xl,
    justifyContent: "center",
  },
  slideNumber: {
    fontSize: tokens.fontSize.xs,
    marginBottom: tokens.spacing.lg,
  },
  slideTitle: {
    fontSize: tokens.fontSize.xxl,
    fontWeight: tokens.fontWeight.medium,
    marginBottom: tokens.spacing.md,
    letterSpacing: -0.5,
  },
  slideBody: {
    fontSize: tokens.fontSize.md,
    lineHeight: 24,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: tokens.spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  btn: {
    marginHorizontal: tokens.spacing.xl,
    paddingVertical: 16,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
  },
  btnText: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.medium,
  },
});
