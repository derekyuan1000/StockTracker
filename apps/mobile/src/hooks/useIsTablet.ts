import { useWindowDimensions } from "react-native";

export const SIDEBAR_WIDTH = 100;
export const SIDEBAR_WIDTH_COLLAPSED = 52;
export const TABLET_BREAKPOINT = 768;

export function useIsTablet(): boolean {
  return useWindowDimensions().width >= TABLET_BREAKPOINT;
}
