import slugify from "slugify";

export function generateDatasetSlug(name: string): string {
  return slugify(name.trim(), {
    lower: true,
    strict: true,
    trim: true,
  });
}
