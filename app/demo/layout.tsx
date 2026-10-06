import { redirect } from "next/navigation";

// Retire old sample URLs without presenting fictional forms as real inboxes.
export default function RetiredExamples() {
  redirect("/start");
}
