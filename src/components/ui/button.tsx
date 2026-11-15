import type { ButtonHTMLAttributes } from "react";
import styles from "./button.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "sm";
  block?: boolean;
};

export function Button({ variant = "primary", size = "md", block = false, className, type = "button", ...rest }: ButtonProps) {
  const classes = [styles.button, styles[variant], styles[size], block ? styles.block : undefined, className]
    .filter(Boolean)
    .join(" ");
  return <button type={type} className={classes} {...rest} />;
}
