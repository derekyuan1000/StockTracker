import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { t } = useTheme();
  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(checked ? 20 : 2, { duration: 150 }) }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: checked ? t.brandPeriwinkle : t.surfaceElevated,
        justifyContent: "center",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Animated.View
        style={[
          { width: 20, height: 20, borderRadius: 10, backgroundColor: "#ffffff" },
          knobStyle,
        ]}
      />
    </Pressable>
  );
}
