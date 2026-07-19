import CategoryCombobox from "@/components/home/research-and-development/wizard/category-combobox";
import {
  INPUT_CLASS,
  LABEL_CLASS,
  type IdeaBasicsStepProps,
} from "@/components/home/research-and-development/wizard/wizard-shared";

// Step 1: name, pitch, category — the minimum needed to post (the submit gate
// checks name + pitch only, same rule as the original sheet).
export default function IdeaBasicsStep({
  draft,
  onDraftChange,
  categoryOptions,
  onCategoryCommit,
}: IdeaBasicsStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Idea name</span>
        <input
          type="text"
          value={draft.ideaName}
          onChange={(changeEvent) => onDraftChange({ ideaName: changeEvent.target.value })}
          placeholder="e.g. Solar-powered cold storage"
          className={INPUT_CLASS}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>One-line pitch</span>
        <input
          type="text"
          value={draft.oneLinePitch}
          onChange={(changeEvent) => onDraftChange({ oneLinePitch: changeEvent.target.value })}
          placeholder="What it does, in one sentence"
          className={INPUT_CLASS}
        />
      </label>
      <CategoryCombobox
        selectedCategory={draft.category}
        categoryOptions={categoryOptions}
        onCategoryCommit={onCategoryCommit}
      />
    </div>
  );
}
