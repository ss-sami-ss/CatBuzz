"use client";

import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import type { ComponentProps } from "react";
import styles from "./tabs.module.css";

/*
 * Styled Base UI Tabs. Arrow keys follow RTL through DirectionProvider.
 * The indicator morphs between tabs (docs/18: --duration-base, --ease-in-out); panels swap instantly.
 */
function join(base: string | undefined, extra: unknown) {
  return typeof extra === "string" ? [base, extra].filter(Boolean).join(" ") : base;
}

export function TabsRoot({ className, ...props }: ComponentProps<typeof BaseTabs.Root>) {
  return <BaseTabs.Root className={join(styles.root, className)} {...props} />;
}

export function TabsList({ className, children, ...props }: ComponentProps<typeof BaseTabs.List>) {
  return (
    <BaseTabs.List className={join(styles.list, className)} {...props}>
      {children}
      <BaseTabs.Indicator className={styles.indicator} />
    </BaseTabs.List>
  );
}

export function TabsTab({ className, ...props }: ComponentProps<typeof BaseTabs.Tab>) {
  return <BaseTabs.Tab className={join(styles.tab, className)} {...props} />;
}

export function TabsPanel({ className, ...props }: ComponentProps<typeof BaseTabs.Panel>) {
  return <BaseTabs.Panel className={join(styles.panel, className)} {...props} />;
}
