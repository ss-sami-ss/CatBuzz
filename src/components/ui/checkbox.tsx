"use client";

import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Field } from "@base-ui/react/field";
import type { ReactNode } from "react";
import styles from "./checkbox.module.css";

type CheckboxProps = {
  name: string;
  children: ReactNode;
  description?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  requiredMessage?: string;
};

/** Checkbox with the whole row as the 44px target; label text is the accessible name. */
export function Checkbox({
  name,
  children,
  description,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  required,
  requiredMessage = "برای ادامه این گزینه را تأیید کنید.",
}: CheckboxProps) {
  return (
    <Field.Root name={name} disabled={disabled} className={styles.field}>
      <Field.Label className={styles.row}>
        <BaseCheckbox.Root
          className={styles.box}
          checked={checked}
          defaultChecked={defaultChecked}
          onCheckedChange={onCheckedChange ? (next) => onCheckedChange(next) : undefined}
          required={required}
        >
          <BaseCheckbox.Indicator className={styles.indicator}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </BaseCheckbox.Indicator>
        </BaseCheckbox.Root>
        <span className={styles.text}>{children}</span>
      </Field.Label>
      {description ? <Field.Description className={styles.description}>{description}</Field.Description> : null}
      <Field.Error className={styles.error} match="valueMissing">
        {requiredMessage}
      </Field.Error>
    </Field.Root>
  );
}
