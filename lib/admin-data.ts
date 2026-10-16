import "server-only";
import type { Prisma } from "@/generated/prisma";

// Never select password hashes, authentication tokens or private message bodies.
export const adminUserSelect = {
  id: true, displayName: true, username: true, email: true,
  emailVerifiedAt: true, status: true, createdAt: true,
  activity: { select: { lastLoginAt: true, lastDashboardAt: true } },
  billingCustomers: { select: { mode: true, subscriptions: { select: { id: true, mode: true, status: true, recognized: true, paidThrough: true, cancelAtPeriodEnd: true } } } },
  _count: { select: { questions: true, submissions: true, feedbackForms: true } },
} satisfies Prisma.AccountSelect;
export const discoveryQueueWhere = {
  discoverable: true, discoveryApproved: false, publicVisible: true,
  linkActive: true, account: { status: "ACTIVE", publicPageEnabled: true },
} satisfies Prisma.QuestionWhereInput;
