// Slugify per MD §35.3 — lowercase alphanumeric + hyphens, no leading/trailing.
export function slugify(str) {
  return (str ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Validator for user-entered slug input (MD §35.2: /^[a-z0-9-]+$/).
export function isValidSlug(s) {
  return /^[a-z0-9-]+$/.test(s) && s.length >= 2 && s.length <= 64;
}
