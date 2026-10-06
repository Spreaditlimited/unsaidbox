"use client";
import { useId, useRef } from "react";

/** Custom page control; the hidden input opens the device's secure file chooser. */
export function FilePicker({
  onChoose,
  disabled,
  label = "Choose photo",
  help = "JPG, PNG or WebP. Up to 2 MB. Photos are centre-cropped to a square.",
}: {
  onChoose: (file: File) => void;
  disabled?: boolean;
  label?: string;
  help?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  return (
    <div className="file-picker">
      <input
        hidden
        type="file"
        ref={input}
        id={id}
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled}
        aria-label={label}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onChoose(file);
          event.target.value = "";
        }}
      />
      <button
        className="button secondary"
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        aria-describedby={`${id}-help`}
      >
        {label}
      </button>
      <p className="fine" id={`${id}-help`}>
        {help}
      </p>
    </div>
  );
}
