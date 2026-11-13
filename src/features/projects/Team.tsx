import { useState } from 'react';
import {
  MailPlus,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Clock3,
  CheckCircle2,
  Pencil,
  RefreshCw,
} from 'lucide-react';
import { useProject } from './Projects';
import { useApi, useAction } from '../../lib/query';
import { api, dates, rows, type Row } from '../../lib/api';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  Fields,
  Metric,
  Modal,
  QueryView,
  Status,
} from '../../components/ui';
export default function Team() {
  const { project, summary } = useProject();
  const owner = summary.access?.is_owner;
  const team = useApi(`/api/v1/projects/${project.id}/team/`, true, 15000);
  const roles = useApi(`/api/v1/projects/${project.id}/roles/`, !!owner);
  const outgoing = useApi(`/api/v1/projects/${project.id}/invitations/`, !!owner, 15000);
  const options = useApi('/api/v1/projects/options/');
  const [modal, setModal] = useState<'invite' | 'role' | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [search, setSearch] = useState('');
  const change = useAction(({ id, role_id }: Row) =>
    api(`/api/v1/projects/${project.id}/members/${id}/`, 'PATCH', {
      role_id: Number(role_id),
    }),
  );
  const remove = useAction(
    (id: number) => api(`/api/v1/projects/${project.id}/members/${id}/`, 'DELETE'),
    undefined,
    'Member removed.',
  );
  const action = useAction(({ id, op }: Row) =>
    api(`/api/v1/projects/${project.id}/invitations/${id}/${op}/`, 'POST'),
  );
  const deleteRole = useAction(
    (id: number) => api(`/api/v1/projects/${project.id}/roles/${id}/`, 'DELETE'),
    undefined,
    'Role removed.',
  );
  const members = rows(team.data?.members).filter((m) =>
    `${m.name} ${m.email}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Project team & permissions</h2>
          <p className="muted">Bring the right people together. Keep access clear.</p>
        </div>
        {owner && (
          <div className="button-row">
            <Button
              className="secondary"
              onClick={() => {
                setEditing(null);
                setModal('role');
              }}
            >
              <ShieldCheck size={16} /> Create role
            </Button>
            <Button onClick={() => setModal('invite')}>
              <MailPlus size={16} /> Invite member
            </Button>
          </div>
        )}
      </div>
      <div className="metric-grid three">
        <Metric label="Total members" value={team.data?.total_members} icon={<Users size={20} />} />
        <Metric
          label="Active accounts"
          value={team.data?.active_members}
          icon={<CheckCircle2 size={20} />}
        />
        <Metric
          label="Pending invites"
          value={team.data?.pending_invitations}
          icon={<Clock3 size={20} />}
        />
      </div>
      <Card>
        <div className="search-input compact">
          <Search size={17} />
          <input
            aria-label="Search team"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <QueryView query={team}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Project role</th>
                  <th>Joined</th>
                  {owner && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {team.data?.owner && (
                  <tr>
                    <td>
                      <div className="person">
                        <Avatar name={team.data.owner.name || team.data.owner.email} />
                        <div>
                          <strong>{team.data.owner.name || 'Project owner'}</strong>
                          <small>{team.data.owner.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge tone="purple">Project owner</Badge>
                    </td>
                    <td>Creator</td>
                    {owner && <td>Full access</td>}
                  </tr>
                )}
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="person">
                        <Avatar name={member.name || member.email} />
                        <div>
                          <strong>{member.name || 'Project member'}</strong>
                          <small>{member.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {owner ? (
                        <select
                          aria-label={`Role for ${member.email}`}
                          value={member.role_id}
                          disabled={change.isPending}
                          onChange={(e) =>
                            change.mutate({
                              id: member.id,
                              role_id: e.target.value,
                            })
                          }
                        >
                          {rows(roles.data).map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge>{member.role_name}</Badge>
                      )}
                    </td>
                    <td>{dates(member.joined_at)}</td>
                    {owner && (
                      <td>
                        <button
                          className="icon-btn danger"
                          aria-label={`Remove ${member.email}`}
                          onClick={() => {
                            if (confirm(`Remove ${member.email} from this project?`))
                              remove.mutate(member.id);
                          }}
                        >
                          <Trash2 size={17} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryView>
      </Card>
      {owner && (
        <>
          <Card className="spaced">
            <div className="section-heading">
              <h2>Project roles</h2>
              <Badge>{rows(roles.data).length} roles</Badge>
            </div>
            {rows(roles.data).length ? (
              <div className="role-grid">
                {rows(roles.data).map((role) => (
                  <div className="role-card" key={role.id}>
                    <div className="inline-split">
                      <strong>{role.name}</strong>
                      <div className="button-row">
                        <button
                          className="icon-btn"
                          aria-label={`Edit ${role.name}`}
                          onClick={() => {
                            setEditing(role);
                            setModal('role');
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-btn danger"
                          aria-label={`Delete ${role.name}`}
                          onClick={() => {
                            if (confirm('Delete this role? Referenced roles cannot be deleted.'))
                              deleteRole.mutate(role.id);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="chip-row">
                      {role.permissions?.map((p: string) => (
                        <Badge key={p}>
                          {options.data?.permissions?.find((x: Row) => x.code === p)?.name || p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                title="Define how your team works"
                text="Create a role and its permissions before inviting your first member."
              />
            )}
          </Card>
          <Card className="spaced">
            <h2>Invitation requests</h2>
            {rows(outgoing.data).length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Email delivery</th>
                      <th>Expires</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows(outgoing.data).map((inv) => (
                      <tr key={inv.id}>
                        <td>{inv.email}</td>
                        <td>
                          <Status value={inv.effective_status} />
                        </td>
                        <td>
                          <Status value={inv.email_status} />
                        </td>
                        <td>{dates(inv.expires_at)}</td>
                        <td>
                          {inv.status !== 'ACCEPTED' && (
                            <div className="button-row">
                              <Button
                                className="secondary small"
                                busy={action.isPending}
                                onClick={() => action.mutate({ id: inv.id, op: 'resend' })}
                              >
                                <RefreshCw size={13} />
                                Resend
                              </Button>
                              <Button
                                className="ghost small danger"
                                onClick={() => action.mutate({ id: inv.id, op: 'revoke' })}
                              >
                                Revoke
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">Your invitations will appear here.</p>
            )}
          </Card>
        </>
      )}
      {modal === 'role' && (
        <RoleEditor
          project={project}
          options={options.data || {}}
          editing={editing}
          onClose={() => setModal(null)}
        />
      )}{' '}
      {modal === 'invite' && (
        <InviteEditor project={project} roles={rows(roles.data)} onClose={() => setModal(null)} />
      )}
    </>
  );
}
function RoleEditor({
  project,
  options,
  editing,
  onClose,
}: {
  project: Row;
  options: Row;
  editing: Row | null;
  onClose: () => void;
}) {
  const [v, setV] = useState<Row>({
    name: editing?.name || '',
    permissions: editing?.permissions || ['project.view'],
    module_ids: editing?.module_ids || [],
  });
  const save = useAction(
    () =>
      api(
        `/api/v1/projects/${project.id}/roles/${editing ? editing.id + '/' : ''}`,
        editing ? 'PATCH' : 'POST',
        v,
      ),
    onClose,
  );
  return (
    <Modal title={editing ? 'Edit project role' : 'Create project role'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(null);
        }}
      >
        <Fields
          fields={[{ key: 'name', label: 'Role name', required: true, wide: true }]}
          values={v}
          onChange={setV}
        />
        <h3>Permissions</h3>
        {options.permissions?.map((p: Row) => (
          <label className="check-row" key={p.code}>
            <input
              type="checkbox"
              checked={v.permissions.includes(p.code)}
              disabled={p.code === 'project.view'}
              onChange={(e) =>
                setV({
                  ...v,
                  permissions: e.target.checked
                    ? [...v.permissions, p.code]
                    : v.permissions.filter((code: string) => code !== p.code),
                })
              }
            />
            {p.name}
          </label>
        ))}
        <h3>Project modules</h3>
        {options.modules
          ?.filter((m: Row) => project.module_ids.includes(m.id))
          .map((m: Row) => (
            <label className="check-row" key={m.id}>
              <input
                type="checkbox"
                checked={v.module_ids.includes(m.id)}
                onChange={(e) =>
                  setV({
                    ...v,
                    module_ids: e.target.checked
                      ? [...v.module_ids, m.id]
                      : v.module_ids.filter((n: number) => n !== m.id),
                  })
                }
              />
              {m.name}
            </label>
          ))}
        <p className="muted">
          Calculation access requires ?Use assigned project modules? and an assigned calculation
          tool.
        </p>
        <div className="form-actions">
          <Button className="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={save.isPending} type="submit">
            Save role
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function InviteEditor({
  project,
  roles,
  onClose,
}: {
  project: Row;
  roles: Row[];
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<Row | null>(null);
  const [role, setRole] = useState('');
  const [error, setError] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const send = useAction(
    () =>
      api(`/api/v1/projects/${project.id}/invitations/`, 'POST', {
        email: result?.email,
        role_id: Number(role),
      }),
    onClose,
    'Invitation created. The member can accept it from Invitations.',
  );
  async function search() {
    setBusy(true);
    setError(null);
    try {
      const found = await api<Row[]>(
        `/api/v1/projects/member-search/?email=${encodeURIComponent(email)}`,
      );
      if (!found.length)
        throw new Error('No registered student found. Ask them to register first.');
      setResult(found[0]);
    } catch (error) {
      setResult(null);
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Invite a project member" onClose={onClose}>
      <p className="muted">Find a registered student by their exact email address.</p>
      <ErrorBox error={error} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="inline-form"
      >
        <input
          type="email"
          aria-label="Student email"
          placeholder="student@example.com"
          value={email}
          required
          onChange={(e) => {
            setEmail(e.target.value);
            setResult(null);
          }}
        />
        <Button busy={busy} type="submit" className="secondary">
          Search
        </Button>
      </form>
      {result && (
        <div className="person search-result">
          <Avatar name={result.name || result.email} />
          <div>
            <strong>{result.name}</strong>
            <small>{result.email}</small>
          </div>
        </div>
      )}
      <label className="field">
        <span>Project role</span>
        <select aria-label="Invitation role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Select role</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </label>
      {!roles.length && <p className="muted">Create a project role first.</p>}
      <div className="form-actions">
        <Button className="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!result || !role} busy={send.isPending} onClick={() => send.mutate(null)}>
          Send invitation
        </Button>
      </div>
    </Modal>
  );
}
