"use client";
import { useActionState, useRef, useState, startTransition } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Dialog } from "radix-ui";
import { Picker } from "../ui/Picker";
import { Captcha, useCaptcha } from "../Captcha";
import { saveBlog } from "@/app/admin/blog/actions";
import type { Result } from "@/app/actions";

export type BlogDraft = { id: string | null; revision: number; title: string; slug: string; excerpt: string; contentHtml: string; category: string; authorName: string; seoTitle: string; seoDescription: string; imageAlt: string; published: boolean; publishAt: string | null };
export function BlogEditor({ post, categories }: { post: BlogDraft; categories: string[] }) {
  const [draft, setDraft] = useState(post);
  const [date, setDate] = useState(post.publishAt?.slice(0, 10) || "");
  const [time, setTime] = useState(post.publishAt?.slice(11, 16) || "09:00");
  const [confirm, setConfirm] = useState<"publish" | "schedule" | "draft" | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const secure = useCaptcha();
  const [state, submit, pending] = useActionState(async (_: Result, data: FormData) => {
    try { await secure(data, "saveBlog"); }
    catch { return { error: "The security check could not connect. Your draft is still here; please retry." }; }
    return saveBlog(post.id, {}, data);
  }, {});
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, defaultProtocol: "https" } })],
    content: post.contentHtml,
    immediatelyRender: false,
    editorProps: { attributes: { class: "blog-rich-text", role: "textbox", "aria-label": "Article content", "aria-multiline": "true" } },
    onUpdate: ({ editor }) => setDraft(value => ({ ...value, contentHtml: editor.getHTML() })),
  });
  function save(operation: string) {
    if (!form.current || !form.current.reportValidity() || pending) return;
    const data = new FormData(form.current);
    data.set("operation", operation);
    data.set("contentHtml", editor?.getHTML() || draft.contentHtml);
    startTransition(() => submit(data));
    setConfirm(null);
  }
  function field(name: "title" | "slug" | "excerpt" | "authorName" | "seoTitle" | "seoDescription" | "imageAlt", label: string, max: number, required = false, multiline = false) {
    const props = { name, value: draft[name], maxLength: max, required, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(value => ({ ...value, [name]: e.target.value })) };
    return <label>{label}{multiline ? <textarea {...props} rows={3} /> : <input {...props} />}</label>;
  }
  return <>
    <form ref={form} className="app-form blog-editor" onSubmit={e => { e.preventDefault(); if (post.published) setConfirm(post.publishAt && new Date(post.publishAt) > new Date() ? "schedule" : "publish"); else save("draft"); }}>
      <fieldset disabled={pending}>
        <input type="hidden" name="revision" value={post.revision} />
        <section className="panel"><h2>Article</h2>
          {field("title", "Title", 180, true)}
          {field("slug", "URL slug · lowercase words separated by hyphens", 160, true)}
          <p className="fine">Changing a saved slug keeps its old URL as a redirect.</p>
          <div className="blog-fields">{field("authorName", "Author", 100, true)}<Picker name="category" label="Category" defaultValue={draft.category} disabled={pending} options={categories.map(value => ({ value, label: value }))} /></div>
          {field("excerpt", "Excerpt", 500, false, true)}
          <label id="article-editor-label">Article content</label>
          <div className="blog-toolbar" role="group" aria-label="Text formatting">
            <button type="button" onClick={() => editor?.chain().focus().setParagraph().run()}>Paragraph</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>Heading 2</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>Heading 3</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()}>Bold</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()}>Italic</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()}>Bullets</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>Numbered list</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()}>Quote</button>
            <button type="button" onClick={() => { setLink(editor?.getAttributes("link").href || ""); setLinkError(""); setLinkOpen(true); }}>Link</button>
            <button type="button" onClick={() => editor?.chain().focus().undo().run()}>Undo</button>
            <button type="button" onClick={() => editor?.chain().focus().redo().run()}>Redo</button>
          </div>
          <div inert={pending ? true : undefined}><EditorContent editor={editor} /></div>
          <p className="fine">Paste formatted text or use the toolbar. Scripts, embeds and unsupported formatting are removed on save.</p>
        </section>
        <section className="panel"><h2>Search and sharing</h2>
          {field("seoTitle", "SEO title · defaults to the article title", 180)}
          {field("seoDescription", "SEO description · defaults to the excerpt", 320, false, true)}
          {field("imageAlt", "Cover image description", 300)}
        </section>
        <section className="panel"><h2>Publication</h2>
          <p className="fine">All times below are UTC. Articles become public at their saved time. Preview links require administrator sign-in.</p>
          <div className="blog-fields"><label>Publication date (YYYY-MM-DD)<input name="publishDate" placeholder="2026-10-08" value={date} onChange={e => setDate(e.target.value)} inputMode="numeric" /></label><label>Time (HH:MM, UTC)<input name="publishTime" placeholder="09:00" value={time} onChange={e => setTime(e.target.value)} inputMode="numeric" /></label></div>
          <div className="action-row blog-save-actions">
            <button type="submit" className="button">{pending ? "Saving…" : post.published ? "Save changes" : "Save draft"}</button>
            {!post.published && <button type="button" className="button secondary" onClick={() => { if (form.current?.reportValidity()) setConfirm("publish"); }}>Publish now</button>}
            <button type="button" className="button secondary" onClick={() => { if (form.current?.reportValidity()) setConfirm("schedule"); }}>Schedule</button>
            {post.published && <button type="button" className="button secondary" onClick={() => setConfirm("draft")}>Unpublish / cancel schedule</button>}
          </div>
          <Captcha />
        </section>
      </fieldset>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
    </form>
    <Dialog.Root open={Boolean(confirm)} onOpenChange={open => { if (!open) setConfirm(null); }}><Dialog.Portal><Dialog.Overlay className="modal-overlay" /><Dialog.Content className="app-modal"><Dialog.Title className="modal-title">{confirm === "draft" ? "Return this article to draft?" : confirm === "schedule" ? "Schedule this article?" : "Publish these changes?"}</Dialog.Title><Dialog.Description className="modal-description">{confirm === "draft" ? "The article and its cover will no longer be publicly available. Your content remains in the CMS." : confirm === "schedule" ? `The article will become public on ${date || "your chosen date"} at ${time} UTC. Review the content before confirming.` : "The saved article and cover will be publicly available immediately."}</Dialog.Description><div className="modal-actions"><Dialog.Close asChild><button className="button secondary">Cancel</button></Dialog.Close><button className="button" onClick={() => save(confirm!)}>Confirm</button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
    <Dialog.Root open={linkOpen} onOpenChange={setLinkOpen}><Dialog.Portal><Dialog.Overlay className="modal-overlay" /><Dialog.Content className="app-modal"><Dialog.Title className="modal-title">Article link</Dialog.Title><Dialog.Description className="modal-description">Use an https:// address or a local path beginning with /. Leave blank to remove a link.</Dialog.Description><label>Link address<input value={link} onChange={e => setLink(e.target.value)} /></label>{linkError && <p className="form-error" role="alert">{linkError}</p>}<div className="modal-actions"><Dialog.Close asChild><button className="button secondary">Cancel</button></Dialog.Close><button className="button" onClick={() => {
      const href = link.trim();
      if (href && !/^https:\/\/[^\s]+$/.test(href) && !/^\/(?!\/)[^\s]*$/.test(href)) { setLinkError("Enter an HTTPS address or local path."); return; }
      if (href) editor?.chain().focus().extendMarkRange("link").setLink({ href }).run(); else editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkOpen(false);
    }}>Apply link</button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </>;
}
