import { useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import {
  Bell,
  Box,
  Calculator,
  ChevronDown,
  Construction,
  CreditCard,
  FileBarChart,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Settings2,
  ShieldCheck,
  Users,
  X,
  BookOpen,
  ArrowUpRight,
  Mail,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useApi } from '../lib/query';
import { Avatar, Badge } from './ui';
import { rows } from '../lib/api';
export default function Layout() {
  const { session, logout } = useAuth();
  const admin = session?.user.role === 'ADMIN';
  const [mobile, setMobile] = useState(false);
  const location = useLocation();
  const access = useApi('/api/v1/modules/');
  const invitations = useApi('/api/v1/projects/invitations/', !admin, 30000);
  const notifications = useApi('/api/accounts/admin/notifications/', admin, 30000);
  const links = admin
    ? [
        { to: '/app', label: 'Overview', icon: LayoutDashboard },
        {
          to: '/app/admin/students',
          label: 'Student reviews',
          icon: GraduationCap,
        },
        {
          to: '/app/admin/access',
          label: 'Roles & modules',
          icon: ShieldCheck,
        },
        {
          to: '/app/admin/plans',
          label: 'Plans & subscriptions',
          icon: CreditCard,
        },
        { to: '/app/admin/setup', label: 'Project setup', icon: Settings2 },
        { to: '/app/admin/calculations', label: 'Calculation setup', icon: Calculator },
        { to: '/app/admin/notifications', label: 'Notifications', icon: Bell },
      ]
    : [
        { to: '/app', label: 'Overview', icon: LayoutDashboard },
        { to: '/app/projects', label: 'My projects', icon: FolderKanban },
        { to: '/app/calculations', label: 'Calculations', icon: Calculator },
        { to: '/app/invitations', label: 'Invitations', icon: Mail },
        { to: '/app/inventory', label: 'Inventory', icon: Box },
        { to: '/app/reports', label: 'Reports', icon: FileBarChart },
        { to: '/app/drawings', label: 'Drawing & reference', icon: BookOpen },
      ];
  const count = admin ? notifications.data?.unread_count : rows(invitations.data).length;
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <Link className="brand" to="/app">
          <span className="brand-icon">
            <Construction size={25} />
          </span>
          Quanti<span>Build</span>
        </Link>
        <div className="workspace-label">
          {admin ? 'ADMINISTRATION' : 'STUDENT WORKSPACE'}
          <button
            className="icon-btn mobile-only"
            onClick={() => setMobile(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <nav>
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              onClick={() => setMobile(false)}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
              {item.label === 'Invitations' && count > 0 && <b>{count}</b>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {!admin && (
            <Link to="/app/subscription" className="plan-tile">
              <div>
                <CreditCard size={18} />
                <span>YOUR CURRENT PLAN</span>
              </div>
              <strong>{access.data?.plan?.name || 'Your plan'}</strong>
              <p>Make room for your next big idea.</p>
              <span className="plan-link">
                Explore your access <ArrowUpRight size={15} />
              </span>
            </Link>
          )}
          <NavLink to="/app/profile" onClick={() => setMobile(false)}>
            <Settings2 size={18} />
            Account settings
          </NavLink>
          <button onClick={() => void logout()}>
            <LogOut size={18} /> Sign out
          </button>
          <p className="sidebar-footer">QuantiBuild · Build with confidence</p>
        </div>
      </aside>
      <section className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-btn mobile-only"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb-label">
              Workspace <span>/</span>{' '}
              {location.pathname.includes('admin')
                ? 'Administration'
                : location.pathname.split('/')[2]?.replaceAll('-', ' ') || 'Overview'}
            </span>
          </div>
          <div className="topbar-right">
            <Badge tone="subtle">{admin ? 'Administrator' : 'Student'}</Badge>
            <Link
              aria-label={admin ? 'Notifications' : 'Invitations'}
              className="notification-bell"
              to={admin ? '/app/admin/notifications' : '/app/invitations'}
            >
              <Bell size={21} />
              {count > 0 && <i />}
            </Link>
            <div className="topbar-separator" />
            <Link to="/app/profile" className="user-menu">
              <Avatar name={session?.user.name || session?.user.email} />
              <div>
                <strong>{session?.user.name || 'Your account'}</strong>
                <small>{session?.user.email}</small>
              </div>
              <ChevronDown size={15} />
            </Link>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
        <footer className="main-footer">
          <span>Built for better building.</span>
          <span>QuantiBuild workspace</span>
        </footer>
      </section>
    </div>
  );
}
