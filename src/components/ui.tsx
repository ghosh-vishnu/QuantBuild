import { useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  ChevronRight,
  FolderOpen,
  LoaderCircle,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { title, type Row } from '../lib/api';
export function Button({
  busy,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button {...props} disabled={props.disabled || busy} className={`btn ${className}`}>
      {busy ? <LoaderCircle size={17} className="spin" /> : null}
      {children}
    </button>
  );
}
export function Badge({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Status({ value }: { value: string }) {
  return (
    <Badge
      tone={
        ['APPROVED', 'ACTIVE', 'SENT', 'ACCEPTED', 'CALCULATED'].includes(value)
          ? 'green'
          : ['REJECTED', 'FAILED', 'REVOKED', 'CANCELLED'].includes(value)
            ? 'red'
            : 'amber'
      }
    >
      {title(value)}
    </Badge>
  );
}
export function PageHead({
  eyebrow,
  title: heading,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow || 'Your workspace'}</p>
        <h1>{heading}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Empty({
  title: heading = 'Nothing here yet',
  text,
  action,
}: {
  title?: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <FolderOpen size={29} />
      </div>
      <h3>{heading}</h3>
      <p className="muted">{text || 'Your work will appear here when you get started.'}</p>
      {action}
    </div>
  );
}
export function ErrorBox({ error }: { error: any }) {
  return error ? (
    <div role="alert" className="error-box">
      <AlertCircle size={18} />
      <span>{error.message || String(error)}</span>
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="loading">
      <LoaderCircle className="spin" size={23} /> Loading your workspace?
    </div>
  );
}
export function QueryView({ query, children }: { query: any; children: ReactNode }) {
  return query.isPending ? (
    <Loading />
  ) : query.isError ? (
    <>
      <ErrorBox error={query.error} />
      <Button className="secondary" onClick={() => query.refetch()}>
        Try again
      </Button>
    </>
  ) : (
    <>{children}</>
  );
}
export function Metric({
  label,
  value,
  icon,
  detail,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  detail?: string;
}) {
  return (
    <Card className="metric">
      <div className="metric-top">
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value ?? '—'}</strong>
      {detail && <small className="muted">{detail}</small>}
    </Card>
  );
}
export function Avatar({ name = '', size = '' }: { name?: string; size?: string }) {
  return (
    <span className={`avatar ${size}`}>
      {name
        .split(/\s|@/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0])
        .join('')
        .toUpperCase() || 'Q'}
    </span>
  );
}
export type FieldDef = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: { value: string | number; label: string }[];
  help?: string;
  min?: string | number;
  max?: string | number;
  step?: string;
  wide?: boolean;
  disabled?: boolean;
};
export function Fields({
  fields,
  values,
  onChange,
}: {
  fields: FieldDef[];
  values: Row;
  onChange: (v: Row) => void;
}) {
  return (
    <div className="form-grid">
      {fields.map((f) => (
        <label className={`field ${f.wide ? 'wide' : ''}`} key={f.key}>
          <span>
            {f.label}
            {f.required && <em> *</em>}
          </span>
          {f.type === 'textarea' ? (
            <textarea
              aria-label={f.label}
              value={values[f.key] ?? ''}
              onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
              required={f.required}
              rows={3}
            />
          ) : f.options ? (
            <select
              aria-label={f.label}
              value={values[f.key] ?? ''}
              onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
              required={f.required}
              disabled={f.disabled}
            >
              <option value="">Select {f.label.toLowerCase()}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              aria-label={f.label}
              type={f.type || 'text'}
              value={values[f.key] ?? ''}
              onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
              required={f.required}
              min={f.min}
              max={f.max}
              step={f.step}
              disabled={f.disabled}
              autoComplete={f.type === 'password' ? 'new-password' : undefined}
            />
          )}{' '}
          {f.help && <small>{f.help}</small>}
        </label>
      ))}
    </div>
  );
}
export function Modal({
  title: heading,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className={`modal ${wide ? 'modal-wide' : ''}`} onCancel={onClose}>
      <header>
        <h2>{heading}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Toasts() {
  const [toasts, setToasts] = useState<Row[]>([]);
  useEffect(() => {
    const show = (event: Event) => {
      const d = (event as CustomEvent).detail;
      const id = crypto.randomUUID();
      setToasts((t) => [...t, { ...d, id }]);
      setTimeout(() => setToasts((t) => t.filter((v) => v.id !== id)), 6000);
    };
    window.addEventListener('toast', show);
    return () => window.removeEventListener('toast', show);
  }, []);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.kind === 'error' ? <AlertCircle size={19} /> : <Check size={19} />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
export function DetailGrid({ data }: { data: Row }) {
  return (
    <dl className="detail-grid">
      {Object.entries(data)
        .filter(
          ([k, v]) =>
            v !== null &&
            typeof v !== 'object' &&
            !['id', 'owner_id', 'document_url', 'created_at', 'updated_at'].includes(k),
        )
        .map(([k, v]) => (
          <div key={k}>
            <dt>{title(k)}</dt>
            <dd>{String(v) || '—'}</dd>
          </div>
        ))}
    </dl>
  );
}
export function BreadCrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <div className="breadcrumbs">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <ChevronRight size={12} />}{' '}
          {item.to ? <Link to={item.to}>{item.label}</Link> : item.label}
        </span>
      ))}
    </div>
  );
}
export function ProjectArt({ seed = 0 }: { seed?: number }) {
  return (
    <div className={`project-art art-${seed % 3}`} aria-hidden="true">
      <svg viewBox="0 0 300 130">
        <path
          d="M0 113H300M30 113V42L100 18L180 40V113M100 18V113M180 40L244 58V113"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M30 63L100 42L180 62L244 77M30 86L100 66L180 86L244 98M59 34V107M78 29V105M126 25V111M153 33V112M205 48V111M226 53V112"
          fill="none"
          stroke="currentColor"
          opacity=".5"
        />
        <circle cx="260" cy="30" r="18" fill="currentColor" opacity=".08" />
      </svg>
      <span className="art-caption">
        PROJECT WORKSPACE <ArrowUpRight size={12} />
      </span>
    </div>
  );
}
