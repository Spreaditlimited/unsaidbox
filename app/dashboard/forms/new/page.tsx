import Link from "next/link";
import { requireAccount } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { FormBuilder } from "@/components/forms/FormBuilder";
import { TemplateGallery } from "@/components/forms/TemplateGallery";
import { getFormTemplate } from "@/lib/form-templates";
export default async function NewFormPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const a = await requireAccount();
  const { template } = await searchParams;
  return (
    <DashboardShell accountId={a.id} name={a.displayName} section="forms">
      <Link className="fine" href="/dashboard/forms">
        ← Your forms
      </Link>
      <div className="feedback-page-heading">
        <span className="eyebrow">A LITTLE CURIOSITY GOES A LONG WAY</span>
        <h1>
          {template
            ? "Make room for honest answers."
            : "What would you like to know?"}
        </h1>
        <p>
          {template
            ? "A few thoughtful questions. One simple link. All yours."
            : "Choose a starting point. You can make every question your own."}
        </p>
      </div>
      {template ? (
        <FormBuilder initial={getFormTemplate(template)} />
      ) : (
        <TemplateGallery />
      )}
    </DashboardShell>
  );
}
