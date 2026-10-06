import Link from "next/link";
import { Brand } from "./Brand";
import { logout } from "@/app/actions";
import { DashboardNav } from "./DashboardNav";
import { Icon } from "./ui/Icon";
import { avatarState } from "@/lib/avatar";
import { ProfileAvatar } from "./ProfileAvatar";
export async function DashboardShell({
  children,
  name,
  section = "overview",
  accountId,
}: {
  children: React.ReactNode;
  name: string;
  section?: string;
  accountId: string;
}) {
  const avatar = await avatarState(accountId);
  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <Brand />
        <div className="workspace-label">YOUR WORKSPACE</div>
        <DashboardNav section={section} />
        <div className="workspace-sidebar-bottom">
          <div className="privacy-note">
            <Icon name="shield" />
            <strong>Private by default</strong>
            <p>You decide what leaves your box.</p>
          </div>
          <Link href="/safety" className="workspace-help">
            Safety & privacy <Icon name="arrow" />
          </Link>
          <Link href="/contact" className="workspace-help">
            Contact us <Icon name="arrow" />
          </Link>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-topbar">
          <span className="workspace-breadcrumb">
            My workspace <span>/</span> <strong>UnsaidBox</strong>
          </span>
          <div className="workspace-account">
            <Link
              href="/dashboard/settings"
              aria-label="Manage profile photo"
              title="Profile settings"
            >
              <ProfileAvatar name={name} version={avatar.version} />
            </Link>
            <span className="account-name">{name}</span>
            <form action={logout}>
              <button
                className="workspace-signout"
                aria-label="Sign out"
                title="Sign out"
              >
                <Icon name="logout" />
              </button>
            </form>
          </div>
        </header>
        <main id="main" className="dashboard workspace-main">
          {children}
        </main>
      </div>
    </div>
  );
}
