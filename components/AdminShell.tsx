import Link from "next/link";
import { Brand } from "./Brand";
import { Icon } from "./ui/Icon";
import { adminLogout } from "@/app/admin/actions";
import { AdminNav } from "./AdminNav";

export function AdminShell({ children, name }: { children: React.ReactNode; name: string }) {
  return <div className="workspace">
    <aside className="workspace-sidebar">
      <Brand />
      <div className="workspace-label">ADMINISTRATION</div>
      <AdminNav />
      <div className="workspace-sidebar-bottom">
        <div className="privacy-note"><Icon name="shield" /><strong>Responsible access</strong><p>Private inboxes stay private. Administrative changes are recorded.</p></div>
        <Link href="/" className="workspace-help">View public website <Icon name="arrow" /></Link>
      </div>
    </aside>
    <div className="workspace-body">
      <header className="workspace-topbar">
        <span className="workspace-breadcrumb">Administration <span>/</span> <strong>UnsaidBox</strong></span>
        <div className="workspace-account">
          <Link href="/admin/settings" className="account-name">{name}</Link>
          <form action={adminLogout}><button className="workspace-signout" aria-label="Sign out of administration" title="Sign out of administration"><Icon name="logout" /></button></form>
        </div>
      </header>
      <main id="main" className="dashboard workspace-main admin-main">{children}</main>
    </div>
  </div>;
}
