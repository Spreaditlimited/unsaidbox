"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./ui/Icon";
export function AdminNav() {
  const pathname = usePathname();
  return <nav className="workspace-nav" aria-label="Administration">
    <Link href="/admin" aria-current={pathname === "/admin" ? "page" : undefined}><Icon name="overview" />Overview</Link>
    <Link href="/admin/users" aria-current={pathname.startsWith("/admin/users") ? "page" : undefined}><Icon name="inbox" />Users</Link>
    <Link href="/admin/moderation" aria-current={pathname === "/admin/moderation" ? "page" : undefined}><Icon name="shield" />Moderation</Link>
    <Link href="/admin/activity" aria-current={pathname === "/admin/activity" ? "page" : undefined}><Icon name="question" />Activity log</Link>
    <Link href="/admin/settings" aria-current={pathname === "/admin/settings" ? "page" : undefined}><Icon name="settings" />Administrator settings</Link>
  </nav>;
}
