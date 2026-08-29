import { useEffect, useState } from "react";
import { View, Pressable, Alert } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { useTheme, type Theme } from "@/theme/ThemeProvider";
import { useSettings, useUpdateSettings } from "@/api/queries";
import { useLocalSetting } from "@/hooks/useLocalSetting";
import { useAuth } from "@/auth/AuthProvider";
import { setHapticsEnabled, haptic } from "@/haptics";
import { isBiometricEnabled, setBiometricEnabled } from "@/security/BiometricGate";
import { Screen } from "@/components/Screen";
import { Card, Hairline, Row } from "@/components/Card";
import { Heading, Body, Muted } from "@/components/Typography";
import { Toggle } from "@/components/Toggle";
import { Button } from "@/components/Button";
import { CardSkeleton } from "@/components/Skeleton";
import { radius } from "@/theme/tokens";
import { useIsTablet } from "@/hooks/useIsTablet";
import type { HistoryRange } from "@/api/endpoints";
import { refreshWidget } from "@/widget/refreshWidget";

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
  const { signOut, session } = useAuth();
  const { data: settings, isLoading, isError, refetch } = useSettings();
  const { mutate: save, isPending: saving } = useUpdateSettings();
  const isTablet = useIsTablet();
  const [defaultRange, setDefaultRange] = useLocalSetting<HistoryRange>("st-default-range", "1Y");
  const [widgetPeriod1, setWidgetPeriod1] = useLocalSetting<string>("st-widget-period-1", "1M");
  const [widgetPeriod2, setWidgetPeriod2] = useLocalSetting<string>("st-widget-period-2", "All");
  // Tablet right-panel ranges (3 configurable slots)
  const [tabletRange1, setTabletRange1] = useLocalSetting<HistoryRange>("st-tablet-range-1", "1M");
  const [tabletRange2, setTabletRange2] = useLocalSetting<HistoryRange>("st-tablet-range-2", "1Y");
  const [tabletRange3, setTabletRange3] = useLocalSetting<HistoryRange>("st-tablet-range-3", "All");
  const [hapticsOn, setHapticsOn] = useLocalSetting("st-haptics-enabled", true);
  const [biometricOn, setBiometricOn] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  useEffect(() => {
    isBiometricEnabled().then(setBiometricOn);
  }, []);

  async function toggleBiometric(next: boolean) {
    if (biometricBusy) return;
    setBiometricBusy(true);
    try {
      if (next) {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !enrolled) {
          Alert.alert(
            "Biometrics unavailable",
            "Set up Face ID / fingerprint in your device settings first.",
          );
          return;
        }
        const res = await LocalAuthentication.authenticateAsync({
          promptMessage: "Confirm to enable app lock",
        });
        if (!res.success) return;
        await setBiometricEnabled(true);
        setBiometricOn(true);
        haptic.success();
      } else {
        await setBiometricEnabled(false);
        setBiometricOn(false);
      }
    } finally {
      setBiometricBusy(false);
    }
  }

  if (isLoading) {
    return (
      <Screen>
        <CardSkeleton height={140} />
        <View style={{ height: 16 }} />
        <CardSkeleton height={140} />
      </Screen>
    );
  }

  if (isError || !settings) {
    return (
      <Screen>
        <Heading level={1} style={{ marginBottom: 20 }}>
          Settings
        </Heading>
        <Card style={{ marginBottom: 16 }}>
          <Body style={{ marginBottom: 12 }}>
            Could not load settings. Check your connection and try again.
          </Body>
          <Button title="Retry" onPress={() => refetch()} />
        </Card>
        <Hairline style={{ marginVertical: 8 }} />
        <Button title="Sign out" variant="ghost" onPress={signOut} style={{ marginTop: 12 }} />
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
        description={
          isTablet
            ? "Three chart ranges shown in the right panel."
            : "The time range shown when you first open the dashboard."
        }
      >
        {isTablet ? (
          <View style={{ gap: 14 }}>
            {(
              [
                ["Chart 1", tabletRange1, setTabletRange1],
                ["Chart 2", tabletRange2, setTabletRange2],
                ["Chart 3", tabletRange3, setTabletRange3],
              ] as [string, HistoryRange, (v: HistoryRange) => void][]
            ).map(([label, val, setter]) => (
              <View key={label}>
                <Muted size={11} style={{ marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  {label}
                </Muted>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {DEFAULT_RANGES.map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => { haptic.selection(); setter(r); }}
                      style={{
                        borderRadius: radius.sm,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        backgroundColor: val === r ? t.primary : t.surfaceElevated,
                      }}
                    >
                      <Body medium size={12} style={{ color: val === r ? t.onPrimary : t.textMuted }}>
                        {r}
                      </Body>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : (
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
        )}
      </SectionCard>

      <SectionCard title="Widget" description="Choose the two time periods shown in the home screen widget.">
        <View style={{ gap: 14 }}>
          {(
            [
              ["Row 1", widgetPeriod1, setWidgetPeriod1],
              ["Row 2", widgetPeriod2, setWidgetPeriod2],
            ] as [string, string, (v: string) => void][]
          ).map(([label, val, setter]) => (
            <View key={label}>
              <Muted size={11} style={{ marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>
                {label}
              </Muted>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {(["1D", "1W", "1M", "3M", "6M", "YTD", "1Y", "5Y", "All"] as const).map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => {
                      haptic.selection();
                      setter(p);
                      const newP1 = label === "Row 1" ? p : widgetPeriod1;
                      const newP2 = label === "Row 2" ? p : widgetPeriod2;
                      refreshWidget(newP1, newP2).catch(() => {});
                    }}
                    style={{
                      borderRadius: radius.sm,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: val === p ? t.primary : t.surfaceElevated,
                    }}
                  >
                    <Body medium size={12} style={{ color: val === p ? t.onPrimary : t.textMuted }}>
                      {p}
                    </Body>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        title="Security"
        description="Require Face ID / fingerprint each time you open the app."
      >
        <SettingRow label="App lock" description="Unlock with biometrics">
          <Toggle checked={biometricOn} onChange={toggleBiometric} disabled={biometricBusy} />
        </SettingRow>
      </SectionCard>

      <SectionCard title="Preferences" description="Small touches that make the app feel better.">
        <SettingRow label="Haptic feedback" description="Vibrate on key actions">
          <Toggle
            checked={hapticsOn}
            onChange={(v) => {
              setHapticsOn(v);
              setHapticsEnabled(v);
              if (v) haptic.selection();
            }}
          />
        </SettingRow>
      </SectionCard>

      <SectionCard title="Account">
        <SettingRow label="Name">
          <Muted size={13}>{session?.user?.name ?? "—"}</Muted>
        </SettingRow>
        <SettingRow label="Email">
          <Muted size={13}>{session?.user?.email ?? "—"}</Muted>
        </SettingRow>
      </SectionCard>

      <Hairline style={{ marginVertical: 8 }} />

      <Button title="Sign out" variant="ghost" onPress={signOut} style={{ marginTop: 12 }} />
    </Screen>
  );
}
