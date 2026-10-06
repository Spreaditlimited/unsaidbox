import { PrismaClient } from "../generated/prisma/index.js";
import { validateDatabaseUrl } from "../lib/database-url.mjs";
if (process.env.VERCEL || process.env.NODE_ENV === "production")
  throw new Error("Test activation is a developer-terminal operation only.");
const email = process.argv[2]?.trim().toLowerCase();
if (process.argv.includes("--admin")) {
  console.error("Administrators are now separate identities. Use npm run admin:create instead.");
  process.exit(1);
}
if (
  !email ||
  !email.includes("@") ||
  process.argv[3] !== "--confirm-live-test"
) {
  console.error(
    "Usage: npm run account:activate-test -- email@example.com --confirm-live-test [--admin]",
  );
  process.exit(1);
}
const db = new PrismaClient({
  datasources: {
    db: { url: validateDatabaseUrl(process.env.UNSAIDBOX_DATABASE_URL) },
  },
});
try {
  const a = await db.account.findUnique({ where: { email } });
  if (!a || a.status === "SUSPENDED")
    throw new Error("Account missing or suspended.");
  await db.$transaction(async (tx) => {
    await tx.account.update({
      where: { id: a.id },
      data: {
        status: "ACTIVE",
        ...(process.argv.includes("--admin") ? { role: "ADMIN" } : {}),
      },
    });
    await tx.auditEvent.create({
      data: {
        actorId: a.id,
        targetId: a.id,
        action: process.argv.includes("--admin")
          ? "CLI_TEST_ADMIN_ACTIVATION"
          : "CLI_TEST_ACTIVATION",
      },
    });
  });
  console.log(
    "Test account activated in the live UnsaidBox database. Email ownership has NOT been verified.",
  );
} catch {
  console.error(
    "Activation failed. Verify the account email and database connection.",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
