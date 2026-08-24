import { createContext, useContext, useRef, useState } from "react";
import { Animated } from "react-native";
import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_COLLAPSED } from "@/hooks/useIsTablet";
import type { ReactNode } from "react";

type SidebarCtx = {
  collapsed: boolean;
  toggle: () => void;
  animatedWidth: Animated.Value;
};

const SidebarContext = createContext<SidebarCtx>({
  collapsed: false,
  toggle: () => {},
  animatedWidth: new Animated.Value(SIDEBAR_WIDTH),
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const animatedWidth = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      Animated.timing(animatedWidth, {
        toValue: next ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
        duration: 240,
        useNativeDriver: false,
      }).start();
      return next;
    });
  }

  return (
    <SidebarContext.Provider value={{ collapsed, toggle, animatedWidth }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
