import { useWindowDimensions } from "react-native";

export const SIDEBAR_WIDTH = 200;
export const TABLET_BREAKPOINT = 768;

export function useIsTablet(): boolean {
  return useWindowDimensions().width >= TABLET_BREAKPOINT;
}
