import type { InputHTMLAttributes, ReactNode } from "react";

/** Styled native semantics: keyboard, form submission and required/disabled all work. */
export function Checkbox({
  children,
  className = "",
  ...input
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children"> & {
  children: ReactNode;
}) {
  return (
    <label className={`check ${className}`}>
      <input {...input} type="checkbox" />
      <span className="check-label">{children}</span>
    </label>
  );
}
