import { Modal, Pressable, View, KeyboardAvoidingView, Platform } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import type { ReactNode } from "react";

/**
 * Minimal bottom-sheet-style modal. Not a full gesture-driven sheet library —
 * v1 doesn't need drag-to-dismiss, just a modal anchored to the bottom edge.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: t.surfaceCard,
                borderTopLeftRadius: radius.md,
                borderTopRightRadius: radius.md,
                padding: 20,
                paddingBottom: 32,
              }}
            >
              {children}
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
