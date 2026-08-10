import { useEffect } from "react";
import { View, type ViewStyle } from "react-native";
import Animated, { useSharedValue, withRepeat, withTiming, useAnimatedStyle } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";

export function Skeleton({ style }: { style?: ViewStyle }) {
  const { t } = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { backgroundColor: t.surfaceElevated, borderRadius: radius.sm, height: 16 },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function CardSkeleton({ height = 100 }: { height?: number }) {
  const { t } = useTheme();
  return (
    <View
      style={{
        height,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: t.hairline,
        padding: 16,
        gap: 8,
      }}
    >
      <Skeleton style={{ width: "40%" }} />
      <Skeleton style={{ width: "70%", height: 24 }} />
    </View>
  );
}
