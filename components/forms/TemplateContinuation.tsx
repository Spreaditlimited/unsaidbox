"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formTemplates } from "@/lib/form-templates";
export function TemplateContinuation() {
  const [id, setId] = useState("");
  useEffect(() => {
    try {
      const value = sessionStorage.getItem("unsaidbox:template");
      if (formTemplates.some((t) => t.templateId === value)) setId(value!);
    } catch {}
  }, []);
  return id ? (
    <Link
      className="workspace-help"
      href={`/dashboard/forms/new?template=${id}`}
    >
      Continue your template →
    </Link>
  ) : null;
}
