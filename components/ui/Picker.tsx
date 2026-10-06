"use client";

import { useId, useState } from "react";
import { Select } from "radix-ui";

type Option = { value: string; label: string; disabled?: boolean };

/** All option pickers use this accessible, themed control, never a native menu. */
export function Picker({
  name,
  label,
  defaultValue,
  options,
  disabled = false,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: readonly Option[];
  disabled?: boolean;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="picker-field">
      <label id={`${id}-label`} htmlFor={id}>
        {label}
      </label>
      <input type="hidden" name={name} value={value} disabled={disabled} />
      <Select.Root value={value} onValueChange={setValue} disabled={disabled}>
        <Select.Trigger
          id={id}
          className="picker-trigger"
          aria-labelledby={`${id}-label`}
        >
          <Select.Value />
          <Select.Icon className="picker-chevron">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="m6 9 6 6 6-6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className="picker-content"
            position="popper"
            sideOffset={6}
            collisionPadding={12}
          >
            <Select.ScrollUpButton className="picker-scroll">
              ↑
            </Select.ScrollUpButton>
            <Select.Viewport className="picker-viewport">
              {options.map((option) => (
                <Select.Item
                  className="picker-option"
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="picker-check">
                    ✓
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
            <Select.ScrollDownButton className="picker-scroll">
              ↓
            </Select.ScrollDownButton>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
