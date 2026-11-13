import { useState } from 'react';
import { Check, CheckCircle2, Eye, Search, ShieldCheck, X } from 'lucide-react';
import { useApi, useAction } from '../../lib/query';
import { api, dates, openDocument, notify, rows, type Row } from '../../lib/api';
import {
  Avatar,
  Badge,
  Button,
  Card,
  DetailGrid,
  Empty,
  Fields,
  Modal,
  PageHead,
  QueryView,
  Status,
} from '../../components/ui';
export default function Students() {
  const [status, setStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const q = useApi('/api/accounts/admin/students/' + (status ? '?approval_status=' + status : ''));
  const data = rows(q.data).filter((s) =>
    `${s.first_name} ${s.last_name} ${s.email}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHead
        eyebrow="ACCOUNT VERIFICATION"
        title="The people behind the projects."
        description="Review student details and give their workspace a clear start."
      />
      <div className="filter-bar">
        <div className="search-input">
          <Search size={18} />
          <input
            aria-label="Search students"
            placeholder="Search students by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Approval filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All students</option>
          <option value="PENDING">Pending review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>
      <Card>
        <QueryView query={q}>
          {data.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Institution</th>
                    <th>Registered</th>
                    <th>Verification</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <div className="person">
                          <Avatar name={`${student.first_name} ${student.last_name}`} />
                          <div>
                            <strong>
                              {student.first_name} {student.last_name}
                            </strong>
                            <small>{student.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {student.college_university || '—'}
                        <small>{student.course}</small>
                      </td>
                      <td>{dates(student.created_at)}</td>
                      <td>
                        <Status value={student.approval_status} />
                      </td>
                      <td>
                        <Button className="secondary small" onClick={() => setSelected(student.id)}>
                          <Eye size={14} />
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="You’re all caught up" text="No student accounts match this view." />
          )}
        </QueryView>
      </Card>
      {selected && <StudentReview id={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
function StudentReview({ id, onClose }: { id: number; onClose: () => void }) {
  const q = useApi(`/api/accounts/admin/students/${id}/`);
  const [editingDetails, setEditingDetails] = useState(false);
  const [draft, setDraft] = useState<Row>({});
  const detailFields = [
    { key: 'first_name', label: 'First name' },
    { key: 'last_name', label: 'Last name' },
    { key: 'mobile', label: 'Phone number' },
    { key: 'college_university', label: 'College / university' },
    { key: 'course', label: 'Course' },
    { key: 'branch', label: 'Department' },
    { key: 'current_year_semester', label: 'Year / semester' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
  ];
  const updateDetails = useAction(
    () => api(`/api/accounts/admin/students/${id}/`, 'PATCH', draft),
    () => setEditingDetails(false),
    'Student details updated.',
  );
  const [rejection, setRejection] = useState(false);
  const [reason, setReason] = useState('');
  const decision = useAction(
    (state: string) =>
      api(`/api/accounts/admin/users/${id}/approval/`, 'PATCH', {
        approval_status: state,
        ...(state === 'REJECTED' ? { reason } : {}),
      }),
    onClose,
    'Review decision saved. The student email is queued.',
  );
  const active = useAction(
    (value: boolean) =>
      api(`/api/accounts/admin/students/${id}/status/`, 'PATCH', {
        is_active: value,
      }),
    undefined,
    'Account status updated.',
  );
  return (
    <Modal title="Student verification" onClose={onClose} wide>
      <QueryView query={q}>
        <div className="profile-banner">
          <Avatar name={`${q.data?.first_name} ${q.data?.last_name}`} />
          <div>
            <h2>
              {q.data?.first_name} {q.data?.last_name}
            </h2>
            <p className="muted">{q.data?.email}</p>
          </div>
          <Status value={q.data?.approval_status} />
        </div>
        <DetailGrid
          data={{
            mobile: q.data?.mobile,
            institution: q.data?.college_university,
            course: q.data?.course,
            department: q.data?.branch,
            semester: q.data?.current_year_semester,
            student_id: q.data?.student_id,
            city: q.data?.city,
            state: q.data?.state,
            registered: dates(q.data?.created_at),
          }}
        />
        {editingDetails ? (
          <form
            className="spaced"
            onSubmit={(e) => {
              e.preventDefault();
              updateDetails.mutate(null);
            }}
          >
            <Fields fields={detailFields} values={draft} onChange={setDraft} />
            <div className="form-actions">
              <Button className="secondary" type="button" onClick={() => setEditingDetails(false)}>
                Cancel edit
              </Button>
              <Button busy={updateDetails.isPending} type="submit">
                Save student details
              </Button>
            </div>
          </form>
        ) : (
          <Button
            className="secondary small"
            onClick={() => {
              setDraft(Object.fromEntries(detailFields.map((f) => [f.key, q.data?.[f.key] || ''])));
              setEditingDetails(true);
            }}
          >
            Edit student details
          </Button>
        )}
        <div className="button-row spaced">
          {[
            ['college_id_card', 'Student ID'],
            ['profile_photo', 'Profile picture'],
          ].map(
            ([key, label]) =>
              q.data?.[key] && (
                <Button
                  className="secondary"
                  key={key}
                  onClick={() =>
                    openDocument(q.data![key], label).catch((error) =>
                      notify(error.message, 'error'),
                    )
                  }
                >
                  <Eye size={15} />
                  Download {label}
                </Button>
              ),
          )}
        </div>
        <div className="inline-split spaced">
          <span>Account enabled</span>
          <input
            type="checkbox"
            aria-label="Account enabled"
            checked={!!q.data?.is_active}
            disabled={active.isPending}
            onChange={(e) => active.mutate(e.target.checked)}
          />
        </div>
        {rejection && (
          <label className="field spaced">
            <span>Reason for rejection *</span>
            <textarea
              aria-label="Rejection reason"
              value={reason}
              maxLength={2000}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Explain what needs correcting. This reason is emailed to the student."
            />
          </label>
        )}
        <div className="form-actions">
          <Button className="secondary" onClick={onClose}>
            Close
          </Button>
          {rejection ? (
            <Button
              className="danger-btn"
              busy={decision.isPending}
              disabled={!reason.trim()}
              onClick={() => decision.mutate('REJECTED')}
            >
              Confirm rejection
            </Button>
          ) : (
            <Button className="secondary danger" onClick={() => setRejection(true)}>
              <X size={16} />
              Reject
            </Button>
          )}
          <Button busy={decision.isPending} onClick={() => decision.mutate('APPROVED')}>
            <CheckCircle2 size={16} />
            Approve account
          </Button>
        </div>
      </QueryView>
    </Modal>
  );
}
export function Notifications() {
  const q = useApi('/api/accounts/admin/notifications/', true, 15000);
  const mark = useAction(
    (id: number) => api(`/api/accounts/admin/notifications/${id}/read/`, 'PATCH'),
    undefined,
    'Notification marked as read.',
  );
  return (
    <>
      <PageHead
        eyebrow="ADMINISTRATION"
        title="Your attention, where it matters."
        description="Unread registration notifications. Read notifications leave this list."
      />
      <Card>
        <QueryView query={q}>
          {rows(q.data?.notifications).length ? (
            rows(q.data?.notifications).map((n) => (
              <article className="notification-row" key={n.id}>
                <div className="notification-symbol">
                  <ShieldCheck size={23} />
                </div>
                <div>
                  <h3>{n.title}</h3>
                  <p>{n.message}</p>
                  <small className="muted">{dates(n.created_at)}</small>
                </div>
                <Button
                  className="secondary small"
                  busy={mark.isPending}
                  onClick={() => mark.mutate(n.id)}
                >
                  <Check size={14} />
                  Mark read
                </Button>
              </article>
            ))
          ) : (
            <Empty
              title="Nothing needs your attention"
              text="New registration notifications will appear here."
            />
          )}
        </QueryView>
      </Card>
    </>
  );
}
