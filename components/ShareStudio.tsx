"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/Checkbox";
import styles from './ShareStudio.module.css';
import { demoQuestion, demoResponses } from "@/lib/demo";
import { cardFormats, layoutCard } from "@/lib/card-layout.mjs";
import { copyResponseAndOpenPost, copyResponseText, facebookPostUrl } from "@/lib/share.mjs";

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
  brand = null,
}: { initialBody?: string; question?: string; initialPostUrl?: string; brand?: { name: string; accent: string; hideAttribution: boolean; logo: string | null } | null } = {}) {
  const [brandLogo, setBrandLogo] = useState<HTMLImageElement | null>(null);
  const [hideAttribution, setHideAttribution] = useState(brand?.hideAttribution ?? false);
  const [includeQuestion, setIncludeQuestion] = useState(false);
  const [selected, setSelected] = useState(0);
  const [body, setBody] = useState(initialBody ?? demoResponses[0].body);
  const [format, setFormat] = useState<Format>("square");
  const [palette, setPalette] = useState<Palette>("paper");
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [facebookStatus, setFacebookStatus] = useState("");
  const [nativeSharing, setNativeSharing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const responseRef = useRef<HTMLTextAreaElement>(null);
  const facebookSharing = useRef(false);
  const validPost = facebookPostUrl(initialPostUrl);

  useEffect(() => {
    setBrandLogo(null);
    if (!brand?.logo) return;
    const image = new Image();
    let active = true;
    image.onload = () => { if (active) setBrandLogo(image); };
    image.onerror = () => { if (active) setStatus('Your logo could not be loaded. Reopen the studio or remove the logo in billing settings.'); };
    image.src = brand.logo;
    return () => { active = false; image.onload = null; image.onerror = null; };
  }, [brand?.logo]);

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
    const font = "400 48px Arial, sans-serif";
    const questionFont = "700 48px Arial, sans-serif";
    ctx.font = font;
    const layout = layoutCard(
      body,
      format,
      (text: string) => { ctx.font=font; return ctx.measureText(text).width; },
      {question:includeQuestion?question:'',measureQuestion:(text: string)=>{ctx.font=questionFont;return ctx.measureText(text).width;}},
    );
    const currentPage = Math.min(page, layout.pages.length - 1);
    setPages(layout.pages.length);
    const colours = { ...palettes[palette], ...(brand && palette !== 'ink' ? { accent: brand.accent } : {}) };
    canvas.width = layout.width;
    canvas.height = layout.height;
    ctx.fillStyle = colours.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = colours.accent;
    ctx.fillRect(88, 85, 46, 4);
    ctx.font = "600 22px Arial, sans-serif";
    ctx.fillText(layout.hasQuestion ? "QUESTION & ANSWER" : "ANONYMOUS WORDS", 152, 96);
    ctx.font = "italic 120px Georgia, serif";
    if(!layout.hasQuestion) ctx.fillText("“", 80, 255);
    ctx.font = font;
    ctx.fillStyle = colours.ink;
    layout.pageLines[currentPage].forEach((line: {text:string;kind:string}, i: number) => {
      ctx.font = line.kind==='question' ? questionFont : font;
      // Keep the question in our palette's purple, including the lighter dark-card shade.
      ctx.fillStyle = line.kind==='question' ? palettes[palette].accent : colours.ink;
      ctx.fillText(line.text, 88, layout.startY + i * layout.lineHeight);
    });
    ctx.strokeStyle = colours.line;
    ctx.beginPath();
    ctx.moveTo(88, layout.footerY);
    ctx.lineTo(992, layout.footerY);
    ctx.stroke();
    ctx.fillStyle = colours.accent;
    ctx.font = "600 25px Arial, sans-serif";
    if (brandLogo) ctx.drawImage(brandLogo, 88, layout.footerY + 16, 56, 56);
    const attribution = [brand?.name, brand && hideAttribution ? '' : 'UnsaidBox'].filter(Boolean).join(' · ');
    ctx.fillText(attribution, brandLogo ? 164 : 88, layout.footerY + 55, brandLogo ? 680 : 756);
    ctx.font = "22px Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(
      `${currentPage + 1} / ${layout.pages.length}`,
      992,
      layout.footerY + 55,
    );
    ctx.textAlign = "left";
    setReady(Boolean(body.trim()) && (!brand?.logo || Boolean(brandLogo)));
  }, [body, format, palette, page, brand, brandLogo, hideAttribution, includeQuestion, question]);

  function updateBody(value: string) {
    setBody(value);
    setPage(0);
    setStatus("");
    setFacebookStatus("");
    setReady(false);
  }
  function changeSample(index: number) {
    setSelected(index);
    updateBody(demoResponses[index].body);
  }

  async function copyText() {
    setStatus("");
    try {
      await copyResponseText(body.trim());
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

  async function shareToFacebookPost() {
    if (!validPost || !body.trim() || busy || facebookSharing.current) return;
    facebookSharing.current = true;
    setBusy(true);
    setStatus("");
    setFacebookStatus("");
    try {
      const result = await copyResponseAndOpenPost(body, validPost, {
        copy: (text: string) => copyResponseText(text),
        open: () => window.open('about:blank', '_blank'),
      });
      if (result === 'copy-failed') {
        setBusy(false);
        // Allow React to re-enable the textarea before selecting the manual fallback.
        requestAnimationFrame(() => {
          responseRef.current?.focus();
          responseRef.current?.select();
        });
        setFacebookStatus('Clipboard access isn’t available. Select and copy the response above, then use Open original Facebook post below. Nothing has been posted.');
      } else if (result === 'opened') {
        setFacebookStatus('Response copied and Facebook opened in a new tab. Paste into a comment and submit it yourself. Nothing has been posted automatically.');
      } else if (result === 'copied') {
        setFacebookStatus('Response copied. Your browser could not open the new tab. Use Open original Facebook post below, then paste and submit your comment.');
      }
    } finally {
      facebookSharing.current = false;
      setBusy(false);
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
    <div className={`studio-grid ${styles.studio}`}>
        <section className={`panel ${styles.editor}`}>
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

        </section>
      <aside id="share-preview" className={`studio-preview ${styles.preview}`}>
        <div className="preview-heading">
          <div><span className="eyebrow">LIVE PREVIEW</span><h2>Your finished card</h2></div>
          <span className="fine">
            {cardFormats[format].width} × {cardFormats[format].height} PNG
          </span>
        </div>
        <div className={`canvas-stage ${format}`}>
          <canvas
            ref={canvasRef}
            aria-label={`Share card ${page + 1} of ${pages}.${includeQuestion && question.trim() ? ` Question included in bold: ${question}.` : ''} Full response text is available in the editable field.`}
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
            ? "Long response? Each numbered card keeps the text readable. Use the arrows to review each card, then download it in the sharing section below."
            : "This is the exact image that will be downloaded. No screenshot or cropping needed."}
        </p>
        <section className={`panel ${styles.design}`}>
          <div className="panel-title">
            <span className="step-number">02</span>
            <h2>Make it feel like you</h2>
          </div>
          <p className="fine">Choose a size and colour. Your preview updates as you go.</p>
          {question.trim()?<div className={styles.questionOption}>
            <Checkbox checked={includeQuestion} disabled={busy} onChange={event=>{
              setIncludeQuestion(event.target.checked);setPage(0);setReady(false);setStatus('');
            }}>Include the question on the card</Checkbox>
            <p className="fine">The question appears in bold before the answer. Long text continues across numbered cards.</p>
          </div>:null}
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
        {question.trim()?<details className="source-details">
          <summary>Question behind this response</summary>
          <p>{question}</p>
        </details>:null}
      </aside>

        {brand ? <section className={styles.branding} aria-labelledby="card-branding-title">
          <span className="eyebrow">INCLUDED WITH PRO</span>
          <h2 id="card-branding-title">Make this card yours</h2>
          <p>Remove the UnsaidBox name before you download or share.</p>
          <Checkbox checked={hideAttribution} disabled={busy} onChange={event => {
            setHideAttribution(event.target.checked);
            setReady(false);
            setStatus('Branding updated for this card and all its pages.');
          }}>Remove UnsaidBox branding</Checkbox>
          <p className={styles.help}>{hideAttribution ? 'Your download will not include the UnsaidBox name.' : 'The UnsaidBox name is currently included.'} This choice applies to this share session.</p>
          <Link href="/dashboard/billing" target="_blank" rel="noopener noreferrer">Set your default, name & logo ↗<span className={styles.help}> Opens branding settings in a new tab; your card stays here.</span></Link>
        </section> : null}
        <section className={`panel ${styles.audience}`}>
          <div className="panel-title">
            <span className="step-number">03</span>
            <h2>Take it to your audience</h2>
          </div>
          <p>Download your card, share the image, or post the response text. Choose what works for your audience.</p>
          {validPost ? <div className={styles.originalPost}>
            <h3>Original Facebook post</h3>
            <p>Copy your edited response and open the post in one step. Then paste it into a comment and submit it on Facebook.</p>
            <button type="button" className={`button full ${styles.facebookAction}`} disabled={!body.trim() || busy} onClick={shareToFacebookPost}>
              Copy response &amp; open Facebook post <span aria-hidden="true">↗</span>
            </button>
            <p className={styles.facebookHint}>Opens a new tab. Nothing is posted automatically.</p>
            <p className="action-status" role="status" aria-live="polite">{facebookStatus}</p>
            <a href={validPost} target="_blank" rel="noopener noreferrer">Open original Facebook post ↗</a>
          </div> : null}
        <div className="stack">
          <button
            className="button secondary full"
            disabled={!body.trim() || busy}
            onClick={copyText}
          >
            Copy response text <span aria-hidden="true">⧉</span>
          </button>
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

        </section>
    </div>
  );
}
