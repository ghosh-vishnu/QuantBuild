import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Clock3,
  FolderKanban,
  Mail,
  Plus,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useApi } from '../lib/query';
import { dates, rows } from '../lib/api';
import {
  Card,
  PageHead,
  Metric,
  Empty,
  QueryView,
  Badge,
  ProjectArt,
  Status,
} from '../components/ui';
export default function Dashboard() {
  const { session } = useAuth();
  const admin = session?.user.role === 'ADMIN';
  const access = useApi('/api/v1/modules/');
  const allowed =
    admin || access.data?.modules?.some((m: any) => m.code === 'my-projects' && m.allowed);
  const projects = useApi('/api/v1/projects/?page_size=3', !!allowed && !admin);
  const summary = useApi('/api/v1/projects/summary/', !!allowed && !admin);
  const students = useApi('/api/accounts/admin/students/', admin);
  const invites = useApi('/api/v1/projects/invitations/', !admin);
  const notices = useApi('/api/accounts/admin/notifications/', admin);
  const name = session?.user.name?.split(' ')[0] || 'there';
  return (
    <>
      <PageHead
        eyebrow={admin ? 'ADMINISTRATION' : 'YOUR WORKSPACE, AT A GLANCE'}
        title={`Good to see you, ${name}.`}
        description={
          admin
            ? 'A clear view of the people and access behind your platform.'
            : 'A fresh perspective on your projects, team and progress.'
        }
        action={
          allowed && !admin ? (
            <Link className="btn" to="/app/projects/new">
              <Plus size={17} /> New project
            </Link>
          ) : null
        }
      />
      <section className="welcome-banner">
        <div>
          <Badge tone="glass">
            {admin ? 'PLATFORM CONTROL CENTRE' : 'LET’S BUILD SOMETHING GREAT'}
          </Badge>
          <h2>
            {admin
              ? 'A well-run platform starts here.'
              : 'Every great build starts with a clear plan.'}
          </h2>
          <p>
            {admin
              ? 'Review student accounts, manage access and shape the workspace.'
              : 'Keep your measurements precise, your projects organized and your team connected.'}
          </p>
          <Link to={admin ? '/app/admin/students' : '/app/projects'}>
            {' '}
            {admin ? 'Review accounts' : 'Explore your projects'} <ArrowRight size={16} />
          </Link>
        </div>
        <div className="welcome-graphic" aria-hidden="true">
          <span />
          <span />
          <span />
          <div>PLAN. MEASURE. BUILD.</div>
        </div>
      </section>
      {!admin && access.data?.account?.review_message && (
        <div className="review-banner">
          <ShieldCheck size={27} />
          <div>
            <strong>
              {access.data.account.approval_status === 'REJECTED'
                ? 'Your account needs attention'
                : 'Your account is under review'}
            </strong>
            <p>{access.data.account.review_message}</p>
          </div>
          <Status value={access.data.account.approval_status} />
        </div>
      )}
      <div className="metric-grid">
        {admin ? (
          <>
            <Metric
              label="Registered students"
              value={rows(students.data).length}
              icon={<Users size={20} />}
            />
            <Metric
              label="Pending reviews"
              value={rows(students.data).filter((s) => s.approval_status === 'PENDING').length}
              icon={<Clock3 size={20} />}
            />
            <Metric
              label="Approved accounts"
              value={rows(students.data).filter((s) => s.approval_status === 'APPROVED').length}
              icon={<ShieldCheck size={20} />}
            />
            <Metric
              label="Unread notifications"
              value={notices.data?.unread_count || 0}
              icon={<Mail size={20} />}
            />
          </>
        ) : (
          <>
            <Metric
              label="Total projects"
              value={summary.data?.projects?.total || 0}
              icon={<FolderKanban size={20} />}
            />
            <Metric
              label="Projects you own"
              value={summary.data?.projects?.owned || 0}
              icon={<Activity size={20} />}
            />
            <Metric
              label="Team collaborators"
              value={summary.data?.team?.unique_collaborators || 0}
              icon={<Users size={20} />}
            />
            <Metric
              label="Pending invitations"
              value={rows(invites.data).length}
              icon={<Mail size={20} />}
            />
          </>
        )}
      </div>
      {admin ? (
        <div className="dashboard-columns">
          <Card>
            <div className="section-heading">
              <h2>Waiting for your review</h2>
              <Link to="/app/admin/students">
                View all <ArrowUpRight size={15} />
              </Link>
            </div>
            {rows(students.data)
              .filter((s) => s.approval_status === 'PENDING')
              .slice(0, 5)
              .map((s) => (
                <Link className="list-link" key={s.id} to="/app/admin/students">
                  <div>
                    <strong>
                      {s.first_name} {s.last_name}
                    </strong>
                    <small>{s.email}</small>
                  </div>
                  <Status value={s.approval_status} />
                </Link>
              ))}
            {!rows(students.data).some((s) => s.approval_status === 'PENDING') && (
              <Empty title="All caught up" text="New registration reviews will appear here." />
            )}
          </Card>
          <Card>
            <h2>Platform shortcuts</h2>
            {[
              ['Roles & module access', 'Decide who can use each feature.', '/app/admin/access'],
              ['Plans & subscriptions', 'Manage packages and usage limits.', '/app/admin/plans'],
              [
                'Project configuration',
                'Set up project types and project tools.',
                '/app/admin/setup',
              ],
            ].map(([name, text, to]) => (
              <Link className="list-link" key={to} to={to}>
                <div>
                  <strong>{name}</strong>
                  <small>{text}</small>
                </div>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </Card>
        </div>
      ) : (
        <>
          <div className="section-heading">
            <div>
              <h2>Your latest projects</h2>
              <p className="muted">The work taking shape in your workspace.</p>
            </div>
            <Link to="/app/projects">
              View all projects <ArrowRight size={16} />
            </Link>
          </div>
          {allowed ? (
            <QueryView query={projects}>
              {rows(projects.data).length ? (
                <div className="project-grid">
                  {rows(projects.data).map((p, i) => (
                    <Link to={`/app/projects/${p.id}`} className="card project-card" key={p.id}>
                      <ProjectArt seed={i} />
                      <div className="project-card-body">
                        <div className="inline-split">
                          <Badge>{p.project_type?.name}</Badge>
                          <ArrowUpRight size={18} />
                        </div>
                        <h3>{p.name}</h3>
                        <p className="muted">
                          {[p.city, p.state].filter(Boolean).join(', ') || 'Location not specified'}
                        </p>
                        <footer>
                          <span>{p.code}</span>
                          <small>{dates(p.created_at)}</small>
                        </footer>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card>
                  <Empty
                    title="Your next project starts here"
                    text="Create a workspace, invite your team and start measuring."
                    action={
                      <Link to="/app/projects/new" className="btn">
                        <Plus size={16} /> Create a project
                      </Link>
                    }
                  />
                </Card>
              )}
            </QueryView>
          ) : (
            <Card>
              <Empty
                title="Your workspace is getting ready"
                text="Project access will appear once your account and module permissions are approved."
              />
            </Card>
          )}
          <div className="dashboard-columns spaced">
            <Card className="tip-card">
              <span className="tip-icon">
                <Calculator size={25} />
              </span>
              <h2>From dimensions to decisions.</h2>
              <p className="muted">
                Open a project to use its calculation sheets. Your team’s work stays organized
                within that project.
              </p>
              <Link to="/app/calculations">
                Open calculations <ArrowRight size={16} />
              </Link>
            </Card>
            <Card>
              <div className="section-heading">
                <h2>Team invitations</h2>
                <Link to="/app/invitations">
                  View requests <ArrowUpRight size={15} />
                </Link>
              </div>
              {rows(invites.data).length ? (
                rows(invites.data)
                  .slice(0, 3)
                  .map((inv) => (
                    <Link key={inv.id} to="/app/invitations" className="list-link">
                      <div>
                        <strong>{inv.project.name}</strong>
                        <small>Invited by {inv.invited_by.name || inv.invited_by.email}</small>
                      </div>
                      <ArrowRight size={16} />
                    </Link>
                  ))
              ) : (
                <Empty
                  title="No pending invitations"
                  text="When a project owner invites you, the request will appear here."
                />
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
