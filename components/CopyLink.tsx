"use client";
import { useState, useRef, useEffect } from "react";
export function CopyLink({
  path,
  label = "Copy link",
}: {
  path: string;
  label?: string;
}) {
  const [url, setUrl] = useState(path);
  const [status, setStatus] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setUrl(new URL(path, window.location.origin).href);
  }, [path]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copied.");
    } catch {
      input.current?.focus();
      input.current?.select();
      setStatus("Use your device’s Copy command on the selected link.");
    }
  }
  return (
    <div className="copy-link">
      <label>
        {label}
        <input ref={input} readOnly value={url} />
      </label>
      <button type="button" className="button secondary" onClick={copy}>
        {label}
      </button>
      <p className="fine" role="status">
        {status}
      </p>
    </div>
  );
}
