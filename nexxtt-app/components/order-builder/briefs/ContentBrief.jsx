"use client";

import { Field, TextInput, TextArea, PillGroup, NumberField } from "./common";

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "conversational", label: "Conversational" },
  { value: "witty", label: "Witty" },
  { value: "journalistic", label: "Journalistic" },
  { value: "enthusiastic", label: "Enthusiastic" },
  { value: "empathetic", label: "Empathetic" },
];

const FORMATS = [
  { value: "blog",       label: "Blog articles" },
  { value: "seo",        label: "SEO long-form" },
  { value: "landing",    label: "Landing-page copy" },
  { value: "newsletter", label: "Newsletter" },
  { value: "scripts",    label: "Video scripts" },
  { value: "social",     label: "Social captions" },
];

export function ContentBrief({ brief, set }) {
  return (
    <>
      <Field label="Business name" required>
        <TextInput
          value={brief.businessName}
          onChange={(v) => set({ businessName: v })}
          placeholder="e.g. Coastal Realty"
        />
      </Field>

      <Field label="What should we write?" required>
        <PillGroup
          value={brief.formats ?? ["blog"]}
          onChange={(v) => set({ formats: v })}
          options={FORMATS}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Pieces in this order">
          <NumberField value={brief.pieceCount} onChange={(v) => set({ pieceCount: v })} min={1} max={30} placeholder="4" />
        </Field>
        <Field label="Target word count per piece">
          <NumberField value={brief.wordCount} onChange={(v) => set({ wordCount: v })} min={100} placeholder="1200" />
        </Field>
      </div>

      <Field label="Topic list" required hint="One per line. We'll push back if anything's thin.">
        <TextArea
          value={brief.topics}
          onChange={(v) => set({ topics: v })}
          rows={5}
          placeholder="First-home buyer FAQs&#10;What to ask at an open home&#10;Is now a good time to buy on the coast?&#10;Understanding strata fees"
        />
      </Field>

      <Field label="Target audience">
        <TextInput
          value={brief.audience}
          onChange={(v) => set({ audience: v })}
          placeholder="First-home buyers 25–35, Australia"
        />
      </Field>

      <Field label="Tone of voice">
        <PillGroup
          value={brief.tone}
          onChange={(v) => set({ tone: v })}
          options={TONES}
          multi={false}
        />
      </Field>

      <Field label="SEO keywords (if any)">
        <TextArea
          value={brief.keywords}
          onChange={(v) => set({ keywords: v })}
          rows={2}
          placeholder="central coast real estate&#10;first home buyer grants NSW"
        />
      </Field>

      <Field label="Internal links / CTAs to include">
        <TextArea
          value={brief.ctaNotes}
          onChange={(v) => set({ ctaNotes: v })}
          rows={2}
          placeholder="Every piece links to /buyers-guide&#10;Footer CTA: Book a 15-min consult"
        />
      </Field>

      <Field label="Competitor / reference articles you admire">
        <TextArea
          value={brief.referenceUrls}
          onChange={(v) => set({ referenceUrls: v })}
          rows={2}
          placeholder="https://realestate.com.au/news/…"
        />
      </Field>
    </>
  );
}
