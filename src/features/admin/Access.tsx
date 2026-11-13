import { useState } from 'react';
import { Layers3, Pencil, Plus, ShieldCheck } from 'lucide-react';
import { useApi, useAction } from '../../lib/query';
import { api, rows, type Row } from '../../lib/api';
import {
  Badge,
  Button,
  Card,
  Empty,
  Fields,
  Modal,
  PageHead,
  QueryView,
} from '../../components/ui';
export default function Access() {
  const modules = useApi('/api/v1/admin/modules/');
  const roles = useApi('/api/v1/admin/roles/');
  const [role, setRole] = useState<Row | null | undefined>(undefined);
  const [module, setModule] = useState<Row | null>(null);
  return (
    <>
      <PageHead
        eyebrow="PLATFORM ACCESS"
        title="The right tools. The right people."
        description="Manage implemented modules and assign access to each role."
        action={
          <Button onClick={() => setRole(null)}>
            <Plus size={16} />
            Create role
          </Button>
        }
      />
      <Card>
        <div className="section-heading">
          <h2>Platform modules</h2>
          <Badge>{rows(modules.data).length} implemented</Badge>
        </div>
        <QueryView query={modules}>
          <div className="admin-module-grid">
            {rows(modules.data).map((m) => (
              <div key={m.id} className="admin-module">
                <span className="tool-icon">
                  <Layers3 size={22} />
                </span>
                <div>
                  <h3>{m.name}</h3>
                  <small className="muted">
                    {m.is_active ? 'Enabled platform-wide' : 'Globally disabled'}
                  </small>
                </div>
                <button
                  className="icon-btn"
                  aria-label={`Configure ${m.name}`}
                  onClick={() => setModule(m)}
                >
                  <Pencil size={16} />
                </button>
              </div>
            ))}
          </div>
        </QueryView>
      </Card>
      <div className="section-heading spaced">
        <div>
          <h2>Role permissions</h2>
          <p className="muted">Users need both their role and plan to include a module.</p>
        </div>
      </div>
      <QueryView query={roles}>
        {rows(roles.data).length ? (
          <div className="role-grid">
            {rows(roles.data).map((r) => (
              <Card key={r.id}>
                <div className="inline-split">
                  <span className="tool-icon">
                    <ShieldCheck size={23} />
                  </span>
                  <Button className="secondary small" onClick={() => setRole(r)}>
                    Manage access
                  </Button>
                </div>
                <h2>{r.role.replaceAll('_', ' ')}</h2>
                <div className="chip-row">
                  {r.module_codes.length ? (
                    r.module_codes.map((code: string) => (
                      <Badge key={code}>
                        {rows(modules.data).find((m) => m.code === code)?.name || code}
                      </Badge>
                    ))
                  ) : (
                    <span className="muted">No modules assigned</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <Empty title="Create your first role" />
          </Card>
        )}
      </QueryView>
      {role !== undefined && (
        <RoleAccessEditor
          role={role}
          modules={rows(modules.data)}
          onClose={() => setRole(undefined)}
        />
      )}{' '}
      {module && <ModuleEditor module={module} onClose={() => setModule(null)} />}
    </>
  );
}
function RoleAccessEditor({
  role,
  modules,
  onClose,
}: {
  role: Row | null;
  modules: Row[];
  onClose: () => void;
}) {
  const [v, setV] = useState<Row>({ role: role?.role || '' });
  const [codes, setCodes] = useState<string[]>(role?.module_codes || []);
  const [createdRole, setCreatedRole] = useState<Row | null>(role);
  const save = useAction(
    async () => {
      const r: Row =
        createdRole ??
        (await api<Row>('/api/v1/admin/roles/', 'POST', {
          role: String(v.role).toUpperCase(),
        }));
      setCreatedRole(r);
      return api(`/api/v1/admin/roles/${r.id}/modules/`, 'PUT', {
        module_codes: codes,
      });
    },
    onClose,
    'Role access saved.',
  );
  return (
    <Modal title={role ? `Manage ${role.role}` : 'Create a platform role'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(null);
        }}
      >
        {!role && (
          <Fields
            fields={[
              {
                key: 'role',
                label: 'Role name',
                required: true,
                wide: true,
                help: 'Letters, numbers and underscores. For example: SITE_ENGINEER.',
              },
            ]}
            values={v}
            onChange={setV}
          />
        )}
        <h3>Accessible modules</h3>
        {modules.map((m) => (
          <label key={m.id} className="check-row">
            <input
              type="checkbox"
              checked={codes.includes(m.code)}
              onChange={(e) =>
                setCodes(e.target.checked ? [...codes, m.code] : codes.filter((c) => c !== m.code))
              }
            />
            {m.name}
            {!m.is_active && <Badge tone="amber">Disabled</Badge>}
          </label>
        ))}
        <div className="form-actions">
          <Button type="button" className="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={save.isPending} type="submit">
            Save role access
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function ModuleEditor({ module, onClose }: { module: Row; onClose: () => void }) {
  const [v, setV] = useState<Row>({
    name: module.name,
    description: module.description,
    sort_order: module.display_order,
    is_active: module.is_active,
  });
  const save = useAction(() => api(`/api/v1/admin/modules/${module.id}/`, 'PATCH', v), onClose);
  return (
    <Modal title={`Configure ${module.name}`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(null);
        }}
      >
        <Fields
          fields={[
            { key: 'name', label: 'Display name', required: true, wide: true },
            {
              key: 'description',
              label: 'Description',
              type: 'textarea',
              wide: true,
            },
            {
              key: 'sort_order',
              label: 'Display order',
              type: 'number',
              min: 0,
            },
          ]}
          values={v}
          onChange={setV}
        />
        <label className="check-row">
          <input
            type="checkbox"
            checked={v.is_active}
            onChange={(e) => setV({ ...v, is_active: e.target.checked })}
          />
          Globally enabled
        </label>
        <p className="muted">
          This changes availability and display settings. The feature itself remains implemented in
          code.
        </p>
        <div className="form-actions">
          <Button className="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={save.isPending} type="submit">
            Save settings
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function ProjectSetup() {
  const [tab, setTab] = useState('types');
  const q = useApi(`/api/v1/projects/admin/${tab}/`);
  const modules = useApi('/api/v1/admin/modules/');
  const [editing, setEditing] = useState<Row | null | undefined>(undefined);
  return (
    <>
      <PageHead
        eyebrow="PROJECT CONFIGURATION"
        title="Set the stage for every project."
        description="Manage project types and the tools owners can select."
        action={
          <Button onClick={() => setEditing(null)}>
            <Plus size={16} />
            {tab === 'types' ? 'Add project type' : 'Add project tool'}
          </Button>
        }
      />
      <div className="segment-control">
        <button className={tab === 'types' ? 'active' : ''} onClick={() => setTab('types')}>
          Project types
        </button>
        <button className={tab === 'modules' ? 'active' : ''} onClick={() => setTab('modules')}>
          Project tools
        </button>
      </div>
      <Card>
        <QueryView query={q}>
          {rows(q.data).length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    {tab === 'modules' && <th>Platform module</th>}
                    <th>Availability</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows(q.data).map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                      </td>
                      <td>{item.description || '—'}</td>
                      {tab === 'modules' && (
                        <td>
                          {rows(modules.data).find((m) => m.id === item.platform_module_id)?.name ||
                            '—'}
                        </td>
                      )}
                      <td>
                        <Badge tone={item.is_active ? 'green' : 'amber'}>
                          {item.is_active ? 'Active' : 'Disabled'}
                        </Badge>
                      </td>
                      <td>
                        <Button className="secondary small" onClick={() => setEditing(item)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title={
                tab === 'modules' ? 'Add the tools your projects need' : 'No project types yet'
              }
              text={
                tab === 'modules'
                  ? 'Map each tool to an implemented platform module. Owners select these tools when creating a project.'
                  : undefined
              }
            />
          )}
        </QueryView>
      </Card>
      {editing !== undefined && (
        <CatalogEditor
          key={tab}
          kind={tab}
          item={editing}
          modules={rows(modules.data)}
          onClose={() => setEditing(undefined)}
        />
      )}
    </>
  );
}
function CatalogEditor({
  kind,
  item,
  modules,
  onClose,
}: {
  kind: string;
  item: Row | null;
  modules: Row[];
  onClose: () => void;
}) {
  const [v, setV] = useState<Row>({
    name: item?.name || '',
    description: item?.description || '',
    is_active: item?.is_active ?? true,
    sort_order: item?.sort_order || 0,
    ...(kind === 'modules' ? { platform_module_id: item?.platform_module_id || '' } : {}),
  });
  const save = useAction(
    () =>
      api(
        `/api/v1/projects/admin/${kind}/${item ? item.id + '/' : ''}`,
        item ? 'PATCH' : 'POST',
        v,
      ),
    onClose,
  );
  return (
    <Modal
      title={`${item ? 'Edit' : 'Add'} project ${kind === 'types' ? 'type' : 'tool'}`}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(null);
        }}
      >
        <Fields
          fields={[
            { key: 'name', label: 'Name', required: true, wide: true },
            {
              key: 'description',
              label: 'Description',
              type: 'textarea',
              wide: true,
            },
            {
              key: 'sort_order',
              label: 'Display order',
              type: 'number',
              min: 0,
            },
            ...(kind === 'modules'
              ? [
                  {
                    key: 'platform_module_id',
                    label: 'Platform module',
                    required: true,
                    options: modules.map((m) => ({
                      value: m.id,
                      label: m.name,
                    })),
                  },
                ]
              : []),
          ]}
          values={v}
          onChange={setV}
        />
        <label className="check-row">
          <input
            type="checkbox"
            checked={v.is_active}
            onChange={(e) => setV({ ...v, is_active: e.target.checked })}
          />
          Available to project owners
        </label>
        <div className="form-actions">
          <Button className="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={save.isPending} type="submit">
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
