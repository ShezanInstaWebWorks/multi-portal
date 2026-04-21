"use client";

import { Field, TextInput, TextArea, PillGroup } from "./common";

const DIRECTIONS = [
  { value: "modern",      label: "Modern",       icon: "🌀" },
  { value: "classic",     label: "Classic",      icon: "🏛️" },
  { value: "minimal",     label: "Minimal",      icon: "◼" },
  { value: "bold",        label: "Bold",         icon: "🔥" },
  { value: "playful",     label: "Playful",      icon: "🎈" },
  { value: "handmade",    label: "Handmade",     icon: "✍️" },
  { value: "geometric",   label: "Geometric",    icon: "🔺" },
  { value: "script",      label: "Script",       icon: "✒️" },
];

const MARK_TYPES = [
  { value: "wordmark",    label: "Wordmark only" },
  { value: "combination", label: "Wordmark + icon" },
  { value: "monogram",    label: "Monogram / initials" },
  { value: "emblem",      label: "Emblem / badge" },
  { value: "any",         label: "Let the designer suggest" },
];

export function LogoBrief({ brief, set }) {
  return (
    <>
      <Field label="Business name" required hint="Exact spelling + capitalisation as it should appear on the logo.">
        <TextInput
          value={brief.businessName}
          onChange={(v) => set({ businessName: v })}
          placeholder="e.g. Coastal Realty"
        />
      </Field>

      <Field label="Elevator pitch — what do you do?">
        <TextArea
          value={brief.elevatorPitch}
          onChange={(v) => set({ elevatorPitch: v })}
          rows={2}
          placeholder="One or two sentences — industry, audience, vibe."
        />
      </Field>

      <Field label="Creative directions" hint="Pick 2–4 that feel right. We'll explore these in the concepts.">
        <PillGroup
          value={brief.directions ?? []}
          onChange={(v) => set({ directions: v })}
          options={DIRECTIONS}
        />
      </Field>

      <Field label="Preferred logo type">
        <PillGroup
          value={brief.markType}
          onChange={(v) => set({ markType: v })}
          options={MARK_TYPES}
          multi={false}
        />
      </Field>

      <Field label="Words / concepts to evoke" hint="5–10 words the mark should feel like.">
        <TextInput
          value={brief.moodWords}
          onChange={(v) => set({ moodWords: v })}
          placeholder="trustworthy, coastal, warm, modern"
        />
      </Field>

      <Field label="Colours — love + avoid">
        <TextArea
          value={brief.colourNotes}
          onChange={(v) => set({ colourNotes: v })}
          rows={2}
          placeholder="Loves: deep navy + warm cream. Avoid: pastel pink, neon green."
        />
      </Field>

      <Field label="Competitor logos you like (URLs or names)">
        <TextArea
          value={brief.referenceLogos}
          onChange={(v) => set({ referenceLogos: v })}
          rows={2}
          placeholder="https://linear.app&#10;Patagonia&#10;Aesop"
        />
      </Field>

      <Field label="Anything the logo MUST include">
        <TextInput
          value={brief.mustInclude}
          onChange={(v) => set({ mustInclude: v })}
          placeholder="e.g. 'Est. 2012', a sun motif, 'Architecture' subtext"
        />
      </Field>
    </>
  );
}
