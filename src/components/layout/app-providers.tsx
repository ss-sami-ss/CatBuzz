"use client";

import { DirectionProvider } from "@base-ui/react/direction-provider";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";

/** App-wide client context: RTL for Base UI keyboard/positioning, and the single toast region. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <DirectionProvider direction="rtl">
      {children}
      <Toaster />
    </DirectionProvider>
  );
}
