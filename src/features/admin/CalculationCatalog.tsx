import { useState } from 'react';
import { Calculator, Pencil, Plus, Trash2 } from 'lucide-react';
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

const endpoints: Record<string, string> = {
  sheet: '/api/v1/admin/calculation-sheets/',
  category: '/api/v1/admin/calculation-categories/',
  formula: '/api/v1/admin/calculation-formulas/',
};

export default function CalculationCatalog() {
  const sheets = useApi(endpoints.sheet);
  const [sheetId, setSheetId] = useState('');
  const categories = useApi(`${endpoints.category}?sheet_definition=${sheetId}`, !!sheetId);
  const [categoryId, setCategoryId] = useState('');
  const formulas = useApi(`${endpoints.formula}?category=${categoryId}`, !!categoryId);
  const [editor, setEditor] = useState<{ kind: string; item?: Row } | null>(null);
  function section(kind: string, label: string, query: any, enabled = true) {
    return (
      <Card>
        <div className="section-heading">
          <h2>{label}</h2>
          <Button disabled={!enabled} onClick={() => setEditor({ kind })}>
            <Plus size={16} />
            Add {kind}
          </Button>
        </div>
        {enabled ? (
          <QueryView query={query}>
            {rows(query.data).length ? (
              <div className="calculation-items">
                {rows(query.data).map((item) => (
                  <article className="calculation-item" key={item.id}>
                    <div className="inline-split">
                      <div>
                        <h3>{item.name}</h3>
                        <Badge tone={item.is_active ? 'success' : 'neutral'}>
                          {item.is_active ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                      <button
                        className="icon-btn"
                        aria-label={`Edit ${item.name}`}
                        onClick={() => setEditor({ kind, item })}
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                    {kind === 'formula' && (
                      <>
                        <p>
                          <code>{item.expression}</code>
                        </p>
                        <p className="muted">
                          {item.input_fields.length} inputs / {item.result_label} (
                          {item.result_unit}) / Revision {item.revision}
                        </p>
                      </>
                    )}
                    {kind === 'sheet' && (
                      <Button
                        className="secondary"
                        onClick={() => {
                          setSheetId(String(item.id));
                          setCategoryId('');
                        }}
                      >
                        Manage categories
                      </Button>
                    )}
                    {kind === 'category' && (
                      <Button className="secondary" onClick={() => setCategoryId(String(item.id))}>
                        Manage formulas
                      </Button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <Empty title={`No ${label.toLowerCase()} yet`} />
            )}
          </QueryView>
        ) : (
          <p className="muted">Select a {kind === 'category' ? 'sheet' : 'category'} first.</p>
        )}
      </Card>
    );
  }
  return (
    <>
      <PageHead
        title="Calculation setup"
        description="Create sheets, their categories and formulas. Student forms follow the inputs you configure."
      />
      {section('sheet', 'Calculation sheets', sheets)}
      <div className="spaced">
        <label className="field">
          Selected sheet
          <select
            aria-label="Setup sheet"
            value={sheetId}
            onChange={(e) => {
              setSheetId(e.target.value);
              setCategoryId('');
            }}
          >
            <option value="">Select sheet</option>
            {rows(sheets.data).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {section('category', 'Categories', categories, !!sheetId)}
      <div className="spaced">
        <label className="field">
          Selected category
          <select
            aria-label="Setup category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Select category</option>
            {rows(categories.data).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {section('formula', 'Formulas', formulas, !!categoryId)}
      {editor && (
        <CatalogEditor
          kind={editor.kind}
          item={editor.item}
          sheetId={sheetId}
          categoryId={categoryId}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  );
}

function CatalogEditor({
  kind,
  item,
  sheetId,
  categoryId,
  onClose,
}: {
  kind: string;
  item?: Row;
  sheetId: string;
  categoryId: string;
  onClose: () => void;
}) {
  const [v, setV] = useState<Row>({
    name: item?.name || '',
    code: item?.code || '',
    description: item?.description || '',
    sort_order: item?.sort_order ?? 0,
    is_active: item?.is_active ?? true,
    expression: item?.expression || '',
    result_label: item?.result_label || '',
    result_unit: item?.result_unit || '',
  });
  const [fields, setFields] = useState<Row[]>(
    item?.input_fields || [{ key: '', label: '', unit: '', required: true }],
  );
  const save = useAction(
    () => {
      const body: Row = {
        name: v.name,
        description: v.description,
        is_active: v.is_active,
        sort_order: Number(v.sort_order),
      };
      if (kind === 'sheet') body.code = v.code;
      if (kind === 'category' && !item) body.sheet_definition = Number(sheetId);
      if (kind === 'formula') {
        if (!item) body.category = Number(categoryId);
        Object.assign(body, {
          expression: v.expression,
          result_label: v.result_label,
          result_unit: v.result_unit,
          input_fields: fields.map((f) =>
            Object.fromEntries(
              Object.entries(f).filter(
                ([k, val]) =>
                  !['default', 'min_value', 'max_value'].includes(k) ||
                  (val !== '' && val !== undefined),
              ),
            ),
          ),
        });
      }
      return api(
        item ? `${endpoints[kind]}${item.id}/` : endpoints[kind],
        item ? 'PATCH' : 'POST',
        body,
      );
    },
    onClose,
    'Calculation setup saved.',
  );
  function changeField(index: number, values: Row) {
    setFields(fields.map((field, i) => (i === index ? values : field)));
  }
  return (
    <Modal title={`${item ? 'Edit' : 'Create'} ${kind}`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(null);
        }}
      >
        <Fields
          fields={[
            { key: 'name', label: 'Name', required: true },
            ...(kind === 'sheet' ? [{ key: 'code', label: 'Unique code', required: true }] : []),
            { key: 'description', label: 'Description', wide: true },
            { key: 'sort_order', label: 'Display order', type: 'number', min: 0 },
          ]}
          values={v}
          onChange={setV}
        />
        <label className="check-field">
          <input
            type="checkbox"
            checked={v.is_active}
            onChange={(e) => setV({ ...v, is_active: e.target.checked })}
          />
          Active
        </label>
        {kind === 'formula' && (
          <>
            <Fields
              fields={[
                { key: 'expression', label: 'Formula expression', required: true, wide: true },
                { key: 'result_label', label: 'Result label', required: true },
                { key: 'result_unit', label: 'Result unit', required: true },
              ]}
              values={v}
              onChange={setV}
            />
            <p className="muted">
              Use input keys with +, -, *, /, parentheses or ** (powers 0-6). Example: length *
              height. Every input must appear in the expression. Units label the entered values; no
              automatic conversion.
            </p>
            <h3>Required data fields</h3>
            {fields.map((field, index) => (
              <Card key={index}>
                <div className="inline-split">
                  <strong>Input {index + 1}</strong>
                  <button
                    type="button"
                    className="icon-btn danger"
                    aria-label={`Remove input ${index + 1}`}
                    onClick={() => setFields(fields.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <Fields
                  fields={[
                    { key: 'key', label: `Input ${index + 1} key`, required: true },
                    { key: 'label', label: `Input ${index + 1} label`, required: true },
                    { key: 'unit', label: 'Unit' },
                    { key: 'min_value', label: 'Minimum', type: 'number', step: 'any' },
                    { key: 'max_value', label: 'Maximum', type: 'number', step: 'any' },
                    {
                      key: 'default',
                      label: 'Default value',
                      type: 'number',
                      step: 'any',
                      required: !field.required,
                    },
                  ]}
                  values={field}
                  onChange={(values) => changeField(index, values)}
                />
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => changeField(index, { ...field, required: e.target.checked })}
                  />
                  Required
                </label>
              </Card>
            ))}
            <Button
              type="button"
              className="secondary"
              disabled={fields.length >= 30}
              onClick={() =>
                setFields([...fields, { key: '', label: '', unit: '', required: true }])
              }
            >
              <Plus size={16} />
              Add input field
            </Button>
            <p className="muted">
              Changing a formula creates a new revision. Previously saved calculation results stay
              unchanged. Disable unused formulas instead of deleting their history.
            </p>
          </>
        )}
        <div className="form-actions">
          <Button type="button" className="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={save.isPending}>
            <Calculator size={16} />
            Save {kind}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
