import { useState } from 'react';
import { Check, CreditCard, Plus } from 'lucide-react';
import { useApi, useAction } from '../../lib/query';
import { api, dates, rows, title, type Row } from '../../lib/api';
import {
  Badge,
  Button,
  Card,
  Empty,
  Fields,
  Modal,
  PageHead,
  QueryView,
  Status,
} from '../../components/ui';
const metrics: Record<string, { key: string; label: string }[]> = {
  'my-projects': [{ key: 'max_saved_projects', label: 'Saved project limit' }],
  calculations: [{ key: 'calculations_per_month', label: 'Calculations per month' }],
  reports: [{ key: 'report_exports_per_month', label: 'Report exports per month' }],
};
export default function Plans() {
  const [tab, setTab] = useState('plans');
  const plans = useApi('/api/v1/admin/plans/');
  const modules = useApi('/api/v1/admin/modules/');
  const students = useApi('/api/accounts/admin/students/');
  const [page, setPage] = useState(1);
  const subscriptions = useApi(
    `/api/v1/admin/subscriptions/?page=${page}`,
    tab === 'subscriptions',
  );
  const [editing, setEditing] = useState<Row | null | undefined>(undefined);
  const [assign, setAssign] = useState(false);
  const cancel = useAction(
    (id: number) => api(`/api/v1/admin/subscriptions/${id}/cancel/`, 'POST'),
    undefined,
    'Subscription cancelled. The user falls back to the Free plan.',
  );
  return (
    <>
      <PageHead
        eyebrow="PACKAGES & ENTITLEMENTS"
        title="Room to build, at every stage."
        description="Manage plan modules, usage limits and student subscriptions."
        action={
          <Button onClick={() => (tab === 'plans' ? setEditing(null) : setAssign(true))}>
            <Plus size={16} />
            {tab === 'plans' ? 'Create plan' : 'Assign subscription'}
          </Button>
        }
      />
      <div className="segment-control">
        <button className={tab === 'plans' ? 'active' : ''} onClick={() => setTab('plans')}>
          Plans
        </button>
        <button
          className={tab === 'subscriptions' ? 'active' : ''}
          onClick={() => setTab('subscriptions')}
        >
          Subscriptions
        </button>
      </div>
      {tab === 'plans' ? (
        <QueryView query={plans}>
          <div className="plan-grid">
            {rows(plans.data).map((plan) => (
              <Card key={plan.id} className={plan.is_free ? 'free-plan' : ''}>
                <div className="inline-split">
                  <span className="tool-icon">
                    <CreditCard size={25} />
                  </span>
                  <Badge tone={plan.is_active ? 'green' : 'amber'}>
                    {plan.is_active ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
                <h2>{plan.name}</h2>
                <p className="muted">
                  {plan.description || 'A package for your project workspace.'}
                </p>
                <Badge>{plan.is_free ? 'Free fallback' : 'Subscription package'}</Badge>
                <div className="plan-features">
                  {plan.modules.map((m: Row) => (
                    <div key={m.module_id}>
                      <p>
                        <Check size={15} />
                        <strong>{m.name}</strong>
                      </p>
                      {Object.entries(m.limits).map(([key, value]) => (
                        <small key={key}>
                          {title(key)}: {value === null ? 'Unlimited' : String(value)}
                        </small>
                      ))}
                    </div>
                  ))}
                </div>
                <Button className="secondary full" onClick={() => setEditing(plan)}>
                  Manage package
                </Button>
              </Card>
            ))}
          </div>
        </QueryView>
      ) : (
        <Card>
          <QueryView query={subscriptions}>
            {rows(subscriptions.data).length ? (
              <>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Plan</th>
                        <th>Status</th>
                        <th>Expires</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {rows(subscriptions.data).map((s) => (
                        <tr key={s.id}>
                          <td>
                            {rows(students.data).find((u) => u.id === s.user_id)?.email ||
                              `User ${s.user_id}`}
                          </td>
                          <td>
                            {rows(plans.data).find((p) => p.code === s.plan_code)?.name ||
                              s.plan_code}
                          </td>
                          <td>
                            <Status value={s.effective_status} />
                          </td>
                          <td>{dates(s.expires_at)}</td>
                          <td>
                            {s.status === 'ACTIVE' && (
                              <Button
                                className="secondary small danger"
                                busy={cancel.isPending}
                                onClick={() => {
                                  if (
                                    confirm(
                                      'Cancel this subscription? The student will use the Free fallback plan.',
                                    )
                                  )
                                    cancel.mutate(s.id);
                                }}
                              >
                                Cancel subscription
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pagination">
                  <Button
                    className="secondary"
                    disabled={!subscriptions.data?.previous}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <span>Page {page}</span>
                  <Button
                    className="secondary"
                    disabled={!subscriptions.data?.next}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </>
            ) : (
              <Empty
                title="No subscriptions assigned"
                text="Assign an active package to a student to get started."
              />
            )}
          </QueryView>
        </Card>
      )}
      {editing !== undefined && (
        <PlanEditor
          plan={editing}
          modules={rows(modules.data)}
          onClose={() => setEditing(undefined)}
        />
      )}{' '}
      {assign && (
        <AssignSubscription
          plans={rows(plans.data)}
          students={rows(students.data)}
          onClose={() => setAssign(false)}
        />
      )}
    </>
  );
}
function PlanEditor({
  plan,
  modules,
  onClose,
}: {
  plan: Row | null;
  modules: Row[];
  onClose: () => void;
}) {
  const [v, setV] = useState<Row>({
    code: plan?.code || '',
    name: plan?.name || '',
    description: plan?.description || '',
    is_active: plan?.is_active ?? true,
  });
  const [entries, setEntries] = useState<Row[]>(plan?.modules || []);
  const save = useAction(
    () =>
      api(`/api/v1/admin/plans/${plan ? plan.code + '/' : ''}`, plan ? 'PATCH' : 'POST', {
        ...v,
        ...(!plan ? { is_free: false } : {}),
        modules: entries.map((m) => ({
          module_id: m.module_id,
          limits: Object.fromEntries(
            Object.entries(m.limits || {}).map(([k, value]) => [
              k,
              value === '' || value === null ? null : Number(value),
            ]),
          ),
        })),
      }),
    onClose,
    'Plan saved.',
  );
  return (
    <Modal title={plan ? `Edit ${plan.name}` : 'Create subscription plan'} onClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(null);
        }}
      >
        <Fields
          fields={[
            {
              key: 'code',
              label: 'Plan code',
              required: true,
              disabled: !!plan,
              help: 'Permanent identifier, e.g. premium.',
            },
            { key: 'name', label: 'Plan name', required: true },
            {
              key: 'description',
              label: 'Description',
              type: 'textarea',
              wide: true,
            },
          ]}
          values={v}
          onChange={setV}
        />
        <label className="check-row">
          <input
            type="checkbox"
            checked={v.is_active}
            disabled={!!plan?.is_free}
            onChange={(e) => setV({ ...v, is_active: e.target.checked })}
          />
          Plan available
        </label>
        <h3>Included modules & limits</h3>
        <p className="muted">
          Blank limits mean unlimited. Zero blocks usage. Role access is still required.
        </p>
        {modules.map((m) => {
          const entry = entries.find((e) => e.module_id === m.id);
          return (
            <div key={m.id} className="plan-module-editor">
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={!!entry}
                  onChange={(e) =>
                    setEntries(
                      e.target.checked
                        ? [...entries, { module_id: m.id, limits: {} }]
                        : entries.filter((e) => e.module_id !== m.id),
                    )
                  }
                />
                <strong>{m.name}</strong>
              </label>
              {entry &&
                metrics[m.code]?.map((metric) => (
                  <label key={metric.key} className="field">
                    <span>{metric.label}</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Unlimited"
                      value={entry.limits?.[metric.key] ?? ''}
                      onChange={(e) =>
                        setEntries(
                          entries.map((current) =>
                            current.module_id === m.id
                              ? {
                                  ...current,
                                  limits: {
                                    ...current.limits,
                                    [metric.key]: e.target.value,
                                  },
                                }
                              : current,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
            </div>
          );
        })}
        <div className="form-actions">
          <Button className="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={save.isPending}>
            Save package
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function AssignSubscription({
  plans,
  students,
  onClose,
}: {
  plans: Row[];
  students: Row[];
  onClose: () => void;
}) {
  const [v, setV] = useState<Row>({
    user_id: '',
    plan_code: '',
    expires_at: '',
  });
  const save = useAction(
    () =>
      api('/api/v1/admin/subscriptions/', 'POST', {
        ...v,
        user_id: Number(v.user_id),
        expires_at: new Date(v.expires_at).toISOString(),
      }),
    onClose,
    'Subscription assigned.',
  );
  return (
    <Modal title="Assign subscription" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(null);
        }}
      >
        <Fields
          fields={[
            {
              key: 'user_id',
              label: 'Student',
              required: true,
              wide: true,
              options: students.map((s) => ({
                value: s.id,
                label: `${s.first_name} ${s.last_name} · ${s.email}`,
              })),
            },
            {
              key: 'plan_code',
              label: 'Subscription package',
              required: true,
              wide: true,
              options: plans
                .filter((p) => !p.is_free && p.is_active)
                .map((p) => ({ value: p.code, label: p.name })),
            },
            {
              key: 'expires_at',
              label: 'Expiry date & time',
              type: 'datetime-local',
              required: true,
              wide: true,
            },
          ]}
          values={v}
          onChange={setV}
        />
        <p className="muted">
          Starts now. The Free plan applies again when this subscription expires or is cancelled.
        </p>
        <div className="form-actions">
          <Button className="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={save.isPending} type="submit">
            Assign package
          </Button>
        </div>
      </form>
    </Modal>
  );
}
