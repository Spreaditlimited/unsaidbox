"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveAvatar, type AvatarResult } from "@/app/avatar-actions";
import { ProfileAvatar } from "./ProfileAvatar";
import { FilePicker } from "./ui/FilePicker";
import { Captcha, useCaptcha } from "./Captcha";

export function ProfilePhotoEditor({
  name,
  version,
  ready,
}: {
  name: string;
  version: string | null;
  ready: boolean;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const secure = useCaptcha();
  const [result, setResult] = useState<AvatarResult>({});
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const currentVersion =
    result.version !== undefined ? result.version : version;
  function choose(photo: File) {
    setResult({});
    setFile(null);
    if (!photo.size || photo.size > 2 * 1024 * 1024) {
      setResult({ error: "Choose a photo smaller than 2 MB." });
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) {
      setResult({ error: "Use a JPG, PNG, or WebP photo." });
      return;
    }
    setFile(photo);
  }
  async function submit(operation: "upload" | "remove") {
    if (inFlight.current || !ready) return;
    inFlight.current = true;
    setPending(true);
    const data = new FormData();
    data.set("operation", operation);
    if (file && operation === "upload") data.set("photo", file);
    try {
      await secure(data, "saveAvatar");
      const response = await saveAvatar(data);
      setResult(response);
      if (response.success) {
        setFile(null);
        router.refresh();
      }
    } catch {
      setResult({ error: "Your photo could not be saved. Please try again." });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return (
    <section
      className="panel editor-panel profile-photo-panel"
      aria-labelledby="profile-photo-heading"
    >
      <h2 id="profile-photo-heading">Profile photo</h2>
      <p className="fine">
        Your photo appears in your user and admin dashboards. It is not
        published on your public page.
      </p>
      {!ready && (
        <p className="notice" role="status">
          Profile photos are awaiting a one-time database setup. Your other
          settings work normally.
        </p>
      )}
      <div className="profile-photo-controls">
        {preview ? (
          <img
            className="profile-photo-preview"
            src={preview}
            alt="Selected photo preview"
            width={88}
            height={88}
          />
        ) : (
          <ProfileAvatar name={name} version={currentVersion} large />
        )}
        <div>
          <FilePicker onChoose={choose} disabled={pending || !ready} />
          {file && (
            <p className="fine">{file.name} · Preview only until saved</p>
          )}
        </div>
      </div>
      {ready && (file || currentVersion) ? <Captcha /> : null}
      <div className="action-row">
        {file && (
          <>
            <button
              className="button"
              disabled={pending}
              onClick={() => submit("upload")}
            >
              {pending ? "Saving…" : "Save photo"}
            </button>
            <button
              className="button secondary"
              disabled={pending}
              onClick={() => {
                setFile(null);
                setResult({});
              }}
            >
              Cancel
            </button>
          </>
        )}
        {!file && currentVersion && (
          <button
            className="button secondary danger"
            disabled={pending || !ready}
            onClick={() => submit("remove")}
          >
            {pending ? "Removing…" : "Remove photo"}
          </button>
        )}
      </div>
      {result.error && (
        <p className="form-error" role="alert">
          {result.error}
        </p>
      )}
      {result.success && (
        <p className="action-status" role="status">
          {result.success}
        </p>
      )}
    </section>
  );
}
