"use client";

import { Field, TextInput, TextArea, PillGroup } from "./common";

const VOICE_OPTIONS = [
  { value: "friendly",     label: "Friendly" },
  { value: "authoritative",label: "Authoritative" },
  { value: "witty",         label: "Witty" },
  { value: "plainspoken",  label: "Plainspoken" },
  { value: "luxurious",     label: "Luxurious" },
  { value: "caring",         label: "Caring" },
  { value: "bold",           label: "Bold" },
];

const INCLUDES = [
  { value: "colours",     label: "Colour system" },
  { value: "typography",  label: "Typography rules" },
  { value: "logo",        label: "Logo usage rules" },
  { value: "tone",        label: "Tone of voice guide" },
  { value: "photography", label: "Photography style" },
  { value: "social",      label: "Social media templates" },
  { value: "email",       label: "Email signature" },
];

export function BrandBrief({ brief, set }) {
  return (
    <>
      <Field label="Business name" required>
        <TextInput
          value={brief.businessName}
          onChange={(v) => set({ businessName: v })}
          placeholder="e.g. Coastal Realty"
        />
      </Field>

      <Field label="Who is this for?" hint="Target audience in one or two sentences.">
        <TextArea
          value={brief.audience}
          onChange={(v) => set({ audience: v })}
          rows={2}
          placeholder="First-home buyers in their late 20s-30s, typically browsing on mobile on a Sunday afternoon."
        />
      </Field>

      <Field label="Brand personality" hint="Pick 2–3 that describe how the brand sounds.">
        <PillGroup
          value={brief.voice ?? []}
          onChange={(v) => set({ voice: v })}
          options={VOICE_OPTIONS}
        />
      </Field>

      <Field label="What should the guide include?" required>
        <PillGroup
          value={brief.includes ?? ["colours", "typography", "logo", "tone"]}
          onChange={(v) => set({ includes: v })}
          options={INCLUDES}
        />
      </Field>

      <Field label="Existing assets we should build from" hint="Existing logo, wordmark, colours, photography — URLs or notes.">
        <TextArea
          value={brief.existingAssets}
          onChange={(v) => set({ existingAssets: v })}
          rows={3}
          placeholder="Existing logo on Dropbox: dropbox.com/…&#10;Primary colour: #0B1F3A"
        />
      </Field>

      <Field label="Brands you admire">
        <TextInput
          value={brief.admired}
          onChange={(v) => set({ admired: v })}
          placeholder="Mailchimp, Notion, Aesop"
        />
      </Field>

      <Field label="Anything off-limits?">
        <TextInput
          value={brief.avoid}
          onChange={(v) => set({ avoid: v })}
          placeholder="No serif fonts, no neon colours, don't sound corporate"
        />
      </Field>
    </>
  );
}
