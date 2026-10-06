"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./ui/Icon";
import { TemplateContinuation } from "./forms/TemplateContinuation";

export function DashboardNav({
  section,
}: {
  section: string;
}) {
  const pathname = usePathname();
  const active = pathname.startsWith("/dashboard/forms") ? "forms" : pathname.startsWith("/admin")
    ? "admin"
    : pathname.includes("/settings")
      ? "settings"
      : pathname.includes("/questions")
        ? "questions"
        : pathname.includes("/responses")
          ? "inbox"
          : section;
  const items = [
    { id: "forms", label: "Forms & feedback", href: "/dashboard/forms", icon: "article" as const },
    {
      id: "overview",
      label: "Overview",
      href: "/dashboard",
      icon: "overview" as const,
    },
    {
      id: "inbox",
      label: "Inbox",
      href: "/dashboard?view=inbox",
      icon: "inbox" as const,
    },
    {
      id: "questions",
      label: "Your questions",
      href: "/dashboard?view=questions",
      icon: "question" as const,
    },
    {
      id: "settings",
      label: "Settings",
      href: "/dashboard/settings",
      icon: "settings" as const,
    },
  ];
  return (
    <nav className="workspace-nav" aria-label="Dashboard">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          aria-current={active === item.id ? "page" : undefined}
        >
          <Icon name={item.icon} />
          {item.label}
        </Link>
      ))}
      <TemplateContinuation />
    </nav>
  );
}
