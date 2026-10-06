import { SiteShell } from "@/components/SiteShell";
import { TemplateGallery } from "@/components/forms/TemplateGallery";
import "@/app/forms.css";
export const metadata = {
  title: "Anonymous feedback form templates",
  description:
    "Start with thoughtful questions for your course, audience or community. Customise a template and collect anonymous responses privately.",
};
export default function TemplatesPage() {
  return (
    <SiteShell>
      <div className="wrap feedback-gallery-page">
        <header className="feedback-gallery-heading">
          <span className="eyebrow">GOOD QUESTIONS. HONEST ANSWERS.</span>
          <h1>
            Start with a little
            <br />
            <em>inspiration.</em>
          </h1>
          <p>
            Thoughtfully made templates for the things you want to know.
            <br />
            Make one yours, share a link, and give people space to be honest.
          </p>
          <div className="feedback-gallery-promises">
            <span>✧ Ready to customise</span>
            <span>↗ One link to share</span>
            <span>◎ Private by default</span>
          </div>
        </header>
        <TemplateGallery />
      </div>
    </SiteShell>
  );
}
