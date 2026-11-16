"use client";

import { Field } from "@base-ui/react/field";
import type { InputHTMLAttributes } from "react";
import styles from "./field.module.css";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "children"> & {
  label: string;
  name: string;
  description?: string;
  /** Message shown when a required field is left empty on submit. */
  requiredMessage?: string;
  /** Error from the server or a custom check; marks the field invalid. */
  error?: string;
  /** Rows for a multi-line field; omit for a single-line input. */
  rows?: number;
  className?: string;
};

/**
 * Labeled input with description and errors linked through Base UI Field (aria-describedby).
 * Pass dir="ltr" for email, phone and codes so digits and Latin text read correctly.
 */
export function TextField({
  label,
  description,
  requiredMessage = "این فیلد را پر کنید.",
  error,
  rows,
  className,
  name,
  disabled,
  required,
  ...inputProps
}: TextFieldProps) {
  return (
    <Field.Root
      name={name}
      disabled={disabled}
      invalid={error ? true : undefined}
      className={[styles.field, className].filter(Boolean).join(" ")}
    >
      <Field.Label className={styles.label}>
        {label}
        {required ? <RequiredMark /> : null}
      </Field.Label>
      <Field.Control
        className={styles.control}
        required={required}
        render={rows ? <textarea rows={rows} /> : undefined}
        {...inputProps}
      />
      {description ? <Field.Description className={styles.description}>{description}</Field.Description> : null}
      <Field.Error className={styles.error} match="valueMissing">
        {requiredMessage}
      </Field.Error>
      {error ? (
        <Field.Error className={styles.error} match>
          {error}
        </Field.Error>
      ) : null}
    </Field.Root>
  );
}

/** Visual-only star; the control itself carries required / aria-required for screen readers. */
export function RequiredMark() {
  return (
    <span className={styles.required} aria-hidden="true">
      {" *"}
    </span>
  );
}
