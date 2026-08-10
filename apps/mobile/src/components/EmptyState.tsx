import { View } from "react-native";
import { Body, Muted } from "./Typography";

export function EmptyState({ icon, title, subtitle }: { icon?: string; title: string; subtitle?: string }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 6 }}>
      {icon ? <Body size={28}>{icon}</Body> : null}
      <Body medium size={15} style={{ textAlign: "center" }}>
        {title}
      </Body>
      {subtitle ? <Muted style={{ textAlign: "center" }}>{subtitle}</Muted> : null}
    </View>
  );
}
