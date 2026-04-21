// Maps a service slug to its bespoke brief-form component.
// Unknown slugs fall back to the generic three-field form below.

import { WebsiteBrief } from "./WebsiteBrief";
import { LogoBrief } from "./LogoBrief";
import { BrandBrief } from "./BrandBrief";
import { SocialBrief } from "./SocialBrief";
import { ContentBrief } from "./ContentBrief";
import { GenericBrief } from "./GenericBrief";

export const BRIEF_COMPONENTS = {
  "website-design":    WebsiteBrief,
  "logo-design":       LogoBrief,
  "brand-guidelines":  BrandBrief,
  "social-media-pack": SocialBrief,
  "content-writing":   ContentBrief,
};

export function briefFor(slug) {
  return BRIEF_COMPONENTS[slug] ?? GenericBrief;
}
