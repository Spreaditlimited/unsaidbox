import "server-only";
import { db } from "./db";
// Project at the database boundary: the original unredacted text must never
// enter a public render, including development promise-debug payloads.
export async function publicResponses(
  accountId: string,
  questionId: string | null,
) {
  return db().$queryRaw<
    Array<{ id: string; text: string; ownerReply: string | null }>
  >`
    SELECT s.id, COALESCE(s.publicBody, s.body) AS text, s.ownerReply
    FROM Submission s JOIN Account a ON a.id = s.accountId
    LEFT JOIN Question q ON q.id = s.questionId AND q.accountId = s.accountId
    WHERE s.accountId = ${accountId}
      AND ((${questionId} IS NULL AND s.questionId IS NULL) OR s.questionId = ${questionId})
      AND s.status = 'APPROVED' AND s.publicVisible = true AND s.sharingPolicy = 'OWNER_MAY_SHARE'
      AND a.status = 'ACTIVE' AND a.publicPageEnabled = true
      AND (s.questionId IS NULL OR (q.linkActive = true AND q.publicVisible = true))
    ORDER BY s.createdAt DESC, s.id DESC LIMIT 100
  `;
}
