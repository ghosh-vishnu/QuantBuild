import { useEffect, useState } from 'react';
import {
  BookOpen,
  Check,
  CreditCard,
  Download,
  LockKeyhole,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useApi, useAction } from '../lib/query';
import { api, dates, notify, openDocument, rows, title, sessionStore, type Row } from '../lib/api';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Fields,
  PageHead,
  QueryView,
  Status,
  type FieldDef,
} from '../components/ui';
const studentFields: FieldDef[] = [
  { key: 'student_id', label: 'College ID' },
  { key: 'college_university', label: 'College / university' },
  { key: 'course', label: 'Course' },
  { key: 'branch', label: 'Department' },
  { key: 'current_year_semester', label: 'Year / semester' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
];
export function Profile() {
  const { session } = useAuth();
  const student = session?.user.role === 'STUDENT';
  const q = useApi('/api/accounts/profile/');
  const [v, setV] = useState<Row>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [password, setPassword] = useState<Row>({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  useEffect(() => {
    if (q.data) {
      const data: Row = {
        first_name: q.data.first_name || '',
        last_name: q.data.last_name || '',
      };
      if (student) studentFields.forEach((field) => (data[field.key] = q.data![field.key] ?? ''));
      setV(data);
    }
  }, [q.data, student]);
  const editable = !student || q.data?.approval_status === 'APPROVED';
  const save = useAction(
    () => {
      if (Object.keys(files).length) {
        const body = new FormData();
        Object.entries(v).forEach(([k, value]) => body.append(k, String(value)));
        Object.entries(files).forEach(([k, file]) => body.append(k, file));
        return api('/api/accounts/profile/', 'PATCH', body);
      }
      return api('/api/accounts/profile/', 'PATCH', v);
    },
    (result: Row) => {
      setFiles({});
      const user = result.data || result;
      const current = sessionStore.get();
      if (current)
        sessionStore.set({
          ...current,
          user: {
            ...current.user,
            name: [user.first_name, user.last_name].filter(Boolean).join(' ') || current.user.name,
          },
        });
    },
    'Your profile is up to date.',
  );
  const change = useAction(
    () => api('/api/accounts/change-password/', 'POST', password),
    () => setPassword({ old_password: '', new_password: '', confirm_password: '' }),
    'Password changed.',
  );
  return (
    <>
      <PageHead
        title="Make this workspace yours."
        description="Your details, documents and account security."
      />
      <QueryView query={q}>
        <Card>
          <div className="profile-banner">
            <Avatar name={`${v.first_name} ${v.last_name}`} />
            <div>
              <h2>
                {v.first_name} {v.last_name}
              </h2>
              <p className="muted">{q.data?.email}</p>
            </div>
            <Badge>{title(session?.user.role)}</Badge>
            {student && <Status value={q.data?.approval_status} />}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(null);
            }}
          >
            <h3>Personal information</h3>
            <Fields
              fields={[
                { key: 'first_name', label: 'First name' },
                { key: 'last_name', label: 'Last name' },
              ]}
              values={v}
              onChange={setV}
            />
            <div className="form-grid">
              <label className="field">
                <span>Email address</span>
                <input value={q.data?.email || ''} disabled />
                <small>Verified contact details cannot be changed here.</small>
              </label>
              {student && (
                <label className="field">
                  <span>Phone number</span>
                  <input value={q.data?.mobile || ''} disabled />
                </label>
              )}
            </div>
            {student && (
              <>
                <h3>Academic details</h3>
                <Fields fields={studentFields} values={v} onChange={setV} />
                <h3>Documents</h3>
                <div className="form-grid">
                  {[
                    ['profile_photo', 'Profile picture'],
                    ['college_id_card', 'Student ID'],
                  ].map(([key, label]) => (
                    <label className="upload-box" key={key}>
                      {label}
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        disabled={!editable}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setFiles({ ...files, [key]: file });
                        }}
                      />
                      {q.data?.[key] && (
                        <button
                          type="button"
                          className="text-btn"
                          onClick={() =>
                            openDocument(q.data![key], label).catch((error) =>
                              notify(error.message, 'error'),
                            )
                          }
                        >
                          <Download size={14} />
                          Download current
                        </button>
                      )}
                    </label>
                  ))}
                </div>
              </>
            )}
            {!editable && (
              <p className="muted">You can update your profile after admin approval.</p>
            )}
            <div className="form-actions">
              <Button busy={save.isPending} disabled={!editable} type="submit">
                <Save size={16} />
                Save profile
              </Button>
            </div>
          </form>
        </Card>
        <Card className="spaced">
          <h2>Keep your account secure.</h2>
          <p className="muted">Choose a strong password that you don’t use elsewhere.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              change.mutate(null);
            }}
          >
            <Fields
              fields={[
                {
                  key: 'old_password',
                  label: 'Current password',
                  type: 'password',
                  required: true,
                },
                {
                  key: 'new_password',
                  label: 'New password',
                  type: 'password',
                  required: true,
                },
                {
                  key: 'confirm_password',
                  label: 'Confirm new password',
                  type: 'password',
                  required: true,
                },
              ]}
              values={password}
              onChange={setPassword}
            />
            <div className="form-actions">
              <Button busy={change.isPending} type="submit" className="secondary">
                <LockKeyhole size={16} />
                Update password
              </Button>
            </div>
          </form>
        </Card>
      </QueryView>
    </>
  );
}
export function Subscription() {
  const q = useApi('/api/v1/subscription/');
  const plans = useApi('/api/v1/plans/');
  const access = useApi('/api/v1/modules/');
  return (
    <>
      <PageHead
        title="A plan for what’s next."
        description="Understand your access, usage and current package."
      />
      <QueryView query={q}>
        <Card className="current-plan">
          <div>
            <p className="eyebrow">YOUR CURRENT PACKAGE</p>
            <h1>{q.data?.plan?.name || 'No plan assigned'}</h1>
            <p className="muted">
              {q.data?.plan?.description || 'Your administrator manages available packages.'}
            </p>
            {q.data?.subscription && <p>Valid until {dates(q.data.subscription.expires_at)}</p>}
          </div>
          <CreditCard size={56} />
        </Card>
        <h2 className="spaced">Your usage</h2>
        <div className="usage-grid">
          {q.data?.usage?.map((item: Row) => (
            <Card key={item.metric}>
              <p className="eyebrow">{title(item.metric)}</p>
              <h2>
                {item.used.toLocaleString()}{' '}
                <small className="muted">
                  / {item.limit === null ? 'Unlimited' : item.limit.toLocaleString()}
                </small>
              </h2>
              <div className="usage-track">
                <span
                  style={{
                    width:
                      item.limit === null
                        ? '0%'
                        : `${Math.min(100, item.limit ? (item.used / item.limit) * 100 : 100)}%`,
                  }}
                />
              </div>
              <p className="muted">
                {item.remaining === null ? 'No configured limit' : `${item.remaining} remaining`}
                {item.period ? ` · ${item.period}` : ''}
              </p>
            </Card>
          ))}
        </div>
        <h2 className="spaced">Module access</h2>
        <Card>
          {access.data?.modules?.map((m: Row) => (
            <div className="list-link" key={m.code}>
              <div>
                <strong>{m.name}</strong>
                <small>{m.message}</small>
              </div>
              <Badge tone={m.allowed ? 'green' : 'amber'}>
                {m.allowed ? 'Available' : 'Locked'}
              </Badge>
            </div>
          ))}
        </Card>
      </QueryView>
      <h2 className="spaced">Available packages</h2>
      <p className="muted">
        Contact your administrator to change packages. Online checkout is not available.
      </p>
      <div className="plan-grid">
        {rows(plans.data).map((p) => (
          <Card key={p.id}>
            <Badge>{p.is_free ? 'Free' : 'Subscription'}</Badge>
            <h2>{p.name}</h2>
            <p className="muted">{p.description}</p>
            {p.modules.map((m: Row) => (
              <p className="check-row" key={m.module_id}>
                <Check size={15} />
                {m.name}
              </p>
            ))}
          </Card>
        ))}
      </div>
    </>
  );
}
export function FeaturePlaceholder({ name, endpoint }: { name: string; endpoint: string }) {
  const q = useApi(endpoint);
  return (
    <>
      <PageHead
        title={name}
        description="A place for the next chapter of your project workspace."
      />
      <QueryView query={q}>
        <Card>
          <Empty
            title={`${name} workspace is being prepared`}
            text="Your module access is active. The detailed tools for this feature have not been implemented in the backend yet."
            action={
              <Badge tone="green">
                <ShieldCheck size={14} /> Access confirmed
              </Badge>
            }
          />
        </Card>
      </QueryView>
    </>
  );
}
