// Shared primitives for per-service brief forms.
// Each per-service component consumes these so the forms look and feel consistent.

export function Field({ label, required, hint, children }) {
  return (
    <label className="block mb-3.5 last:mb-0">
      <span className="block text-[0.75rem] font-bold text-body mb-1.5">
        {label}
        {required && <span className="text-red ml-1">*</span>}
      </span>
      {children}
      {hint && <div className="text-[0.72rem] text-muted mt-1">{hint}</div>}
    </label>
  );
}

export function TextInput({ value, onChange, ...rest }) {
  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="input"
      {...rest}
    />
  );
}

export function TextArea({ value, onChange, rows = 3, ...rest }) {
  return (
    <textarea
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="input resize-y"
      style={{ minHeight: `${rows * 20 + 24}px` }}
      {...rest}
    />
  );
}

export function Select({ value, onChange, options, ...rest }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="input"
      {...rest}
    >
      {options.map((o) => (
        <option key={o.value ?? o} value={o.value ?? o}>
          {o.label ?? o}
        </option>
      ))}
    </select>
  );
}

/**
 * Pill selector — user picks one or more from a list of chips.
 */
export function PillGroup({ value = [], onChange, options, multi = true, hint }) {
  function toggle(v) {
    if (multi) {
      const set = new Set(value);
      if (set.has(v)) set.delete(v);
      else set.add(v);
      onChange(Array.from(set));
    } else {
      onChange(value === v ? null : v);
    }
  }

  const isSelected = (v) => (multi ? (value ?? []).includes(v) : value === v);

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const v = o.value ?? o;
        const label = o.label ?? o;
        const selected = isSelected(v);
        return (
          <button
            key={v}
            type="button"
            onClick={() => toggle(v)}
            className="px-3.5 py-1.5 rounded-full text-[0.78rem] font-semibold transition-all"
            style={
              selected
                ? {
                    background: "var(--color-teal-pale)",
                    border: "1.5px solid var(--color-teal)",
                    color: "var(--color-teal)",
                    boxShadow: "0 2px 8px rgba(0,184,169,0.15)",
                  }
                : {
                    background: "white",
                    border: "1.5px solid var(--color-border)",
                    color: "var(--color-muted)",
                  }
            }
          >
            {o.icon && <span className="mr-1.5">{o.icon}</span>}
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function NumberField({ value, onChange, min = 0, max, ...rest }) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => {
        const n = e.target.value === "" ? null : Number(e.target.value);
        if (n != null && !Number.isNaN(n)) onChange(n);
        else if (e.target.value === "") onChange(null);
      }}
      min={min}
      max={max}
      className="input w-32"
      {...rest}
    />
  );
}
