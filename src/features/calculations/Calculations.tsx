import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Calculator,
  ChevronRight,
  Layers3,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useApi, useAction } from '../../lib/query';
import { api, decimal, rows, stamp, title, type Row } from '../../lib/api';
import {
  Badge,
  Button,
  Card,
  DetailGrid,
  Empty,
  Fields,
  Modal,
  PageHead,
  QueryView,
} from '../../components/ui';
export function CalculationProjects() {
  const q = useApi('/api/v1/projects/?page_size=100');
  return (
    <>
      <PageHead
        title="A little precision. A big difference."
        description="Calculations live inside a project. Choose where you want to work."
      />
      <QueryView query={q}>
        {rows(q.data).length ? (
          <div className="invitation-grid">
            {rows(q.data).map((p) => (
              <Link
                className="card calculation-project"
                key={p.id}
                to={`/app/projects/${p.id}/calculations`}
              >
                <Calculator size={27} />
                <h2>{p.name}</h2>
                <p className="muted">
                  {p.project_type?.name} ? {p.city}
                </p>
                <span>
                  Open calculation sheets <ArrowRight size={16} />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <Empty
              title="Choose a project first"
              text="Create or join a project to start calculating."
              action={
                <Link className="btn" to="/app/projects">
                  My projects
                </Link>
              }
            />
          </Card>
        )}
      </QueryView>
    </>
  );
}
export default function Calculations() {
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useSearchParams();
  const q = useApi(`/api/v1/projects/${id}/calculation-sheets/`, true, 15000);
  const list = rows(q.data);
  const selected = list.find((s) => s.id === Number(search.get('sheet'))) || list[0];
  const supported = selected?.definition.calculation_available;
  const items = useApi(
    `/api/v1/calculation-sheets/${selected?.id}/items/?page=${page}`,
    !!selected,
    15000,
  );
  const [editor, setEditor] = useState<Row | null | undefined>(undefined);
  const [formula, setFormula] = useState<Row | null>(null);
  const [entryVersion, setEntryVersion] = useState(0);
  const del = useAction(
    (item: number) => api(`/api/v1/calculation-items/${item}/`, 'DELETE'),
    undefined,
    'Calculation item removed.',
  );
  useEffect(() => {
    setEditor(undefined);
    setFormula(null);
    setPage(1);
  }, [id, selected?.id]);
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Calculation sheets</h2>
          <p className="muted">Measure once. Understand every step.</p>
        </div>
      </div>
      <QueryView query={q}>
        {list.length ? (
          <div className="calculation-layout">
            <aside className="sheet-list card">
              {list.map((sheet) => (
                <button
                  key={sheet.id}
                  className={sheet.id === selected?.id ? 'selected' : ''}
                  onClick={() => setSearch({ sheet: String(sheet.id) })}
                >
                  <span className="sheet-icon">
                    <Layers3 size={19} />
                  </span>
                  <span>
                    <strong>{sheet.definition.name}</strong>
                    <small>{sheet.item_count} items</small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </aside>
            <div>
              {selected && (
                <Card>
                  <div className="section-heading">
                    <div>
                      <h2>{selected.definition.name}</h2>
                      <p className="muted">
                        {supported
                          ? 'Saved calculations shared with your project team.'
                          : 'Calculation inputs and formulas are not configured yet.'}
                      </p>
                    </div>
                    <Badge>{selected.item_count} items</Badge>
                  </div>
                  <CalculationEditor
                    key={`${id}-${selected.id}-${entryVersion}`}
                    sheet={selected}
                    item={null}
                    onClose={() => setEntryVersion((version) => version + 1)}
                  />
                  <h3 className="spaced">Saved calculations</h3>
                  <QueryView query={items}>
                    {rows(items.data).length ? (
                      <div className="calculation-items">
                        {rows(items.data).map((item) => (
                          <article className="calculation-item" key={item.id}>
                            <div className="inline-split">
                              <div>
                                <span className="eyebrow">CALCULATION ITEM</span>
                                <h3>{item.name}</h3>
                              </div>
                              <div className="button-row">
                                {supported && (
                                  <button
                                    className="icon-btn"
                                    aria-label={`Edit ${item.name}`}
                                    onClick={() => setEditor(item)}
                                  >
                                    <Pencil size={16} />
                                  </button>
                                )}
                                <button
                                  className="icon-btn danger"
                                  aria-label={`Delete ${item.name}`}
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `Delete ${item.name}? Its activity history will remain.`,
                                      )
                                    )
                                      del.mutate(item.id);
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="calculation-input-summary">
                              {Object.entries(item.input_data).map(([k, v]) => (
                                <span key={k}>
                                  {title(k)} <strong>{decimal(String(v))}</strong>{' '}
                                  {item.formula_snapshot?.input_fields?.find(
                                    (f: Row) => f.key === k,
                                  )?.unit || item.input_unit}
                                </span>
                              ))}
                            </div>
                            <div className="calculation-result">
                              <span>Final quantity</span>
                              <strong>
                                {decimal(item.final_quantity)} <small>{item.unit}</small>
                              </strong>
                            </div>
                            <footer>
                              <span>
                                By{' '}
                                {item.created_by?.name ||
                                  item.created_by?.email ||
                                  'Project member'}
                              </span>
                              <button className="text-btn" onClick={() => setFormula(item)}>
                                <BookOpen size={14} />
                                Formula & working
                              </button>
                            </footer>
                            {item.updated_by?.id !== item.created_by?.id && (
                              <small className="muted">
                                Last updated by {item.updated_by?.name || item.updated_by?.email}
                              </small>
                            )}
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">
                        No saved calculations yet. Select a category and formula above to calculate
                        your first item.
                      </p>
                    )}
                  </QueryView>
                  {(items.data?.previous || items.data?.next) && (
                    <div className="pagination">
                      <Button
                        className="secondary"
                        disabled={!items.data?.previous}
                        onClick={() => setPage(page - 1)}
                      >
                        Previous
                      </Button>
                      <span>Page {page}</span>
                      <Button
                        className="secondary"
                        disabled={!items.data?.next}
                        onClick={() => setPage(page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        ) : (
          <Card>
            <Empty title="No calculation sheets available" />
          </Card>
        )}
      </QueryView>
      {editor !== undefined && selected && (
        <CalculationEditor sheet={selected} item={editor} onClose={() => setEditor(undefined)} />
      )}{' '}
      {formula && <Formula item={formula} onClose={() => setFormula(null)} />}
    </>
  );
}
function CalculationEditor({
  sheet,
  item,
  onClose,
}: {
  sheet: Row;
  item: Row | null;
  onClose: () => void;
}) {
  const categories = useApi(`/api/v1/calculation-sheets/${sheet.id}/categories/`);
  const [categoryId, setCategoryId] = useState(String(item?.formula_snapshot?.category_id || ''));
  const formulas = useApi(
    `/api/v1/calculation-sheets/${sheet.id}/categories/${categoryId}/formulas/`,
    !!categoryId,
  );
  const [formulaId, setFormulaId] = useState(String(item?.formula_definition_id || ''));
  const selectedFormula = rows(formulas.data).find((f) => f.id === Number(formulaId));
  const [name, setName] = useState(item?.name || '');
  const [inputs, setInputs] = useState<Row>(item?.input_data || {});
  const action = useAction(
    () => {
      if (!selectedFormula) throw new Error('Select a formula first.');
      return api(
        item
          ? `/api/v1/calculation-items/${item.id}/`
          : `/api/v1/calculation-sheets/${sheet.id}/items/`,
        item ? 'PATCH' : 'POST',
        {
          name,
          formula_id: selectedFormula.id,
          formula_revision: selectedFormula.revision,
          input_data: Object.fromEntries(
            selectedFormula.input_fields
              .filter((f: Row) => inputs[f.key] !== '' && inputs[f.key] !== undefined)
              .map((f: Row) => [f.key, inputs[f.key]]),
          ),
        },
      );
    },
    onClose,
    item ? 'Recalculated and saved.' : 'Calculation saved.',
  );
  const content = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (selectedFormula) action.mutate(null);
      }}
    >
      <QueryView query={categories}>
        <label className="field">
          Category
          <select
            aria-label="Calculation category"
            required
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setFormulaId('');
              setInputs({});
            }}
          >
            <option value="">Select category</option>
            {rows(categories.data).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {!rows(categories.data).length && (
          <p className="muted">Admin has not configured any categories for this sheet.</p>
        )}
      </QueryView>
      {categoryId && (
        <QueryView query={formulas}>
          <label className="field">
            Formula
            <select
              aria-label="Calculation formula"
              required
              value={formulaId}
              onChange={(e) => {
                setFormulaId(e.target.value);
                const f = rows(formulas.data).find((row) => row.id === Number(e.target.value));
                setInputs(
                  Object.fromEntries(
                    (f?.input_fields || [])
                      .filter((field: Row) => field.default !== undefined)
                      .map((field: Row) => [field.key, field.default]),
                  ),
                );
              }}
            >
              <option value="">Select formula</option>
              {rows(formulas.data).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          {!rows(formulas.data).length && (
            <p className="muted">No active formulas in this category.</p>
          )}
        </QueryView>
      )}
      {selectedFormula && (
        <>
          <Fields
            fields={[{ key: 'name', label: 'Item name', required: true, wide: true }]}
            values={{ name }}
            onChange={(v) => setName(v.name)}
          />
          <p className="muted">{selectedFormula.description}</p>
          <Fields
            fields={selectedFormula.input_fields.map((f: Row) => ({
              key: f.key,
              label: f.unit ? `${f.label} (${f.unit})` : f.label,
              type: 'number',
              step: 'any',
              required: f.required,
              min: f.min_value,
              max: f.max_value,
            }))}
            values={inputs}
            onChange={setInputs}
          />
          <div className="formula-preview">
            <span>
              {selectedFormula.result_label} ({selectedFormula.result_unit})
            </span>
            <strong>{selectedFormula.expression}</strong>
            <p className="muted">
              The server calculates and saves your result. Each calculation uses one monthly
              calculation.
            </p>
          </div>
        </>
      )}
      <div className="form-actions">
        {item && (
          <Button type="button" className="secondary" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button busy={action.isPending} disabled={!selectedFormula} type="submit">
          <Calculator size={16} />
          Calculate & save
        </Button>
      </div>
    </form>
  );
  return item ? (
    <Modal title="Edit calculation" onClose={onClose}>
      {content}
    </Modal>
  ) : (
    <section aria-label="New calculation">{content}</section>
  );
}

function Formula({ item, onClose }: { item: Row; onClose: () => void }) {
  const q = useApi(`/api/v1/calculation-items/${item.id}/formula/`);
  return (
    <Modal title="Formula & working" onClose={onClose}>
      <QueryView query={q}>
        <p className="eyebrow">{item.name}</p>
        <div className="formula-block">
          <small>FORMULA</small>
          <h2>{q.data?.formula}</h2>
        </div>
        <h3>Input values</h3>
        <DetailGrid data={q.data?.input_data || {}} />
        <div className="formula-block">
          <small>WORKING</small>
          <h2>{q.data?.working}</h2>
        </div>
        <div className="formula-result">
          <span>Result</span>
          <strong>
            {decimal(q.data?.result)} {q.data?.unit}
          </strong>
        </div>
      </QueryView>
    </Modal>
  );
}
export function Activities() {
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const q = useApi(`/api/v1/projects/${id}/activities/?page=${page}`, true, 15000);
  const [selected, setSelected] = useState<Row | null>(null);
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>The story of your project.</h2>
          <p className="muted">Every calculation change, with the person behind it.</p>
        </div>
        <Activity size={25} />
      </div>
      <Card>
        <QueryView query={q}>
          {rows(q.data).length ? (
            <div className="activity-list">
              {rows(q.data).map((event) => (
                <button key={event.id} className="activity-row" onClick={() => setSelected(event)}>
                  <span className={`activity-dot ${event.action.toLowerCase()}`} />
                  <div>
                    <strong>{event.actor?.name || event.actor?.email || 'Project member'}</strong>
                    <p>
                      {title(event.action)}{' '}
                      {event.new_value?.name || event.old_value?.name || 'a calculation item'}{' '}
                      <Badge>{title(event.module)}</Badge>
                    </p>
                    <small>{stamp(event.created_at)}</small>
                  </div>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title="The first chapter is yours"
              text="Calculation changes will be recorded here automatically."
            />
          )}
        </QueryView>
        {(q.data?.previous || q.data?.next) && (
          <div className="pagination">
            <Button
              className="secondary"
              disabled={!q.data?.previous}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span>Page {page}</span>
            <Button
              className="secondary"
              disabled={!q.data?.next}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </Card>
      {selected && (
        <Modal title="Calculation activity" onClose={() => setSelected(null)}>
          <p>
            <strong>{selected.actor?.name || selected.actor?.email}</strong> ?{' '}
            {stamp(selected.created_at)}
          </p>
          <Badge>{title(selected.action)}</Badge>
          <div className="review-cards spaced">
            {[
              ['Before', selected.old_value],
              ['After', selected.new_value],
            ].map(([label, value]) => (
              <div key={label}>
                <h3>{label}</h3>
                {value ? (
                  <>
                    <DetailGrid
                      data={{
                        name: value.name,
                        formula: value.formula,
                        working: value.working,
                        result: value.final_quantity,
                        unit: value.unit,
                      }}
                    />
                    <DetailGrid data={value.input_data || {}} />
                  </>
                ) : (
                  <p className="muted">No value</p>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
