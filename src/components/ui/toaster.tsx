"use client";

import { Toaster as SonnerToaster } from "sonner";
import styles from "./toaster.module.css";

/**
 * Single toast region (docs/18 §7): bottom, Sonner's 400ms ease, swipe down or toward the
 * end (left in RTL). Show one with `toast` from "sonner"; never announce a success that did not happen.
 */
export function Toaster() {
  return (
    <SonnerToaster
      dir="rtl"
      position="bottom-center"
      swipeDirections={["bottom", "left"]}
      containerAriaLabel="اعلان‌ها"
      richColors
      closeButton
      className={styles.toaster}
      toastOptions={{ className: styles.toast, closeButtonAriaLabel: "بستن اعلان" }}
    />
  );
}
