import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Construction, GraduationCap, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthContext';
import { api, notify, type Row } from '../lib/api';
import { Button, Fields, ErrorBox, DetailGrid, Badge } from '../components/ui';
export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-layout">
      <aside className="auth-story">
        <Link to="/login" className="brand">
          <span className="brand-icon">
            <Construction size={27} />
          </span>
          Quanti<span>Build</span>
        </Link>
        <div className="auth-copy">
          <Badge tone="glass">THE CONSTRUCTION WORKSPACE</Badge>
          <h1>
            Build with clarity.
            <br />
            <span>Measure with confidence.</span>
          </h1>
          <p>
            Bring your projects, calculations and conversations together. One workspace, built
            around your team.
          </p>
          <div className="blueprint" aria-hidden="true">
            <div className="blueprint-building" />
            <span className="dimension">A STRONG FOUNDATION FOR EVERY PROJECT</span>
          </div>
        </div>
        <footer>
          <ShieldCheck size={17} /> Secure access. Project by project.
        </footer>
      </aside>
      <section className="auth-form-panel">{children}</section>
    </main>
  );
}
export function Login() {
  const { finishLogin } = useAuth();
  const location = useLocation();
  const requestedPath = location.state?.from;
  const destination = typeof requestedPath === 'string' && (requestedPath === '/app' || requestedPath.startsWith('/app/')) ? requestedPath : '/app';
  const navigate = useNavigate();
  const [values, setValues] = useState<Row>({ identifier: '', password: '' });
  const [challenge, setChallenge] = useState<Row | null>(null);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<any>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!challenge) setChallenge(await api('/api/accounts/login/', 'POST', values, false));
      else {
        const data = await api(
          '/api/accounts/verify-login-otp/',
          'POST',
          { challenge_id: challenge.challenge_id, otp },
          false,
        );
        finishLogin(data);
        navigate(destination, { replace: true });
      }
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    setBusy(true);
    try {
      setChallenge(await api('/api/accounts/resend-login-otp/', 'POST', values, false));
      notify('A new code has been requested.');
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame>
      <div className="auth-form">
        <p className="eyebrow">WELCOME TO QUANTIBUILD</p>
        <h1>{challenge ? 'Check your ' + challenge.channel : 'Good to see you again.'}</h1>
        <p className="muted">
          {challenge
            ? `Enter the six-digit code for ${challenge.email || challenge.phone}.`
            : 'Sign in to pick up where you left off.'}
        </p>
        <ErrorBox error={error} />
        {import.meta.env.DEV &&
          challenge &&
          (challenge.otp || challenge.debug_otp) && (
            <div className="info-banner" role="note">
              {challenge.channel === 'phone' ? 'Phone' : 'Email'} verification code (testing):{' '}
              <strong>{challenge.otp || challenge.debug_otp}</strong>
            </div>
          )}
        <form onSubmit={submit}>
          {!challenge ? (
            <Fields
              fields={[
                {
                  key: 'identifier',
                  label: 'Email address or phone number',
                  required: true,
                  wide: true,
                },
                {
                  key: 'password',
                  label: 'Password',
                  type: 'password',
                  required: true,
                  wide: true,
                },
              ]}
              values={values}
              onChange={setValues}
            />
          ) : (
            <label className="field">
              <span>Verification code</span>
              <input
                className="otp-input"
                aria-label="Verification code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                maxLength={6}
                pattern="[0-9]{6}"
                required
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
            </label>
          )}
          {!challenge && (
            <Link className="forgot-link" to="/forgot-password">
              Forgot password?
            </Link>
          )}
          <Button type="submit" busy={busy} className="full">
            {challenge ? 'Verify & sign in' : 'Continue securely'}
            <ArrowRight size={17} />
          </Button>
        </form>
        {challenge ? (
          <div className="auth-links">
            <button
              onClick={() => {
                setChallenge(null);
                setOtp('');
              }}
              className="text-btn"
            >
              Change account
            </button>
            <button onClick={resend} disabled={busy} className="text-btn">
              Resend code
            </button>
          </div>
        ) : (
          <p className="auth-bottom">
            New here?{' '}
            <Link to="/signup">
              Create your account <ArrowRight size={14} />
            </Link>
          </p>
        )}
        <div className="secure-note">
          <ShieldCheck size={15} /> Two-step verification protects your workspace.
        </div>
      </div>
    </AuthFrame>
  );
}
export function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Row>({
    role: '',
    terms_accepted: false,
  });
  const [challenge, setChallenge] = useState<Row>({});
  const [codes, setCodes] = useState<Row>({ email_otp: '', phone_otp: '' });
  const [photo, setPhoto] = useState<File | null>(null);
  const [card, setCard] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<any>(null);
  const labels = ['Your account', 'Verify contacts', 'Academic details', 'Review'];
  async function next(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (step === 0) {
        if (values.password !== values.confirm_password) throw new Error('Passwords do not match.');
        if (!values.role) throw new Error('Select your account type.');
        setChallenge(
          await api(
            '/api/v1/auth/signup/send-otp',
            'POST',
            { email: values.email, phone: values.phone },
            false,
          ),
        );
        setStep(1);
      } else if (step === 1) {
        await api(
          '/api/v1/auth/signup/verify-otp',
          'POST',
          {
            email: values.email,
            phone: values.phone,
            email_challenge_id: challenge.email_challenge_id,
            phone_challenge_id: challenge.phone_challenge_id,
            ...codes,
          },
          false,
        );
        setStep(2);
      } else if (step === 2) {
        if (!card) throw new Error('Please upload your student ID.');
        setStep(3);
      } else {
        if (!values.terms_accepted)
          throw new Error('Please confirm your information and accept the terms.');
        const body = new FormData();
        Object.entries({
          ...values,
          ...codes,
          email_challenge_id: challenge.email_challenge_id,
          phone_challenge_id: challenge.phone_challenge_id,
        }).forEach(([k, v]) => body.append(k, String(v)));
        if (photo) body.append('profile_photo', photo);
        if (card) body.append('college_id_card', card);
        await api('/api/v1/auth/signup', 'POST', body, false);
        notify('Registration complete. You can sign in while your account is reviewed.');
        navigate('/login');
      }
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  const academic = [
    ['college_university', 'College / university'],
    ['city', 'College city'],
    ['branch', 'Department'],
    ['student_id', 'College ID'],
    ['course', 'Course'],
    ['current_year_semester', 'Current year / semester'],
    ['state', 'State'],
  ];
  return (
    <AuthFrame>
      <div className="auth-form signup-form">
        <div className="auth-minihead">
          <span className="eyebrow">START YOUR JOURNEY</span>
          <Link to="/login">Already registered? Sign in</Link>
        </div>
        <h1>Create your account.</h1>
        <p className="muted">A little detail now. A clearer path ahead.</p>
        <div className="steps">
          {labels.map((label, i) => (
            <div key={label} className={i === step ? 'current' : i < step ? 'done' : ''}>
              <span>{i < step ? <CheckCircle2 size={16} /> : i + 1}</span>
              <small>{label}</small>
            </div>
          ))}
        </div>
        <ErrorBox error={error} />
        <form onSubmit={next}>
          {step === 0 && (
            <>
              <div className="account-types">
                <button
                  type="button"
                  className={values.role === 'STUDENT' ? 'selected' : ''}
                  onClick={() => setValues({ ...values, role: 'STUDENT' })}
                >
                  <GraduationCap />
                  <strong>Student</strong>
                  <small>Learn, calculate and collaborate</small>
                </button>
                {['Employee', 'Company', 'College'].map((type) => (
                  <div key={type} className="account-unavailable">
                    <strong>{type}</strong>
                    <small>Registration coming soon</small>
                  </div>
                ))}
              </div>
              <Fields
                fields={[
                  { key: 'first_name', label: 'First name', required: true },
                  { key: 'last_name', label: 'Last name', required: true },
                  {
                    key: 'email',
                    label: 'Email address',
                    type: 'email',
                    required: true,
                  },
                  {
                    key: 'phone',
                    label: 'Phone number',
                    type: 'tel',
                    required: true,
                  },
                  {
                    key: 'password',
                    label: 'Password',
                    type: 'password',
                    required: true,
                    help: '8+ characters, uppercase, number and special character.',
                  },
                  {
                    key: 'confirm_password',
                    label: 'Confirm password',
                    type: 'password',
                    required: true,
                  },
                ]}
                values={values}
                onChange={setValues}
              />
            </>
          )}
          {step === 1 && (
            <>
              <div className="info-banner">
                <ShieldCheck size={20} />
                <div>
                  <strong>Verify both contact details</strong>
                  <p>
                    Codes have been requested for {values.email} and {values.phone}. They expire
                    after 10 minutes.
                  </p>
                </div>
              </div>
              {import.meta.env.DEV &&
                challenge.phone_delivery === 'response_only' &&
                challenge.debug_phone_otp && (
                  <div className="info-banner" role="note">
                    SMS is not connected in this test environment. Phone verification code:{' '}
                    <strong>{challenge.debug_phone_otp}</strong>
                  </div>
                )}
              <Fields
                fields={[
                  {
                    key: 'email_otp',
                    label: 'Email verification code',
                    required: true,
                  },
                  {
                    key: 'phone_otp',
                    label: 'Phone verification code',
                    required: true,
                  },
                ]}
                values={codes}
                onChange={setCodes}
              />
              <button
                type="button"
                className="text-btn"
                disabled={busy}
                onClick={async () => {
                  try {
                    setChallenge(
                      await api(
                        '/api/v1/auth/signup/send-otp',
                        'POST',
                        { email: values.email, phone: values.phone },
                        false,
                      ),
                    );
                    notify('New codes requested.');
                  } catch (error) {
                    setError(error);
                  }
                }}
              >
                Request new codes
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <Fields
                fields={academic.map(([key, label]) => ({
                  key,
                  label,
                  required: key !== 'state',
                }))}
                values={values}
                onChange={setValues}
              />
              <div className="form-grid">
                <label className="upload-box">
                  Profile picture <span>Optional · JPG, PNG or PDF</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                  />
                </label>
                <label className="upload-box">
                  Student ID <span>Required · JPG, PNG or PDF</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    required={!card}
                    onChange={(e) => setCard(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className="info-banner">
                <CheckCircle2 />
                <p>Contacts verified. Check your details before creating your account.</p>
              </div>
              <DetailGrid
                data={Object.fromEntries(
                  [
                    'first_name',
                    'last_name',
                    'role',
                    'email',
                    'phone',
                    ...academic.map(([key]) => key),
                  ].map((key) => [key, values[key]]),
                )}
              />
              <p className="muted">Student ID: {card?.name}</p>
              <label className="check-row">
                <input
                  type="checkbox"
                  required
                  checked={values.terms_accepted}
                  onChange={(e) => setValues({ ...values, terms_accepted: e.target.checked })}
                />{' '}
                I confirm my details are accurate and agree to the platform terms and privacy
                policy.
              </label>
            </>
          )}
          <div className="form-actions">
            {step > 0 && (
              <Button
                type="button"
                className="secondary"
                onClick={() => {
                  setError(null);
                  setStep(step === 1 ? 0 : step - 1);
                }}
              >
                Back
              </Button>
            )}
            <Button busy={busy} type="submit">
              {step === 3 ? 'Create account' : step === 1 ? 'Verify contacts' : 'Continue'}
              <ArrowRight size={16} />
            </Button>
          </div>
        </form>
      </div>
    </AuthFrame>
  );
}
export function ForgotPassword() {
  const [step, setStep] = useState(0);
  const [v, setV] = useState<Row>({
    email: '',
    otp: '',
    new_password: '',
    confirm_password: '',
  });
  const [error, setError] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (step === 0) {
        await api('/api/accounts/forgot-password/', 'POST', { email: v.email }, false);
        setStep(1);
      } else if (step === 1) {
        await api('/api/accounts/verify-otp/', 'POST', { email: v.email, otp: v.otp }, false);
        setStep(2);
      } else {
        await api('/api/accounts/reset-password/', 'POST', v, false);
        notify('Password reset. Sign in with your new password.');
        navigate('/login');
      }
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame>
      <div className="auth-form">
        <p className="eyebrow">ACCOUNT RECOVERY</p>
        <h1>{['Let’s get you back in.', 'Check your email.', 'Set a new password.'][step]}</h1>
        <p className="muted">
          {step === 0
            ? 'Enter your student account email to request a reset code.'
            : 'Complete verification to securely reset your password.'}
        </p>
        <ErrorBox error={error} />
        <form onSubmit={submit}>
          <Fields
            fields={
              step === 0
                ? [
                    {
                      key: 'email',
                      label: 'Email address',
                      type: 'email',
                      required: true,
                      wide: true,
                    },
                  ]
                : step === 1
                  ? [
                      {
                        key: 'otp',
                        label: 'Reset code',
                        required: true,
                        wide: true,
                      },
                    ]
                  : [
                      {
                        key: 'new_password',
                        label: 'New password',
                        type: 'password',
                        required: true,
                        wide: true,
                      },
                      {
                        key: 'confirm_password',
                        label: 'Confirm new password',
                        type: 'password',
                        required: true,
                        wide: true,
                      },
                    ]
            }
            values={v}
            onChange={setV}
          />
          <Button busy={busy} className="full" type="submit">
            Continue <ArrowRight size={16} />
          </Button>
        </form>
        <p className="auth-bottom">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </AuthFrame>
  );
}
