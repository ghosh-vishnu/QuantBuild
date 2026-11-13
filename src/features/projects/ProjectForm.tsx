import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Layers3, Upload } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useApi } from '../../lib/query';
import { api, notify, type Row } from '../../lib/api';
import {
  PageHead,
  Card,
  Fields,
  Button,
  ErrorBox,
  QueryView,
  DetailGrid,
  BreadCrumb,
  type FieldDef,
} from '../../components/ui';
import LocationMap from './LocationMap';
const basic: FieldDef[] = [
  { key: 'name', label: 'Project name', required: true },
  { key: 'project_type_id', label: 'Project type', required: true },
  { key: 'category', label: 'Project category', required: true },
  { key: 'contract_type', label: 'Contract type', required: true },
  { key: 'client_name', label: 'Client / owner', required: true },
  { key: 'start_date', label: 'Start date', type: 'date', required: true },
  {
    key: 'completion_date',
    label: 'Completion date',
    type: 'date',
    required: true,
  },
  {
    key: 'description',
    label: 'Description',
    type: 'textarea',
    wide: true,
    help: 'Up to 200 characters.',
  },
];
const location: FieldDef[] = [
  { key: 'country', label: 'Country', required: true },
  { key: 'state', label: 'State', required: true },
  { key: 'city', label: 'City', required: true },
  { key: 'pincode', label: 'PIN / postal code', required: true },
  { key: 'address_line_1', label: 'Address line 1', required: true },
  { key: 'address_line_2', label: 'Address line 2' },
  {
    key: 'site_coordinates',
    label: 'Site coordinates',
    wide: true,
    help: 'Drag the map pin or enter decimal latitude, longitude.',
  },
];
const construction: FieldDef[] = [
  {
    key: 'built_up_area_sqft',
    label: 'Built-up area (sq. ft.)',
    type: 'number',
    step: '0.01',
    min: 0.01,
    required: true,
  },
  {
    key: 'total_floors',
    label: 'Total floors',
    type: 'number',
    min: 1,
    step: '1',
    required: true,
  },
  {
    key: 'number_of_units',
    label: 'Number of units',
    type: 'number',
    min: 1,
    step: '1',
    required: true,
  },
  {
    key: 'project_area_acres',
    label: 'Project area (acres)',
    type: 'number',
    min: 0.0001,
    step: '0.0001',
    required: true,
  },
  {
    key: 'land_area_sqft',
    label: 'Land area (sq. ft.)',
    type: 'number',
    min: 0.01,
    step: '0.01',
    required: true,
  },
  {
    key: 'construction_area_sqft',
    label: 'Construction area (sq. ft.)',
    type: 'number',
    min: 0.01,
    step: '0.01',
    required: true,
  },
  {
    key: 'structure_type',
    label: 'Structure type',
    required: true,
    wide: true,
  },
];
export default function ProjectForm() {
  const { id } = useParams();
  const edit = !!id;
  const { session } = useAuth();
  const navigate = useNavigate();
  const options = useApi('/api/v1/projects/options/');
  const existing = useApi(`/api/v1/projects/${id}/`, edit);
  const access = useApi(`/api/v1/projects/${id}/summary/`, edit);
  const [v, setV] = useState<Row>({ module_ids: [], country: 'India' });
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<any>(null);
  const owner = !edit || existing.data?.owner_id === session?.user.id;
  useEffect(() => {
    if (existing.data) {
      const copy: Row = {};
      [...basic, ...location, ...construction].forEach(
        (f) =>
          (copy[f.key] =
            f.key === 'project_type_id'
              ? existing.data?.project_type?.id
              : (existing.data?.[f.key] ?? '')),
      );
      copy.module_ids = existing.data.module_ids || [];
      setV(copy);
    }
  }, [existing.data]);
  const labels = ['Basic information', 'Location', 'Project details', 'Modules', 'Review'];
  const definitions = options.data?.project_types || [];
  const tools: Row[] = options.data?.modules || [];
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (step < 4) {
      if (step === 3 && owner && !v.module_ids.length) {
        setError(new Error('Select at least one project module.'));
        return;
      }
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      const payload: Row = { ...v, project_type_id: Number(v.project_type_id) };
      if (!owner) delete payload.module_ids;
      const project = await api(
        edit ? `/api/v1/projects/${id}/` : '/api/v1/projects/',
        edit ? 'PATCH' : 'POST',
        payload,
      );
      if (file) {
        const body = new FormData();
        body.append('file', file);
        try {
          await api(`/api/v1/projects/${project.id}/`, 'PATCH', body);
        } catch (err) {
          notify(
            `Project saved, but the document could not upload: ${(err as Error).message}`,
            'error',
          );
          navigate(`/app/projects/${project.id}`);
          return;
        }
      }
      notify(edit ? 'Project updated.' : 'Project created. Your team workspace is ready.');
      navigate(`/app/projects/${project.id}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <BreadCrumb
        items={[
          { label: 'My projects', to: '/app/projects' },
          { label: edit ? 'Edit project' : 'Create project' },
        ]}
      />
      <PageHead
        title={edit ? 'Shape the next step.' : 'Create a project.'}
        description="A clear foundation for your team, tools and calculations."
      />
      <QueryView query={edit && (existing.isPending || existing.isError) ? existing : options}>
        <Card className="wizard-card">
          <div className="steps project-steps">
            {labels.map((label, i) => (
              <div className={step === i ? 'current' : step > i ? 'done' : ''} key={label}>
                <span>{step > i ? <Check size={17} /> : String(i + 1).padStart(2, '0')}</span>
                <small>{label}</small>
              </div>
            ))}
          </div>
          <ErrorBox error={error} />
          <form onSubmit={submit}>
            <div className="wizard-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">STEP {step + 1} OF 5</p>
                  <h2>{labels[step]}</h2>
                </div>
                <Layers3 size={27} />
              </div>
              {step === 0 && (
                <Fields
                  fields={basic.map((f) =>
                    f.key === 'project_type_id'
                      ? {
                          ...f,
                          options: definitions.map((d: Row) => ({
                            value: d.id,
                            label: d.name,
                          })),
                        }
                      : f,
                  )}
                  values={v}
                  onChange={setV}
                />
              )}{' '}
              {step === 1 && (
                <>
                  <Fields fields={location} values={v} onChange={setV} />
                  <LocationMap
                    value={v.site_coordinates || ''}
                    onChange={(value) =>
                      setV((current) => ({
                        ...current,
                        site_coordinates: value,
                      }))
                    }
                  />
                </>
              )}
              {step === 2 && (
                <>
                  <Fields fields={construction} values={v} onChange={setV} />
                  {(!edit ||
                    owner ||
                    access.data?.access?.permissions?.includes('documents.manage')) && (
                    <label className="upload-box document-upload">
                      <Upload size={25} />
                      <strong>Project image or document</strong>
                      <span>JPG, PNG or PDF · Up to 10 MB</span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                      />
                      {existing.data?.document_name && (
                        <small>Current: {existing.data.document_name}</small>
                      )}
                    </label>
                  )}
                </>
              )}
              {step === 3 && (
                <>
                  <p className="muted">
                    Choose the tools this project needs. Team members can be invited after the
                    project is created.
                  </p>
                  {tools.length ? (
                    <div className="tool-grid">
                      {tools.map((tool) => (
                        <label
                          key={tool.id}
                          className={`tool-option ${v.module_ids.includes(tool.id) ? 'selected' : ''} ${!tool.allowed ? 'disabled' : ''}`}
                        >
                          <input
                            type="checkbox"
                            disabled={!owner || !tool.allowed}
                            checked={v.module_ids.includes(tool.id)}
                            onChange={(e) =>
                              setV({
                                ...v,
                                module_ids: e.target.checked
                                  ? [...v.module_ids, tool.id]
                                  : v.module_ids.filter((n: number) => n !== tool.id),
                              })
                            }
                          />
                          <Layers3 size={25} />
                          <strong>{tool.name}</strong>
                          <small>{tool.description || tool.message || 'Project tool'}</small>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="info-banner">
                      No project tools are configured. Ask your administrator to add project tools
                      before creating a project.
                    </div>
                  )}
                </>
              )}
              {step === 4 && (
                <>
                  <div className="review-cards">
                    <div>
                      <h3>Basic information</h3>
                      <DetailGrid
                        data={Object.fromEntries(
                          basic.map((f) => [
                            f.label,
                            f.key === 'project_type_id'
                              ? definitions.find((d: Row) => d.id === Number(v.project_type_id))
                                  ?.name
                              : v[f.key],
                          ]),
                        )}
                      />
                    </div>
                    <div>
                      <h3>Location</h3>
                      <DetailGrid
                        data={Object.fromEntries(location.map((f) => [f.label, v[f.key]]))}
                      />
                    </div>
                    <div>
                      <h3>Project details</h3>
                      <DetailGrid
                        data={Object.fromEntries(construction.map((f) => [f.label, v[f.key]]))}
                      />
                    </div>
                    <div>
                      <h3>Selected modules</h3>
                      {tools
                        .filter((tool) => v.module_ids.includes(tool.id))
                        .map((tool) => (
                          <p className="check-row" key={tool.id}>
                            <CheckCircle2 size={16} />
                            {tool.name}
                          </p>
                        ))}
                      {file && <p className="muted">Document: {file.name}</p>}
                    </div>
                  </div>
                  <div className="info-banner">
                    <CheckCircle2 size={20} />
                    <p>
                      Review your details before{' '}
                      {edit ? 'saving changes' : 'creating the workspace'}. You can manage the
                      project team after saving.
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="wizard-footer">
              <Button
                type="button"
                className="secondary"
                onClick={() =>
                  step
                    ? setStep(step - 1)
                    : navigate(edit ? `/app/projects/${id}` : '/app/projects')
                }
              >
                <ArrowLeft size={16} />
                {step ? 'Previous step' : 'Cancel'}
              </Button>
              <Button busy={busy} type="submit">
                {step === 4 ? (edit ? 'Save changes' : 'Create project') : 'Next step'}
                <ArrowRight size={16} />
              </Button>
            </div>
          </form>
        </Card>
      </QueryView>
    </>
  );
}
