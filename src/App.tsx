import { lazy, Suspense, Component, type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes, Link, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { Login, Signup, ForgotPassword } from './auth/AuthPages';
import Layout from './components/Layout';
import { Card, Empty, Loading, QueryView } from './components/ui';
import { useApi } from './lib/query';
const Dashboard = lazy(() => import('./features/Dashboard'));
const Projects = lazy(() =>
  import('./features/projects/Projects').then((m) => ({ default: m.Projects })),
);
const ProjectLayout = lazy(() =>
  import('./features/projects/Projects').then((m) => ({
    default: m.ProjectLayout,
  })),
);
const ProjectOverview = lazy(() =>
  import('./features/projects/Projects').then((m) => ({
    default: m.ProjectOverview,
  })),
);
const Invitations = lazy(() =>
  import('./features/projects/Projects').then((m) => ({
    default: m.Invitations,
  })),
);
const ProjectForm = lazy(() => import('./features/projects/ProjectForm'));
const Team = lazy(() => import('./features/projects/Team'));
const Calculations = lazy(() => import('./features/calculations/Calculations'));
const CalculationProjects = lazy(() =>
  import('./features/calculations/Calculations').then((m) => ({
    default: m.CalculationProjects,
  })),
);
const Activities = lazy(() =>
  import('./features/calculations/Calculations').then((m) => ({
    default: m.Activities,
  })),
);
const Chat = lazy(() => import('./features/chat/Chat'));
const Students = lazy(() => import('./features/admin/Students'));
const Notifications = lazy(() =>
  import('./features/admin/Students').then((m) => ({
    default: m.Notifications,
  })),
);
const Access = lazy(() => import('./features/admin/Access'));
const ProjectSetup = lazy(() =>
  import('./features/admin/Access').then((m) => ({ default: m.ProjectSetup })),
);
const CalculationCatalog = lazy(() => import('./features/admin/CalculationCatalog'));
const Plans = lazy(() => import('./features/admin/Plans'));
const Profile = lazy(() => import('./features/Account').then((m) => ({ default: m.Profile })));
const Subscription = lazy(() =>
  import('./features/Account').then((m) => ({ default: m.Subscription })),
);
const FeaturePlaceholder = lazy(() =>
  import('./features/Account').then((m) => ({ default: m.FeaturePlaceholder })),
);
function Protected() {
  const { session } = useAuth();
  const location = useLocation();
  return session ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  );
}
function Public({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const location = useLocation();
  const from = location.state?.from;
  const destination =
    typeof from === 'string' && (from === '/app' || from.startsWith('/app/')) ? from : '/app';
  return session ? <Navigate to={destination} replace /> : <>{children}</>;
}
function Admin() {
  const { session } = useAuth();
  return session?.user.role === 'ADMIN' ? <Outlet /> : <Navigate to="/app" replace />;
}
function ModuleGate({ code, children }: { code: string; children: ReactNode }) {
  const q = useApi('/api/v1/modules/');
  const module = q.data?.modules?.find((m: any) => m.code === code);
  return (
    <QueryView query={q}>
      {module?.allowed ? (
        children
      ) : (
        <Card>
          <Empty
            title={
              q.data?.account?.approval_status === 'PENDING'
                ? 'Your account is under review'
                : 'This workspace is not available yet'
            }
            text={
              q.data?.account?.review_message ||
              module?.message ||
              'Your role or current plan does not include this module.'
            }
            action={
              <Link to="/app/subscription" className="btn secondary">
                View your access
              </Link>
            }
          />
        </Card>
      )}
    </QueryView>
  );
}
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="fatal-error">
        <h1>Letâ€™s try that again.</h1>
        <p>This page couldnâ€™t be displayed. Your saved work is still on the server.</p>
        <button className="btn" onClick={() => location.reload()}>
          Reload workspace
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route
            path="/login"
            element={
              <Public>
                <Login />
              </Public>
            }
          />
          <Route
            path="/signup"
            element={
              <Public>
                <Signup />
              </Public>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <Public>
                <ForgotPassword />
              </Public>
            }
          />
          <Route element={<Protected />}>
            <Route path="/app" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="subscription" element={<Subscription />} />
              <Route path="invitations" element={<Invitations />} />
              <Route
                path="projects"
                element={
                  <ModuleGate code="my-projects">
                    <Projects />
                  </ModuleGate>
                }
              />
              <Route
                path="projects/new"
                element={
                  <ModuleGate code="my-projects">
                    <ProjectForm />
                  </ModuleGate>
                }
              />
              <Route
                path="projects/:id/edit"
                element={
                  <ModuleGate code="my-projects">
                    <ProjectForm />
                  </ModuleGate>
                }
              />
              <Route
                path="projects/:id"
                element={
                  <ModuleGate code="my-projects">
                    <ProjectLayout />
                  </ModuleGate>
                }
              >
                <Route index element={<ProjectOverview />} />
                <Route path="team" element={<Team />} />
                <Route path="chat" element={<Chat />} />
                <Route
                  path="calculations"
                  element={
                    <ModuleGate code="calculations">
                      <Calculations />
                    </ModuleGate>
                  }
                />
                <Route
                  path="activities"
                  element={
                    <ModuleGate code="calculations">
                      <Activities />
                    </ModuleGate>
                  }
                />
              </Route>
              <Route
                path="calculations"
                element={
                  <ModuleGate code="calculations">
                    <CalculationProjects />
                  </ModuleGate>
                }
              />
              <Route
                path="inventory"
                element={
                  <ModuleGate code="inventory">
                    <FeaturePlaceholder name="Inventory" endpoint="/api/v1/inventory/" />
                  </ModuleGate>
                }
              />
              <Route
                path="reports"
                element={
                  <ModuleGate code="reports">
                    <FeaturePlaceholder name="Reports" endpoint="/api/v1/reports/" />
                  </ModuleGate>
                }
              />
              <Route
                path="drawings"
                element={
                  <ModuleGate code="drawing-referer">
                    <FeaturePlaceholder name="Drawing & reference" endpoint="/api/v1/drawings/" />
                  </ModuleGate>
                }
              />
              <Route element={<Admin />}>
                <Route path="admin/students" element={<Students />} />
                <Route path="admin/notifications" element={<Notifications />} />
                <Route path="admin/access" element={<Access />} />
                <Route path="admin/calculations" element={<CalculationCatalog />} />
                <Route path="admin/setup" element={<ProjectSetup />} />
                <Route path="admin/plans" element={<Plans />} />
              </Route>
              <Route
                path="*"
                element={
                  <Empty
                    title="This page is still on the drawing board"
                    action={
                      <Link to="/app" className="btn">
                        Back to overview
                      </Link>
                    }
                  />
                }
              />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
