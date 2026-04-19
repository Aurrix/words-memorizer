export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizeTags(tags: string[]): string[] {
  return tags
    .map((tag) => normalizeTag(tag))
    .filter((tag, index, currentTags) => tag !== '' && currentTags.indexOf(tag) === index)
    .sort((leftTag, rightTag) => leftTag.localeCompare(rightTag));
}
