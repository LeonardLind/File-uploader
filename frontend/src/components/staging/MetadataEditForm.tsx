// src/components/staging/MetadataEditForm.tsx

type EditProps = {
  species: string;
  plot: string;
  experience: string;
  sensor: string;
  deployment: string;

  onSave: () => void;
  onChange: (field: string, value: string) => void;
  saving: boolean;
};

/**
 * Simplified metadata edit form used when editing an existing entry.
 * This removes upload logic and focuses only on editing text fields.
 */
export function MetadataEditForm({
  species,
  plot,
  experience,
  sensor,
  deployment,
  onChange,
  onSave,
  saving,
}: EditProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Edit Metadata</h3>

      <input
        value={species}
        onChange={(e) => onChange("species", e.target.value)}
        placeholder="Species"
        className="w-full bg-neutral-900 border border-slate-700 rounded-lg p-2"
      />

      <input
        value={plot}
        onChange={(e) => onChange("plot", e.target.value)}
        placeholder="Plot"
        className="w-full bg-neutral-900 border border-slate-700 rounded-lg p-2"
      />

      <input
        value={experience}
        onChange={(e) => onChange("experience", e.target.value)}
        placeholder="Experience Point"
        className="w-full bg-neutral-900 border border-slate-700 rounded-lg p-2"
      />

      <input
        value={sensor}
        onChange={(e) => onChange("sensor", e.target.value)}
        placeholder="Sensor ID"
        className="w-full bg-neutral-900 border border-slate-700 rounded-lg p-2"
      />

      <input
        value={deployment}
        onChange={(e) => onChange("deployment", e.target.value)}
        placeholder="Deployment ID"
        className="w-full bg-neutral-900 border border-slate-700 rounded-lg p-2"
      />

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full bg-lime-400 text-black py-2 rounded-md font-semibold"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
