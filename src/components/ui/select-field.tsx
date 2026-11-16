"use client";

import { Field } from "@base-ui/react/field";
import { Select } from "@base-ui/react/select";
import { RequiredMark } from "./text-field";
import fieldStyles from "./field.module.css";
import styles from "./select-field.module.css";

export type SelectOption<Value extends string> = { value: Value; label: string };

type SelectFieldProps<Value extends string> = {
  label: string;
  name: string;
  options: readonly SelectOption<Value>[];
  placeholder?: string;
  description?: string;
  requiredMessage?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  value?: Value | null;
  defaultValue?: Value | null;
  onValueChange?: (value: Value | null) => void;
  className?: string;
};

/** Labeled single-choice select (Base UI). Popup scales from the trigger, see docs/18 §6. */
export function SelectField<Value extends string>({
  label,
  name,
  options,
  placeholder = "انتخاب کنید",
  description,
  requiredMessage = "یک گزینه را انتخاب کنید.",
  error,
  required,
  disabled,
  value,
  defaultValue,
  onValueChange,
  className,
}: SelectFieldProps<Value>) {
  return (
    <Field.Root
      name={name}
      disabled={disabled}
      invalid={error ? true : undefined}
      className={[fieldStyles.field, className].filter(Boolean).join(" ")}
    >
      <Select.Root<Value>
        items={options}
        required={required}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange ? (next) => onValueChange(next) : undefined}
      >
        <Select.Label className={fieldStyles.label}>
          {label}
          {required ? <RequiredMark /> : null}
        </Select.Label>
        <Select.Trigger className={[fieldStyles.control, styles.trigger].join(" ")}>
          <Select.Value className={styles.value} placeholder={placeholder} />
          <Select.Icon className={styles.icon}>
            <ChevronIcon />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner className={styles.positioner} sideOffset={6} alignItemWithTrigger={false}>
            <Select.Popup className={styles.popup}>
              <Select.List className={styles.list}>
                {options.map((option) => (
                  <Select.Item key={option.value} value={option.value} className={styles.item}>
                    <Select.ItemText>{option.label}</Select.ItemText>
                    <Select.ItemIndicator className={styles.indicator}>
                      <CheckIcon />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      {description ? <Field.Description className={fieldStyles.description}>{description}</Field.Description> : null}
      <Field.Error className={fieldStyles.error} match="valueMissing">
        {requiredMessage}
      </Field.Error>
      {error ? (
        <Field.Error className={fieldStyles.error} match>
          {error}
        </Field.Error>
      ) : null}
    </Field.Root>
  );
}

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path d="M5 7l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path d="M4 9.5l3.2 3.2L14 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
