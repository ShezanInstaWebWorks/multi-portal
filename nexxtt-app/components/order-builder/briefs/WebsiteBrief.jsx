"use client";

import { Field, TextInput, TextArea, PillGroup, NumberField } from "./common";

const STYLE_OPTIONS = [
  { value: "minimal",    label: "Minimal / clean",     icon: "◻️" },
  { value: "bold",       label: "Bold & colourful",    icon: "🎨" },
  { value: "editorial",  label: "Editorial / magazine", icon: "📰" },
  { value: "playful",    label: "Playful / friendly",  icon: "🎈" },
  { value: "luxury",     label: "Luxury / premium",    icon: "💎" },
  { value: "corporate",  label: "Corporate / trusted", icon: "🏛️" },
];

const GOAL_OPTIONS = [
  "Generate leads",
  "Drive online sales",
  "Showcase portfolio",
  "Build credibility",
  "Inform / educate",
  "Book appointments",
];

export function WebsiteBrief({ brief, set }) {
  return (
    <>
      <Field label="Business name" required>
        <TextInput value={brief.businessName} onChange={(v) => set({ businessName: v })} placeholder="e.g. Coastal Realty" />
      </Field>

      <Field label="Tagline / what you do in one line">
        <TextInput
          value={brief.tagline}
          onChange={(v) => set({ tagline: v })}
          placeholder="e.g. Beachfront property sales across the Central Coast"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Pages needed">
          <NumberField
            value={brief.pageCount}
            onChange={(v) => set({ pageCount: v })}
            min={1}
            max={30}
            placeholder="5"
          />
        </Field>
        <Field label="Primary goal">
          <PillGroup
            value={brief.primaryGoal}
            onChange={(v) => set({ primaryGoal: v })}
            options={GOAL_OPTIONS}
            multi={false}
          />
        </Field>
      </div>

      <Field label="Visual style" hint="Pick one or two directions — we'll lean into them.">
        <PillGroup
          value={brief.styles ?? []}
          onChange={(v) => set({ styles: v })}
          options={STYLE_OPTIONS}
        />
      </Field>

      <Field label="Key page sections" hint="What blocks should be on the homepage? Hero, services, testimonials, etc.">
        <TextArea
          value={brief.keySections}
          onChange={(v) => set({ keySections: v })}
          rows={3}
          placeholder="Hero with video / Services / Team / Case studies / Testimonials / Contact"
        />
      </Field>

      <Field label="Reference sites" hint="URLs you like the feel of (one per line).">
        <TextArea
          value={brief.referenceUrls}
          onChange={(v) => set({ referenceUrls: v })}
          rows={2}
          placeholder="https://stripe.com&#10;https://linear.app"
        />
      </Field>

      <Field label="Anything else we should know?">
        <TextArea
          value={brief.notes}
          onChange={(v) => set({ notes: v })}
          rows={2}
          placeholder="Existing branding assets, tight deadline, audience notes…"
        />
      </Field>
    </>
  );
}
