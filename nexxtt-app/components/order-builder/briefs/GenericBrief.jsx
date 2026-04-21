"use client";

import { Field, TextInput, TextArea } from "./common";

export function GenericBrief({ brief, set }) {
  return (
    <>
      <Field label="Business name" required>
        <TextInput value={brief.businessName} onChange={(v) => set({ businessName: v })} placeholder="e.g. Coastal Realty" />
      </Field>
      <Field label="Goals & context">
        <TextArea
          value={brief.goals}
          onChange={(v) => set({ goals: v })}
          rows={4}
          placeholder="What does success look like? Any constraints, brand references, audience?"
        />
      </Field>
      <Field label="Reference URLs (one per line)">
        <TextArea
          value={brief.referenceUrls}
          onChange={(v) => set({ referenceUrls: v })}
          rows={2}
          placeholder="https://example.com&#10;https://inspo.site"
        />
      </Field>
    </>
  );
}
