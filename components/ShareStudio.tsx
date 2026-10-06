"use client";

import { useEffect, useRef, useState } from "react";
import { demoQuestion, demoResponses } from "@/lib/demo";
import { cardFormats, layoutCard } from "@/lib/card-layout.mjs";
import { facebookPostUrl } from "@/lib/share.mjs";

type Format = keyof typeof cardFormats;
const palettes = {
  paper: {
    background: "#FAF9F6",
    ink: "#202332",
    accent: "#5850B8",
    line: "#D8D4E7",
  },
  lavender: {
    background: "#EEEBFA",
    ink: "#292342",
    accent: "#5146A7",
    line: "#CDC7E4",
  },
  ink: {
    background: "#202332",
    ink: "#FFFFFF",
    accent: "#D0C9FF",
    line: "#636779",
  },
};
type Palette = keyof typeof palettes;

export function ShareStudio({
  initialBody,
  question = demoQuestion,
  initialPostUrl = "",
}: { initialBody?: string; question?: string; initialPostUrl?: string } = {}) {
  const [selected, setSelected] = useState(0);
  const [body, setBody] = useState(initialBody ?? demoResponses[0].body);
  const [format, setFormat] = useState<Format>("square");
  const [palette, setPalette] = useState<Palette>("paper");
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [postUrl, setPostUrl] = useState(initialPostUrl);
  const [nativeSharing, setNativeSharing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const responseRef = useRef<HTMLTextAreaElement>(null);
  const validPost = facebookPostUrl(postUrl);

  useEffect(() => {
    setNativeSharing(
      typeof navigator.share === "function" &&
        typeof navigator.canShare === "function",
    );
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      setReady(false);
      return;
    }
    const font = "48px Arial, sans-serif";
    ctx.font = font;
    const layout = layoutCard(
      body,
      format,
      (text: string) => ctx.measureText(text).width,
    );
    const currentPage = Math.min(page, layout.pages.length - 1);
    setPages(layout.pages.length);
    const colours = palettes[palette];
    canvas.width = layout.width;
    canvas.height = layout.height;
    ctx.fillStyle = colours.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = colours.accent;
    ctx.fillRect(88, 85, 46, 4);
    ctx.font = "600 22px Arial, sans-serif";
    ctx.fillText("ANONYMOUS WORDS", 152, 96);
    ctx.font = "italic 120px Georgia, serif";
    ctx.fillText("“", 80, 255);
    ctx.font = font;
    ctx.fillStyle = colours.ink;
    layout.pages[currentPage].forEach((line: string, i: number) =>
      ctx.fillText(line, 88, layout.startY + i * layout.lineHeight),
    );
    ctx.strokeStyle = colours.line;
    ctx.beginPath();
    ctx.moveTo(88, layout.footerY);
    ctx.lineTo(992, layout.footerY);
    ctx.stroke();
    ctx.fillStyle = colours.accent;
    ctx.font = "600 25px Arial, sans-serif";
    ctx.fillText("UnsaidBox", 88, layout.footerY + 55);
    ctx.font = "22px Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(
      `${currentPage + 1} / ${layout.pages.length}`,
      992,
      layout.footerY + 55,
    );
    ctx.textAlign = "left";
    setReady(Boolean(body.trim()));
  }, [body, format, palette, page]);

  function updateBody(value: string) {
    setBody(value);
    setPage(0);
    setStatus("");
    setReady(false);
  }
  function changeSample(index: number) {
    setSelected(index);
    updateBody(demoResponses[index].body);
  }

  async function copyText() {
    setStatus("");
    try {
      await navigator.clipboard.writeText(body.trim());
      setStatus(
        "Response copied. Paste it where you want to share it. Nothing has been posted.",
      );
    } catch {
      responseRef.current?.focus();
      responseRef.current?.select();
      setStatus(
        "Clipboard access isn’t available. The response is selected—use your device’s Copy command.",
      );
    }
  }

  async function exportCard(share: boolean) {
    if (!canvasRef.current || busy || !ready) return;
    setBusy(true);
    setStatus("");
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvasRef.current!.toBlob(
          (value) =>
            value ? resolve(value) : reject(new Error("Export failed")),
          "image/png",
        ),
      );
      const filename = `unsaidbox-${format}-${page + 1}-of-${pages}.png`;
      if (share) {
        const file = new File([blob], filename, { type: "image/png" });
        if (!navigator.canShare?.({ files: [file] })) {
          setStatus(
            "This browser cannot share image files directly. Use Download PNG instead.",
          );
          return;
        }
        await navigator.share({ files: [file] });
        setStatus(
          "Share action completed. Check your chosen app to confirm where the card was sent.",
        );
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setStatus(
          `Download started for card ${page + 1} of ${pages}. Nothing was published.`,
        );
      }
    } catch (error) {
      setStatus(
        error instanceof DOMException && error.name === "AbortError"
          ? "Sharing cancelled. Nothing was marked as posted."
          : "The card could not be shared. Please try downloading it instead.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="studio-grid">
      <div className="studio-controls">
        <section className="panel">
          <div className="panel-title">
            <span className="step-number">01</span>
            <h2>Choose your words</h2>
          </div>
          <p className="fine">
            {initialBody === undefined
              ? "Use a fictional sample or paste your own text."
              : "Your approved response is ready to share."}{" "}
            Changes here only affect the export, not the stored response.
          </p>
          {initialBody === undefined && (
            <div className="sample-picker" aria-label="Sample responses">
              {demoResponses.map((response, index) => (
                <button
                  className={selected === index ? "sample active" : "sample"}
                  key={response.id}
                  onClick={() => changeSample(index)}
                  aria-pressed={selected === index}
                  disabled={busy}
                >
                  Sample {index + 1}
                </button>
              ))}
            </div>
          )}
          <label htmlFor="share-response">Response text</label>
          <textarea
            ref={responseRef}
            id="share-response"
            rows={7}
            maxLength={5000}
            value={body}
            disabled={busy}
            onChange={(event) => updateBody(event.target.value)}
            aria-describedby="share-help"
          />
          <p className="fine" id="share-help">
            {body.length.toLocaleString()} / 5,000 characters. Review for
            identifying details before sharing. Editing this export does not
            change any original submission.
          </p>
          <button
            className="button secondary full"
            disabled={!body.trim() || busy}
            onClick={copyText}
          >
            Copy response text <span aria-hidden="true">⧉</span>
          </button>
        </section>
        <section className="panel">
          <div className="panel-title">
            <span className="step-number">02</span>
            <h2>Make it feel like you</h2>
          </div>
          <fieldset disabled={busy}>
            <legend>Card format</legend>
            <div className="format-picker">
              {(Object.keys(cardFormats) as Format[]).map((value) => (
                <label
                  className={format === value ? "choice selected" : "choice"}
                  key={value}
                >
                  <input
                    type="radio"
                    name="format"
                    value={value}
                    checked={format === value}
                    onChange={() => {
                      setFormat(value);
                      setPage(0);
                      setStatus("");
                      setReady(false);
                    }}
                  />
                  <span className={`format-icon ${value}`} aria-hidden="true" />
                  <span>
                    {cardFormats[value].label}
                    <small>{cardFormats[value].ratio}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset disabled={busy}>
            <legend>Colour</legend>
            <div className="palette-picker">
              {(Object.keys(palettes) as Palette[]).map((value) => (
                <label
                  className={
                    palette === value
                      ? "swatch-choice selected"
                      : "swatch-choice"
                  }
                  key={value}
                >
                  <input
                    type="radio"
                    name="palette"
                    value={value}
                    checked={palette === value}
                    onChange={() => {
                      setPalette(value);
                      setStatus("");
                      setReady(false);
                    }}
                  />
                  <span className={`swatch ${value}`} aria-hidden="true" />
                  {value[0].toUpperCase() + value.slice(1)}
                </label>
              ))}
            </div>
          </fieldset>
        </section>
        <section className="panel">
          <div className="panel-title">
            <span className="step-number">03</span>
            <h2>Take it to your audience</h2>
          </div>
          <p>
            Posting on a personal Facebook profile? Copy the text above, then
            open your original post and paste it into a comment.
          </p>
          <label htmlFor="facebook-post">
            Original Facebook post <span className="optional">optional</span>
          </label>
          <input
            id="facebook-post"
            type="url"
            placeholder="https://www.facebook.com/…"
            value={postUrl}
            onChange={(event) => setPostUrl(event.target.value)}
            aria-describedby="facebook-help"
            aria-invalid={Boolean(postUrl && !validPost)}
          />
          <p id="facebook-help" className="fine">
            {postUrl && !validPost
              ? "Use an HTTPS link on facebook.com, www.facebook.com, or m.facebook.com."
              : "We only open the link. We cannot automatically post comments to personal profiles."}
          </p>
          {validPost ? (
            <a
              className="button secondary full"
              href={validPost}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Facebook post ↗
            </a>
          ) : null}
        </section>
      </div>
      <aside id="share-preview" className="studio-preview">
        <div className="preview-heading">
          <span className="eyebrow">YOUR SHARE CARD</span>
          <span className="fine">
            {cardFormats[format].width} × {cardFormats[format].height} PNG
          </span>
        </div>
        <div className={`canvas-stage ${format}`}>
          <canvas
            ref={canvasRef}
            aria-label={`Share card ${page + 1} of ${pages}. Full response text is available in the editable field.`}
          />
        </div>
        <div className="pagination">
          <button
            className="button secondary small"
            disabled={page === 0 || busy}
            aria-label="Previous card"
            onClick={() => {
              setPage((value) => value - 1);
              setStatus("");
            }}
          >
            ←
          </button>
          <span>
            Card {page + 1} of {pages}
          </span>
          <button
            className="button secondary small"
            disabled={page + 1 >= pages || busy}
            aria-label="Next card"
            onClick={() => {
              setPage((value) => value + 1);
              setStatus("");
            }}
          >
            →
          </button>
        </div>
        <p className="fine">
          {pages > 1
            ? "Long response? Each numbered card keeps the text readable. Download each card using the arrows above."
            : "This is the exact image that will be downloaded. No screenshot or cropping needed."}
        </p>
        <div className="stack">
          <button
            className="button full"
            disabled={!ready || busy}
            onClick={() => exportCard(false)}
          >
            {busy
              ? "Preparing…"
              : `Download PNG${pages > 1 ? ` · card ${page + 1}` : ""}`}{" "}
            <span aria-hidden="true">↓</span>
          </button>
          {nativeSharing ? (
            <button
              className="button secondary full"
              disabled={!ready || busy}
              onClick={() => exportCard(true)}
            >
              Share image… ↗
            </button>
          ) : null}
        </div>
        <p className="action-status" role="status" aria-live="polite">
          {status}
        </p>
        <p className="fine">
          Exporting does not publish anything on UnsaidBox. Social sharing is
          always your choice.
        </p>
        <details className="source-details">
          <summary>Question behind this response</summary>
          <p>{question}</p>
        </details>
      </aside>
    </div>
  );
}
