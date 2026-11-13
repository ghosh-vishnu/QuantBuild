import { config } from '../../lib/config';
import { useState } from 'react';
import { Link, NavLink, Outlet, useOutletContext, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  Clock3,
  FileDown,
  FolderKanban,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import { useApi, useAction } from '../../lib/query';
import { api, dates, openDocument, notify, params, rows, type Row } from '../../lib/api';
import {
  Card,
  PageHead,
  Empty,
  QueryView,
  Badge,
  Metric,
  ProjectArt,
  DetailGrid,
  BreadCrumb,
  Button,
} from '../../components/ui';
export function Projects() {
  const [filters, setFilters] = useState<Row>({
    search: '',
    ownership: 'all',
    ordering: '-created_at',
    page: 1,
  });
  const [search, setSearch] = useState('');
  const query = useApi('/api/v1/projects/?' + params({ ...filters, page_size: 9 }));
  return (
    <>
      <PageHead
        title="My projects"
        description="Your ideas. Your team. Your next great build."
        action={
          <Link to="/app/projects/new" className="btn">
            <Plus size={17} /> Create project
          </Link>
        }
      />
      <div className="filter-bar">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFilters({ ...filters, search, page: 1 });
          }}
          className="search-input"
        >
          <Search size={18} />
          <input
            placeholder="Search projects or clients…"
            aria-label="Search projects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="text-btn">
            Search
          </button>
        </form>
        <select
          aria-label="Project ownership"
          value={filters.ownership}
          onChange={(e) => setFilters({ ...filters, ownership: e.target.value, page: 1 })}
        >
          <option value="all">All projects</option>
          <option value="owned">Owned by me</option>
          <option value="shared">Shared with me</option>
        </select>
        <select
          aria-label="Sort projects"
          value={filters.ordering}
          onChange={(e) => setFilters({ ...filters, ordering: e.target.value, page: 1 })}
        >
          <option value="-created_at">Newest first</option>
          <option value="name">Name A–Z</option>
          <option value="-updated_at">Recently updated</option>
        </select>
      </div>
      <QueryView query={query}>
        {rows(query.data).length ? (
          <>
            <div className="result-count">{query.data?.count || 0} projects in your workspace</div>
            <div className="project-grid">
              {rows(query.data).map((p, i) => (
                <Link key={p.id} className="card project-card" to={`/app/projects/${p.id}`}>
                  <ProjectArt seed={i} />
                  <div className="project-card-body">
                    <div className="inline-split">
                      <Badge>{p.project_type?.name}</Badge>
                      <ArrowUpRight size={18} />
                    </div>
                    <h3>{p.name}</h3>
                    <p className="muted">
                      <MapPin size={14} /> {[p.city, p.state].filter(Boolean).join(', ')}
                    </p>
                    <div className="project-client">{p.client_name}</div>
                    <footer>
                      <span>{p.code}</span>
                      <small>{dates(p.created_at)}</small>
                    </footer>
                  </div>
                </Link>
              ))}
            </div>
            <div className="pagination">
              <Button
                className="secondary"
                disabled={!query.data?.previous}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              >
                <ArrowLeft size={15} /> Previous
              </Button>
              <span>Page {filters.page}</span>
              <Button
                className="secondary"
                disabled={!query.data?.next}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              >
                Next <ArrowRight size={15} />
              </Button>
            </div>
          </>
        ) : (
          <Card>
            <Empty
              title="A blank canvas for your next build"
              text="Create a project or adjust your search to find your work."
              action={
                <Link className="btn" to="/app/projects/new">
                  <Plus size={16} /> New project
                </Link>
              }
            />
          </Card>
        )}
      </QueryView>
    </>
  );
}
export type ProjectContext = {
  project: Row;
  summary: Row;
  refresh: () => void;
};
export const useProject = () => useOutletContext<ProjectContext>();
export function ProjectLayout() {
  const { id } = useParams();
  const query = useApi(`/api/v1/projects/${id}/`);
  const summary = useApi(`/api/v1/projects/${id}/summary/`);
  const tabs = [
    ['', 'Overview', FolderKanban],
    ['calculations', 'Calculations', Calculator],
    ['team', 'Project team', Users],
    ['chat', 'Group chat', MessageCircle],
    ['activities', 'Activities', Clock3],
  ] as const;
  return (
    <>
      <BreadCrumb
        items={[
          { label: 'My projects', to: '/app/projects' },
          { label: query.data?.name || 'Project' },
        ]}
      />
      <QueryView query={query}>
        <div className="project-hero">
          <div className="project-hero-icon">
            <FolderKanban size={30} />
          </div>
          <div>
            <Badge>{query.data?.project_type?.name}</Badge>
            <h1>{query.data?.name}</h1>
            <p className="muted">
              {query.data?.code} <span>?</span> {query.data?.city}, {query.data?.state}
            </p>
          </div>
          {summary.data?.access?.permissions?.includes('project.edit') && (
            <Link className="btn secondary" to={`/app/projects/${id}/edit`}>
              Edit project <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
        <nav className="project-tabs">
          {tabs.map(([path, label, Icon]) => (
            <NavLink key={path} to={`/app/projects/${id}${path ? '/' + path : ''}`} end={!path}>
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <Outlet
          context={
            {
              project: query.data || {},
              summary: summary.data || {},
              refresh: () => {
                query.refetch();
                summary.refetch();
              },
            } satisfies ProjectContext
          }
        />
      </QueryView>
    </>
  );
}
export function ProjectOverview() {
  const navigate = useNavigate();
  const removeProject = useAction(
    (id: number) => api(`/api/v1/projects/${id}/`, 'DELETE'),
    () => navigate('/app/projects'),
    'Project deleted.',
  );
  const { project, summary } = useProject();
  const [file, setFile] = useState<File | null>(null);
  const upload = useAction(
    async () => {
      const body = new FormData();
      if (!file) throw new Error('Choose a document.');
      body.append('file', file);
      return api(`/api/v1/projects/${project.id}/`, 'PATCH', body);
    },
    () => setFile(null),
    'Document uploaded.',
  );
  return (
    <>
      <div className="metric-grid">
        <Metric
          label="Team members"
          value={summary.team?.total_members}
          icon={<Users size={20} />}
        />
        <Metric
          label="Pending invitations"
          value={summary.team?.pending_invitations}
          icon={<Clock3 size={20} />}
        />
        <Metric
          label="Selected modules"
          value={summary.modules?.length}
          icon={<FolderKanban size={20} />}
        />
        <Metric
          label="Calculation items"
          value={summary.calculations?.total_items ?? '—'}
          icon={<Calculator size={20} />}
        />
      </div>
      <div className="overview-grid">
        <Card>
          <div className="section-heading">
            <h2>Basic information</h2>
            <CheckCircle2 size={19} />
          </div>
          <DetailGrid
            data={{
              project_name: project.name,
              project_code: project.code,
              project_type: project.project_type?.name,
              category: project.category,
              client: project.client_name,
              contract_type: project.contract_type,
              start_date: dates(project.start_date),
              completion_date: dates(project.completion_date),
            }}
          />
          {project.description && <p className="muted">{project.description}</p>}
          {summary.access?.is_owner && (
            <Button
              className="ghost small danger"
              busy={removeProject.isPending}
              onClick={() => {
                if (
                  confirm('Delete this project and all of its calculations, groups and messages?')
                )
                  removeProject.mutate(project.id);
              }}
            >
              Delete project
            </Button>
          )}
        </Card>
        <Card>
          <h2>Project location</h2>
          <DetailGrid
            data={
              summary.location || {
                country: project.country,
                state: project.state,
                city: project.city,
                pincode: project.pincode,
                address_line_1: project.address_line_1,
                site_coordinates: project.site_coordinates,
              }
            }
          />
          {project.site_coordinates && (
            <a
              className="text-btn"
              href={`${config.mapLinkUrl}?mlat=${encodeURIComponent(project.site_coordinates.split(',')[0])}&mlon=${encodeURIComponent(project.site_coordinates.split(',')[1] || '')}`}
              target="_blank"
              rel="noreferrer"
            >
              View on map <ArrowUpRight size={14} />
            </a>
          )}
        </Card>
        <Card>
          <h2>Construction details</h2>
          <DetailGrid
            data={
              summary.project_details || {
                structure_type: project.structure_type,
                total_floors: project.total_floors,
                number_of_units: project.number_of_units,
              }
            }
          />
          <div className="document-row">
            <FileDown size={24} />
            <div>
              <strong>{project.document_name || 'No document attached'}</strong>
              <small>Project reference document</small>
            </div>
            {project.document_url && (
              <Button
                className="secondary small"
                onClick={() =>
                  openDocument(project.document_url, project.document_name).catch((error) =>
                    notify(error.message, 'error'),
                  )
                }
              >
                Download
              </Button>
            )}
          </div>
          {summary.access?.permissions?.includes('documents.manage') && (
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                upload.mutate(null);
              }}
            >
              <input
                aria-label="Upload project document"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <Button
                busy={upload.isPending}
                disabled={!file}
                type="submit"
                className="secondary small"
              >
                Upload
              </Button>
            </form>
          )}
        </Card>
        <Card>
          <div className="section-heading">
            <h2>Selected modules</h2>
            <Badge>{summary.modules?.length || 0} selected</Badge>
          </div>
          {summary.modules?.map((m: Row) => (
            <div className="module-list-item" key={m.id}>
              <CheckCircle2 size={20} />
              <div>
                <strong>{m.name}</strong>
                <small>{m.description || 'Enabled in this project'}</small>
              </div>
            </div>
          ))}
          <div className="section-heading spaced">
            <h2>Project roles</h2>
            <Link to={`/app/projects/${project.id}/team`}>
              Manage team <ArrowRight size={14} />
            </Link>
          </div>
          <div className="chip-row">
            {summary.team?.roles?.map((role: Row) => (
              <Badge key={role.id}>{role.name}</Badge>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
export function Invitations() {
  const query = useApi('/api/v1/projects/invitations/');
  const accept = useAction(
    (id: string) => api(`/api/v1/projects/invitations/${id}/accept/`, 'POST'),
    undefined,
    'You joined the project.',
  );
  return (
    <>
      <PageHead
        title="An invitation to build together."
        description="Review your project requests and join the right team."
      />
      <QueryView query={query}>
        {rows(query.data).length ? (
          <div className="invitation-grid">
            {rows(query.data).map((inv) => (
              <Card key={inv.id}>
                <div className="inline-split">
                  <span className="invitation-symbol">
                    <Users size={25} />
                  </span>
                  <Badge tone="amber">Invitation</Badge>
                </div>
                <h2>{inv.project.name}</h2>
                <p className="muted">{inv.project.code}</p>
                <p>
                  <strong>{inv.invited_by.name || inv.invited_by.email}</strong> invited you to join
                  as <Badge>{inv.role.name}</Badge>.
                </p>
                <p className="muted">Expires {dates(inv.expires_at)}</p>
                <Button busy={accept.isPending} onClick={() => accept.mutate(inv.id)}>
                  Accept invitation <ArrowRight size={16} />
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <Empty
              title="No invitations waiting"
              text="When someone invites you to their project, you’ll find it here."
            />
          </Card>
        )}
      </QueryView>
    </>
  );
}
