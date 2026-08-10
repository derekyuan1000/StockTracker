import { View, Pressable } from "react-native";
import { useTheme, type Theme } from "@/theme/ThemeProvider";
import { useSettings, useUpdateSettings } from "@/api/queries";
import { useLocalSetting } from "@/hooks/useLocalSetting";
import { useAuth } from "@/auth/AuthProvider";
import { Screen } from "@/components/Screen";
import { Card, Hairline, Row } from "@/components/Card";
import { Heading, Body, Muted } from "@/components/Typography";
import { Toggle } from "@/components/Toggle";
import { Button } from "@/components/Button";
import { CardSkeleton } from "@/components/Skeleton";
import { radius } from "@/theme/tokens";

const THEMES: { value: Theme; label: string; description: string }[] = [
  { value: "dark", label: "Dark", description: "Easy on the eyes in low light" },
  { value: "light", label: "Light", description: "Classic bright interface" },
  { value: "system", label: "System", description: "Follows your OS preference" },
];

const DEFAULT_RANGES = ["1D", "1M", "6M", "1Y", "All"] as const;

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card style={{ marginBottom: 16 }}>
      <Body medium size={15}>
        {title}
      </Body>
      {description ? (
        <Muted size={12} style={{ marginTop: 2, marginBottom: 12 }}>
          {description}
        </Muted>
      ) : (
        <View style={{ marginBottom: 4 }} />
      )}
      {children}
    </Card>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Row style={{ paddingVertical: 10 }}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Body size={14}>{label}</Body>
        {description ? (
          <Muted size={11} style={{ marginTop: 2 }}>
            {description}
          </Muted>
        ) : null}
      </View>
      {children}
    </Row>
  );
}

export default function SettingsScreen() {
  const { t, theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const { data: settings, isLoading } = useSettings();
  const { mutate: save, isPending: saving } = useUpdateSettings();
  const [defaultRange, setDefaultRange] = useLocalSetting("st-default-range", "1Y");

  if (isLoading || !settings) {
    return (
      <Screen>
        <CardSkeleton height={140} />
        <View style={{ height: 16 }} />
        <CardSkeleton height={140} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Heading level={1} style={{ marginBottom: 20 }}>
        Settings
      </Heading>

      <SectionCard
        title="Portfolio visibility"
        description="When enabled, your name and trades appear on the community feed and leaderboard."
      >
        <SettingRow label="Public portfolio" description="Visible to everyone">
          <Toggle
            checked={settings.portfolioPublic}
            onChange={(v) => save({ portfolioPublic: v })}
            disabled={saving}
          />
        </SettingRow>
      </SectionCard>

      <SectionCard title="Appearance" description="Choose how StockTracker looks for you.">
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
          {THEMES.map((opt) => (
            <Pressable
              key={opt.value}
              disabled={saving}
              onPress={() => {
                setTheme(opt.value);
                save({ theme: opt.value });
              }}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: theme === opt.value ? t.primary : t.hairline,
                backgroundColor: theme === opt.value ? t.primary + "14" : "transparent",
                borderRadius: radius.sm,
                padding: 10,
              }}
            >
              <Body medium size={13}>
                {opt.label}
              </Body>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title="Dashboard"
        description="The time range shown when you first open the dashboard."
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {DEFAULT_RANGES.map((r) => (
            <Pressable
              key={r}
              onPress={() => setDefaultRange(r)}
              style={{
                borderRadius: radius.sm,
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: defaultRange === r ? t.primary : t.surfaceElevated,
              }}
            >
              <Body medium size={12} style={{ color: defaultRange === r ? t.onPrimary : t.textMuted }}>
                {r}
              </Body>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <Hairline style={{ marginVertical: 8 }} />

      <Button title="Sign out" variant="ghost" onPress={signOut} style={{ marginTop: 12 }} />
    </Screen>
  );
}
