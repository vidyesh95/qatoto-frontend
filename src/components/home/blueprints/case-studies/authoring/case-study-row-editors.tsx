// TRANSPORT: props-only — the case-study form's repeatable row editors. No network.
//
// Each editor owns nothing: it renders the rows it is given and hands the next array back. New row ids
// are minted in the add button's click handler, never during render.

import {
  CheckboxRow,
  LabeledEnumSelect,
  LabeledTextArea,
  LabeledTextInput,
  RepeatableRowShell,
} from "@/components/home/blueprints/authoring/form-fields";
import {
  OUTCOME_METRIC_KIND_LABELS,
  OUTCOME_METRIC_KINDS,
  type EvidenceCompanyDraftRow,
  type OutcomeMetricDraftRow,
  type OutcomeMetricKind,
  type SourceDraftRow,
  type TextItemDraftRow,
} from "@/components/home/blueprints/case-studies/authoring/case-study-shared";
import {
  CASE_STUDY_CURRENCIES,
  CASE_STUDY_CURRENCY_LABELS,
} from "@/lib/blueprints/case-study-authoring.schemas";
import { CASE_STUDY_WITHHELD_COMPANY_LABEL } from "@/lib/blueprints/schemas";

/** Reads the contract's message for one field path, or `null`. */
type FieldErrorReader = (fieldPath: string) => string | null;

function AddRowButton({
  label,
  onAddRow,
}: {
  readonly label: string;
  readonly onAddRow: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAddRow}
      className="rounded-full border border-[#00696E]/40 px-4 py-2 text-sm font-medium text-[#00696E] transition-colors hover:bg-[#00696E]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
    >
      {label}
    </button>
  );
}

/**
 * A FORM'S EMPTY LIST SAYS SO IN WORDS, the opposite of the read surface, for the reason
 * `RepeatableRowsShell` records: in a form an absence is a question nobody has answered yet.
 */
function EmptyRowsMessage({ message }: { readonly message: string }) {
  return <p className="text-sm text-muted-foreground">{message}</p>;
}

/** Steps and pitfalls: one sentence per row. */
export function TextItemRowsEditor({
  rows,
  onRowsChange,
  fieldPath,
  rowNoun,
  addLabel,
  emptyMessage,
  readFieldError,
}: {
  readonly rows: readonly TextItemDraftRow[];
  readonly onRowsChange: (nextRows: readonly TextItemDraftRow[]) => void;
  /** The contract path of the list, e.g. `actionSteps`. */
  readonly fieldPath: string;
  readonly rowNoun: string;
  readonly addLabel: string;
  readonly emptyMessage: string;
  readonly readFieldError: FieldErrorReader;
}) {
  return (
    <>
      {rows.length === 0 ? (
        <EmptyRowsMessage message={emptyMessage} />
      ) : (
        <div className="space-y-3">
          {rows.map((row, rowIndex) => (
            <RepeatableRowShell
              key={row.rowId}
              rowLabel={`${rowNoun} ${rowIndex + 1}`}
              onRemoveRow={() =>
                onRowsChange(rows.filter((existingRow) => existingRow.rowId !== row.rowId))
              }
            >
              <div className="sm:col-span-2">
                <LabeledTextArea
                  label={`${rowNoun} ${rowIndex + 1}`}
                  value={row.text}
                  onValueChange={(text) =>
                    onRowsChange(
                      rows.map((existingRow) =>
                        existingRow.rowId === row.rowId ? { ...existingRow, text } : existingRow,
                      ),
                    )
                  }
                  rowCount={2}
                  errorMessage={readFieldError(`${fieldPath}.${rowIndex}`)}
                />
              </div>
            </RepeatableRowShell>
          ))}
        </div>
      )}
      <AddRowButton
        label={addLabel}
        onAddRow={() => onRowsChange([...rows, { rowId: crypto.randomUUID(), text: "" }])}
      />
    </>
  );
}

/**
 * Companies, each with a name, a place and a year.
 *
 * ⚠️ THE WITHHOLD OPTION SHOWS ONLY FOR A FIRST-HAND WRITER, and stays visible on a row that already
 * uses it after the answer changes. Hiding it then would leave a refusal the writer has no control to
 * fix; the contract names the problem and the box is right there to untick.
 *
 * ⚠️ THE NAME FIELD STAYS WHEN THE NAME IS WITHHELD, relabelled to say who sees it. Withholding hides
 * the name from readers and sends it to moderators, so the form must still ask for it, and must say
 * plainly that somebody at Qatoto will read it.
 */
export function EvidenceCompanyRowsEditor({
  rows,
  onRowsChange,
  canWithholdNames,
  readFieldError,
}: {
  readonly rows: readonly EvidenceCompanyDraftRow[];
  readonly onRowsChange: (nextRows: readonly EvidenceCompanyDraftRow[]) => void;
  /** True when the writer said they worked on this. */
  readonly canWithholdNames: boolean;
  readonly readFieldError: FieldErrorReader;
}) {
  function updateRow(rowId: string, rowPatch: Partial<EvidenceCompanyDraftRow>): void {
    onRowsChange(rows.map((row) => (row.rowId === rowId ? { ...row, ...rowPatch } : row)));
  }

  return (
    <>
      {rows.length === 0 ? (
        <EmptyRowsMessage message="No company named. The case study will show no company line." />
      ) : (
        <div className="space-y-3">
          {rows.map((row, rowIndex) => {
            const withholdErrorMessage = readFieldError(
              `evidenceCompanies.${rowIndex}.isNameWithheld`,
            );
            const isWithholdOptionShown = canWithholdNames || row.isNameWithheld;
            return (
              <RepeatableRowShell
                key={row.rowId}
                rowLabel={`Company ${rowIndex + 1}`}
                onRemoveRow={() =>
                  onRowsChange(rows.filter((existingRow) => existingRow.rowId !== row.rowId))
                }
              >
                <div className="sm:col-span-2">
                  <LabeledTextInput
                    label={row.isNameWithheld ? "Name, seen only by moderators" : "Name"}
                    value={row.name}
                    onValueChange={(name) => updateRow(row.rowId, { name })}
                    placeholder="Verdant Sensing"
                    errorMessage={readFieldError(`evidenceCompanies.${rowIndex}.name`)}
                  />
                </div>
                {isWithholdOptionShown ? (
                  <div className="sm:col-span-2">
                    <CheckboxRow
                      label="Withhold this company's name from readers"
                      detail={`For a company you are not free to name in public. Readers see "${CASE_STUDY_WITHHELD_COMPANY_LABEL}" beside its place and year, so keep those broad enough not to identify it either. Qatoto's moderators still see the name, so they can check the case study.`}
                      isChecked={row.isNameWithheld}
                      onCheckedChange={(isNameWithheld) => updateRow(row.rowId, { isNameWithheld })}
                    />
                    {withholdErrorMessage === null ? null : (
                      <p className="text-xs text-destructive">{withholdErrorMessage}</p>
                    )}
                  </div>
                ) : null}
                <LabeledTextInput
                  label="Place"
                  value={row.locationLabel}
                  onValueChange={(locationLabel) => updateRow(row.rowId, { locationLabel })}
                  placeholder="Porto"
                  errorMessage={readFieldError(`evidenceCompanies.${rowIndex}.locationLabel`)}
                />
                <LabeledTextInput
                  label="Year"
                  value={row.yearLabel}
                  onValueChange={(yearLabel) => updateRow(row.rowId, { yearLabel })}
                  placeholder="2024"
                  errorMessage={readFieldError(`evidenceCompanies.${rowIndex}.yearLabel`)}
                />
              </RepeatableRowShell>
            );
          })}
        </div>
      )}
      <AddRowButton
        label="Add a company"
        onAddRow={() =>
          onRowsChange([
            ...rows,
            {
              rowId: crypto.randomUUID(),
              name: "",
              isNameWithheld: false,
              locationLabel: "",
              yearLabel: "",
            },
          ])
        }
      />
    </>
  );
}

/** What the value field is called for each kind, and an example in the unit the collector reads. */
const METRIC_VALUE_FIELD_COPY: Record<
  OutcomeMetricKind | "",
  { readonly label: string; readonly placeholder: string }
> = {
  count: { label: "Count", placeholder: "1000" },
  money: { label: "Amount", placeholder: "5.12" },
  percentage: { label: "Percentage", placeholder: "43.8" },
  "": { label: "Value", placeholder: "" },
};

export function OutcomeMetricRowsEditor({
  rows,
  onRowsChange,
  readFieldError,
  readFieldErrorsUnder,
}: {
  readonly rows: readonly OutcomeMetricDraftRow[];
  readonly onRowsChange: (nextRows: readonly OutcomeMetricDraftRow[]) => void;
  readonly readFieldError: FieldErrorReader;
  /** Every message at a path or below it. A figure's value can be refused at several depths. */
  readonly readFieldErrorsUnder: FieldErrorReader;
}) {
  function updateRow(rowId: string, rowPatch: Partial<OutcomeMetricDraftRow>): void {
    onRowsChange(rows.map((row) => (row.rowId === rowId ? { ...row, ...rowPatch } : row)));
  }

  return (
    <>
      {rows.length === 0 ? (
        <EmptyRowsMessage message="No figures yet." />
      ) : (
        <div className="space-y-3">
          {rows.map((row, rowIndex) => {
            const valueFieldCopy = METRIC_VALUE_FIELD_COPY[row.kind];
            return (
              <RepeatableRowShell
                key={row.rowId}
                rowLabel={`Figure ${rowIndex + 1}`}
                onRemoveRow={() =>
                  onRowsChange(rows.filter((existingRow) => existingRow.rowId !== row.rowId))
                }
              >
                <LabeledTextInput
                  label="Label"
                  value={row.label}
                  onValueChange={(label) => updateRow(row.rowId, { label })}
                  placeholder="Units shipped"
                  errorMessage={readFieldError(`outcomeMetrics.${rowIndex}.label`)}
                />
                <LabeledEnumSelect
                  label="Kind of figure"
                  value={row.kind}
                  options={OUTCOME_METRIC_KINDS}
                  optionLabels={OUTCOME_METRIC_KIND_LABELS}
                  onValueChange={(kind) => updateRow(row.rowId, { kind })}
                  emptyOptionLabel="Choose one"
                />
                <LabeledTextInput
                  label={valueFieldCopy.label}
                  value={row.valueText}
                  onValueChange={(valueText) => updateRow(row.rowId, { valueText })}
                  placeholder={valueFieldCopy.placeholder}
                  errorMessage={readFieldErrorsUnder(`outcomeMetrics.${rowIndex}.value`)}
                />
                {row.kind === "money" ? (
                  <LabeledEnumSelect
                    label="Currency"
                    value={row.currency}
                    options={CASE_STUDY_CURRENCIES}
                    optionLabels={CASE_STUDY_CURRENCY_LABELS}
                    onValueChange={(currency) => {
                      if (currency !== "") updateRow(row.rowId, { currency });
                    }}
                  />
                ) : null}
              </RepeatableRowShell>
            );
          })}
        </div>
      )}
      <AddRowButton
        label="Add a figure"
        onAddRow={() =>
          onRowsChange([
            ...rows,
            { rowId: crypto.randomUUID(), label: "", kind: "", valueText: "", currency: "USD" },
          ])
        }
      />
    </>
  );
}

export function SourceRowsEditor({
  rows,
  onRowsChange,
  readFieldError,
}: {
  readonly rows: readonly SourceDraftRow[];
  readonly onRowsChange: (nextRows: readonly SourceDraftRow[]) => void;
  readonly readFieldError: FieldErrorReader;
}) {
  function updateRow(rowId: string, rowPatch: Partial<SourceDraftRow>): void {
    onRowsChange(rows.map((row) => (row.rowId === rowId ? { ...row, ...rowPatch } : row)));
  }

  return (
    <>
      {rows.length === 0 ? (
        <EmptyRowsMessage message="No sources linked." />
      ) : (
        <div className="space-y-3">
          {rows.map((row, rowIndex) => (
            <RepeatableRowShell
              key={row.rowId}
              rowLabel={`Source ${rowIndex + 1}`}
              onRemoveRow={() =>
                onRowsChange(rows.filter((existingRow) => existingRow.rowId !== row.rowId))
              }
            >
              <LabeledTextInput
                label="Label"
                value={row.label}
                onValueChange={(label) => updateRow(row.rowId, { label })}
                placeholder="Run-by-run cost breakdown"
                errorMessage={readFieldError(`sources.${rowIndex}.label`)}
              />
              <LabeledTextInput
                label="Publisher"
                value={row.publisherLabel}
                onValueChange={(publisherLabel) => updateRow(row.rowId, { publisherLabel })}
                placeholder="Verdant Sensing build log"
                errorMessage={readFieldError(`sources.${rowIndex}.publisherLabel`)}
              />
              <div className="sm:col-span-2">
                <LabeledTextInput
                  label="Address"
                  inputType="url"
                  value={row.url}
                  onValueChange={(url) => updateRow(row.rowId, { url })}
                  placeholder="https://…"
                  errorMessage={readFieldError(`sources.${rowIndex}.url`)}
                />
              </div>
            </RepeatableRowShell>
          ))}
        </div>
      )}
      <AddRowButton
        label="Add a source"
        onAddRow={() =>
          onRowsChange([
            ...rows,
            { rowId: crypto.randomUUID(), label: "", publisherLabel: "", url: "" },
          ])
        }
      />
    </>
  );
}
