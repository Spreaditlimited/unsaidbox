"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { Captcha, useCaptcha } from "../Captcha";
import { FilePicker } from "../ui/FilePicker";
import { Icon } from "../ui/Icon";

export function BlogImageControl({ id, title, canGenerate, compact = false }: { id: string; title: string; canGenerate: boolean; compact?: boolean }) {
  const [pending, setPending] = useState(false);
  const running = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const secure = useCaptcha();
  const router = useRouter();
  async function run(file?: File) {
    if (running.current) return;
    running.current = true;
    setPending(true); setMessage(""); setError("");
    try {
      if (file && file.size > 2 * 1024 * 1024) throw new Error("Choose an image smaller than 2 MB.");
      const form = new FormData();
      if (file) form.set("file", file);
      await secure(form, "blogImage");
      const response = await fetch(`/admin/blog/${id}/image`, { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The cover could not be saved.");
      setMessage(result.success); setOpen(false); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "The request could not connect. Please retry."); }
    finally { running.current = false; setPending(false); }
  }
  return <div className="blog-image-control">
    <Dialog.Root open={open} onOpenChange={value => { if (!pending) setOpen(value); }}>
      <Dialog.Trigger asChild><button type="button" className={compact ? "blog-icon-button" : "button secondary"} aria-label={`Generate cover for ${title}`} title={canGenerate ? "Generate cover image" : "Configure OpenAI to generate images"} disabled={!canGenerate || pending}><Icon name="image" />{!compact && "Generate cover"}</button></Dialog.Trigger>
      <Dialog.Portal><Dialog.Overlay className="modal-overlay" /><Dialog.Content className="app-modal" onEscapeKeyDown={e => { if (pending) e.preventDefault(); }} onPointerDownOutside={e => { if (pending) e.preventDefault(); }}>
        <Dialog.Title className="modal-title">Generate a cover?</Dialog.Title>
        <Dialog.Description className="modal-description">OpenAI will use this article’s title and content to create a cover. This incurs an API charge and replaces the existing cover only after success. Publication status stays unchanged.</Dialog.Description>
        <p>{title}</p><Captcha />
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions"><Dialog.Close asChild><button className="button secondary" disabled={pending}>Cancel</button></Dialog.Close><button className="button" disabled={pending} onClick={() => run()}>{pending ? "Generating and saving…" : "Generate and save"}</button></div>
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
    {!compact && <FilePicker label="Upload cover" help="JPG, PNG or WebP, up to 2 MB. Cropped to a 16:9 landscape cover." disabled={pending} onChoose={run} />}
    {pending && <p className="fine" role="status">Preparing your cover. This can take a few minutes…</p>}
    {message && <p className="action-status" role="status">{message}</p>}
    {error && !open && <p className="form-error" role="alert">{error}</p>}
  </div>;
}
