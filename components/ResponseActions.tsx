import Link from "next/link";
import { canShareResponse } from "@/lib/publishing.mjs";

export function ResponseActions({
  response,
}: {
  response: { id: string; status: string; sharingPolicy: string };
}) {
  return (
    <div className="response-actions">
      <Link
        className="button secondary"
        href={`/dashboard/responses/${response.id}`}
      >
        Review response
      </Link>
      {canShareResponse(response) && (
        <Link
          className="button"
          href={`/dashboard/responses/${response.id}/share`}
        >
          Create share card
        </Link>
      )}
    </div>
  );
}
