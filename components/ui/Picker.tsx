"use client";

import { useId, useState, type ReactNode } from "react";
import { Select } from "radix-ui";

type Option = { value: string; label: string; disabled?: boolean; icon?: ReactNode };

/** All option pickers use this accessible, themed control, never a native menu. */
export function Picker({
  name,
  label,
  defaultValue,
  options,
  disabled = false,
  value: controlledValue,
  onValueChange,
  iconOnly = false,
  hint,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: readonly Option[];
  disabled?: boolean;
  iconOnly?: boolean;
  hint?: string;
  value?: string;
  onValueChange?: (value:string)=>void;
}) {
  const id = useId();
  const [localValue, setValue] = useState(defaultValue);
  const value=controlledValue??localValue;
  const choose=(next:string)=>{setValue(next);onValueChange?.(next);};
  return (
    <div className="picker-field">
      <label id={`${id}-label`} htmlFor={id}>
        {label}
      </label>
      <input type="hidden" name={name} value={value} disabled={disabled} />
      <Select.Root value={value} onValueChange={choose} disabled={disabled}>
        <Select.Trigger
          id={id}
          className="picker-trigger"
          aria-labelledby={iconOnly ? undefined : `${id}-label`}
          aria-label={iconOnly ? `${label}: ${options.find(option=>option.value===value)?.label}` : undefined}
          title={iconOnly ? label : undefined}
        >
          {iconOnly ? options.find(option=>option.value===value)?.icon : <Select.Value />}
          {!iconOnly && <Select.Icon className="picker-chevron">
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
          </Select.Icon>}
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className={iconOnly ? "picker-content appearance-menu" : "picker-content"}
            position="popper"
            align={iconOnly ? "end" : "start"}
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
                  {option.icon}
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="picker-check">
                    ✓
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
              {hint && <small className="picker-hint">{hint}</small>}
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
