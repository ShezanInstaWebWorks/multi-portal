"use client";

import { Field, TextInput, TextArea, PillGroup, NumberField } from "./common";

const PLATFORMS = [
  { value: "instagram", label: "Instagram", icon: "📸" },
  { value: "facebook",  label: "Facebook",  icon: "📘" },
  { value: "linkedin",  label: "LinkedIn",  icon: "💼" },
  { value: "tiktok",    label: "TikTok",    icon: "🎵" },
  { value: "twitter",   label: "X / Twitter", icon: "🐦" },
  { value: "pinterest", label: "Pinterest", icon: "📌" },
];

const FORMATS = [
  { value: "still",      label: "Single image" },
  { value: "carousel",   label: "Carousel" },
  { value: "reel",       label: "Reel / short video" },
  { value: "story",      label: "Story" },
  { value: "quote",      label: "Text quote card" },
];

const PILLARS = [
  { value: "product",      label: "Product / service" },
  { value: "education",    label: "Education" },
  { value: "behind",       label: "Behind the scenes" },
  { value: "testimonials", label: "Customer stories" },
  { value: "team",         label: "Team / culture" },
  { value: "trend",        label: "Industry trends" },
];

export function SocialBrief({ brief, set }) {
  return (
    <>
      <Field label="Business name" required>
        <TextInput
          value={brief.businessName}
          onChange={(v) => set({ businessName: v })}
          placeholder="e.g. Coastal Realty"
        />
      </Field>

      <Field label="Platforms to cover" required>
        <PillGroup
          value={brief.platforms ?? ["instagram", "facebook"]}
          onChange={(v) => set({ platforms: v })}
          options={PLATFORMS}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Posts per week">
          <NumberField value={brief.postsPerWeek} onChange={(v) => set({ postsPerWeek: v })} min={1} max={21} placeholder="3" />
        </Field>
        <Field label="Posting starts">
          <TextInput
            value={brief.startDate}
            onChange={(v) => set({ startDate: v })}
            placeholder="ASAP / next Monday / Apr 21"
          />
        </Field>
      </div>

      <Field label="Content pillars" hint="Pick 2–4 themes. We'll split the calendar across them.">
        <PillGroup
          value={brief.pillars ?? []}
          onChange={(v) => set({ pillars: v })}
          options={PILLARS}
        />
      </Field>

      <Field label="Preferred formats">
        <PillGroup
          value={brief.formats ?? ["still", "carousel"]}
          onChange={(v) => set({ formats: v })}
          options={FORMATS}
        />
      </Field>

      <Field label="Tone of voice">
        <TextInput
          value={brief.tone}
          onChange={(v) => set({ tone: v })}
          placeholder="e.g. Warm, a little cheeky, never corporate"
        />
      </Field>

      <Field label="Hashtags / handles you always use">
        <TextInput
          value={brief.hashtags}
          onChange={(v) => set({ hashtags: v })}
          placeholder="#coastalrealty #centralcoastliving @thecoastalco"
        />
      </Field>

      <Field label="Off-limits topics">
        <TextInput
          value={brief.avoid}
          onChange={(v) => set({ avoid: v })}
          placeholder="Politics, competitor comparisons, auction prices"
        />
      </Field>

      <Field label="Anything else we should know?">
        <TextArea
          value={brief.notes}
          onChange={(v) => set({ notes: v })}
          rows={2}
          placeholder="Key launches, seasonal pushes, holiday hours, etc."
        />
      </Field>
    </>
  );
}
