"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Drawer } from "@base-ui/react/drawer";
import { useState, type ReactNode } from "react";
import { DESKTOP_QUERY, useMediaQuery } from "./use-media-query";
import styles from "./details-surface.module.css";

/** Peek height of the mobile sheet; the second snap point (1) is full height. */
const SHEET_SNAP_POINTS = ["17rem", 1] as const;

type DetailsSurfaceProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  closeLabel?: string;
  children: ReactNode;
};

/**
 * D26: draggable bottom sheet with snap points on mobile, centered non-draggable
 * Dialog on desktop. Focus trap, Escape and focus return come from Base UI.
 */
export function DetailsSurface(props: DetailsSurfaceProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  return isDesktop ? <DesktopDialog {...props} /> : <MobileSheet {...props} />;
}

function MobileSheet({ open, onOpenChange, title, description, closeLabel = "بستن", children }: DetailsSurfaceProps) {
  const [snapPoint, setSnapPoint] = useState<Drawer.Root.SnapPoint | null>(SHEET_SNAP_POINTS[0]);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    // Every opening starts at the peek snap point.
    setWasOpen(open);
    if (open) setSnapPoint(SHEET_SNAP_POINTS[0]);
  }
  const expanded = snapPoint === 1;

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[...SHEET_SNAP_POINTS]}
      snapPoint={snapPoint}
      onSnapPointChange={setSnapPoint}
    >
      <Drawer.Portal>
        {/* Backdrop has no data-expanded of its own; dim only at the full-height snap point. */}
        <Drawer.Backdrop className={styles.sheetBackdrop} data-expanded={expanded ? "" : undefined} />
        <Drawer.Viewport className={styles.sheetViewport}>
          <Drawer.Popup className={styles.sheet}>
            <div className={styles.dragArea}>
              <div className={styles.handle} aria-hidden="true" />
              <div className={styles.header}>
                <Drawer.Title className={styles.title}>{title}</Drawer.Title>
                <Drawer.Close className={styles.close} aria-label={closeLabel}>
                  <CloseIcon />
                </Drawer.Close>
              </div>
              {description ? <Drawer.Description className={styles.description}>{description}</Drawer.Description> : null}
            </div>
            <Drawer.Content className={styles.sheetBody}>{children}</Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function DesktopDialog({ open, onOpenChange, title, description, closeLabel = "بستن", children }: DetailsSurfaceProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.dialogBackdrop} />
        <Dialog.Viewport className={styles.dialogViewport}>
          <Dialog.Popup className={styles.dialog}>
            <div className={styles.header}>
              <Dialog.Title className={styles.title}>{title}</Dialog.Title>
              <Dialog.Close className={styles.close} aria-label={closeLabel}>
                <CloseIcon />
              </Dialog.Close>
            </div>
            {description ? <Dialog.Description className={styles.description}>{description}</Dialog.Description> : null}
            <div className={styles.dialogBody}>{children}</div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}
