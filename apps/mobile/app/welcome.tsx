import { useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme, type Theme } from "@/theme/ThemeProvider";
import { useUpdateSettings } from "@/api/queries";
import { radius } from "@/theme/tokens";
import { Eyebrow, Heading, Body, Muted } from "@/components/Typography";
import { Button } from "@/components/Button";

const THEMES: { value: Theme; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

const TOTAL_STEPS = 2;

function OptionCard({
  selected,
  label,
  desc,
  onPress,
}: {
  selected: boolean;
  label: string;
  desc: string;
  onPress: () => void;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: selected ? t.primary : t.hairline,
        backgroundColor: selected ? t.primary + "14" : "transparent",
        borderRadius: radius.sm,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <Body medium size={14}>
        {label}
      </Body>
      <Muted size={11} style={{ marginTop: 2 }}>
        {desc}
      </Muted>
    </Pressable>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const { theme, setTheme, t } = useTheme();
  const { mutateAsync: save, isPending: saving } = useUpdateSettings();
  const [portfolioPublic, setPortfolioPublic] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const progress = (step / TOTAL_STEPS) * 100;

  async function handleSave() {
    try {
      await save({ portfolioPublic, theme, onboarded: true });
      router.replace("/(tabs)/dashboard");
    } catch {
      // Mutation error is visible via react-query devtools / retry; keep the
      // user on this screen rather than stranding them mid-onboarding.
    }
  }

  async function handleSkip() {
    try {
      await save({ onboarded: true });
      router.replace("/(tabs)/dashboard");
    } catch {
      // no-op — stay on screen, user can retry
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.canvas }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 56, paddingBottom: 24 }}>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 16 }}>
          <Muted size={11} style={{ textTransform: "uppercase", letterSpacing: 0.8 }}>
            Step {step} of {TOTAL_STEPS}
          </Muted>
        </View>
        <Eyebrow>Get started</Eyebrow>
        <Heading level={1} style={{ marginTop: 8 }}>
          {step === 1 ? "Set your visibility" : "Choose your look"}
        </Heading>
        <View
          style={{
            marginTop: 20,
            height: 4,
            borderRadius: radius.full,
            backgroundColor: t.surfaceElevated,
            overflow: "hidden",
          }}
        >
          <LinearGradient
            colors={["#fc4c02", "#ef2cc1", "#bdbbff"]}
            locations={[0, 0.48, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: "100%", width: `${progress}%`, borderRadius: radius.full }}
          />
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        {step === 1 ? (
          <View>
            <Body medium size={14}>
              Portfolio visibility
            </Body>
            <Muted size={12} style={{ marginTop: 2, marginBottom: 16 }}>
              Would you like to share your trades with the community?
            </Muted>
            <View style={{ gap: 8 }}>
              <OptionCard
                selected={!portfolioPublic}
                label="Private"
                desc="Only you can see your portfolio"
                onPress={() => setPortfolioPublic(false)}
              />
              <OptionCard
                selected={portfolioPublic}
                label="Public"
                desc="Your trades appear on the community feed"
                onPress={() => setPortfolioPublic(true)}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 32 }}>
              <View style={{ flex: 1 }}>
                <Button title="Continue" onPress={() => setStep(2)} />
              </View>
              <Button title="Skip" variant="ghost" onPress={handleSkip} disabled={saving} />
            </View>
          </View>
        ) : (
          <View>
            <Body medium size={14}>
              Appearance
            </Body>
            <Muted size={12} style={{ marginTop: 2, marginBottom: 16 }}>
              Pick the theme that suits you. You can change it any time in Settings.
            </Muted>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {THEMES.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setTheme(opt.value)}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: theme === opt.value ? t.primary : t.hairline,
                    backgroundColor: theme === opt.value ? t.primary + "14" : "transparent",
                    borderRadius: radius.sm,
                    paddingVertical: 10,
                    alignItems: "center",
                  }}
                >
                  <Body medium size={13}>
                    {opt.label}
                  </Body>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 32 }}>
              <View style={{ flex: 1 }}>
                <Button title={saving ? "Saving…" : "Get started"} onPress={handleSave} loading={saving} />
              </View>
              <Button title="Back" variant="ghost" onPress={() => setStep(1)} disabled={saving} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
