"use client";
import { useId, useState, type InputHTMLAttributes } from "react";

const icons = {
  email: "M3 5h18v14H3z m0 1 9 7 9-7",
  password: "M6 10h12v11H6z M8 10V7a4 4 0 0 1 8 0v3 M12 14v3",
  name: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M4 21v-2a8 8 0 0 1 16 0v2",
  username:
    "M16 8v7a2 2 0 0 0 4 0v-3a8 8 0 1 0-4 7 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
};
export function AuthField({
  label,
  icon,
  hint,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: keyof typeof icons;
  hint?: string;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const password = input.type === "password";
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-input-wrap">
        <svg
          className="auth-input-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={icons[icon]} />
        </svg>
        <input
          {...input}
          id={id}
          type={password && visible ? "text" : input.type}
          data-sensitive={password ? "true" : undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={password ? "auth-password-input" : undefined}
        />
        {password && (
          <button
            type="button"
            className="auth-password-toggle"
            aria-label={`${visible ? "Hide password" : "Show password"}: ${label}`}
            aria-pressed={visible}
            aria-controls={id}
            disabled={input.disabled}
            onClick={() => setVisible((v) => !v)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
              {visible && <path d="m3 3 18 18" />}
            </svg>
          </button>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="auth-field-hint">
          {hint}
        </p>
      )}
    </div>
  );
}
