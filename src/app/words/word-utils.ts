import { Word } from "../models/word";
import { normalizeTags } from "../tags/tag-utils";

export type WordSortMode = 'date' | 'score-by-date' | 'score';
export type WordScoreFilterMode = 'default' | 'wrong' | 'all';
export type WordMergeMatchField = 'word' | 'translation';

export interface WordMergeDraft {
  sourceLanguage: string;
  targetLanguage: string;
  word: string;
  translation: string;
  notes: string;
  tags: string[];
}

export interface WordMergeMatch {
  word: Word;
  matchedFields: WordMergeMatchField[];
}

export interface WordMergePreview {
  matches: WordMergeMatch[];
  mergedWord: Omit<Word, 'id'>;
}

export interface WordHeatPalette {
  surface: string;
  border: string;
  badgeBackground: string;
  badgeText: string;
}

export const WORD_MERGE_SCORE_WEIGHT = 3;

export const WORD_SORT_OPTIONS: Array<{ value: WordSortMode; label: string }> = [
  { value: 'date', label: 'Date' },
  { value: 'score-by-date', label: 'Score+date' },
  { value: 'score', label: 'Score' }
];

export const WORD_SCORE_FILTER_OPTIONS: Array<{ value: WordScoreFilterMode; label: string }> = [
  { value: 'default', label: 'Default' },
  { value: 'wrong', label: 'Wrong' },
  { value: 'all', label: 'All' }
];

const WORD_HEAT_PALETTE: WordHeatPalette[] = [
  { surface: '#e8f7ee', border: '#16a34a', badgeBackground: '#16a34a', badgeText: '#f0fdf4' },
  { surface: '#effaf3', border: '#22c55e', badgeBackground: '#dcfce7', badgeText: '#166534' },
  { surface: '#f5fcf7', border: '#4ade80', badgeBackground: '#dcfce7', badgeText: '#166534' },
  { surface: '#fbfefc', border: '#86efac', badgeBackground: '#ecfdf5', badgeText: '#166534' },
  { surface: '#ffffff', border: '#bbf7d0', badgeBackground: '#f0fdf4', badgeText: '#15803d' },
  { surface: '#fffdfa', border: '#fed7aa', badgeBackground: '#ffedd5', badgeText: '#9a3412' },
  { surface: '#fff8f6', border: '#fdba74', badgeBackground: '#fed7aa', badgeText: '#9a3412' },
  { surface: '#fff1ef', border: '#fca5a5', badgeBackground: '#fee2e2', badgeText: '#b91c1c' },
  { surface: '#ffe7e2', border: '#f87171', badgeBackground: '#fca5a5', badgeText: '#991b1b' },
  { surface: '#ffdad4', border: '#dc2626', badgeBackground: '#ef4444', badgeText: '#7f1d1d' }
];

const WORD_HEAT_LABELS = ['G5', 'G4', 'G3', 'G2', 'G1', 'R1', 'R2', 'R3', 'R4', 'R5'] as const;

export function normalizeWordMatchValue(value: string): string {
  return value.trim().replace(/\s+/g, '').toLocaleLowerCase();
}

export function getWordCorrectAnswers(
  word: Pick<Word, 'correctAnswers' | 'streak' | 'reverseStreak'>
): number {
  return typeof word.correctAnswers === 'number'
    ? word.correctAnswers
    : Math.max(0, (word.streak ?? 0) + (word.reverseStreak ?? 0));
}

export function getWordMergeMatches(word: Pick<Word, 'mergeMatches'>): number {
  return typeof word.mergeMatches === 'number' ? word.mergeMatches : 0;
}

export function getWordScore(
  word: Pick<Word, 'wrongAnswers' | 'correctAnswers' | 'mergeMatches' | 'streak' | 'reverseStreak'>
): number {
  return word.wrongAnswers - getWordCorrectAnswers(word) +
    (getWordMergeMatches(word) * WORD_MERGE_SCORE_WEIGHT);
}

export function formatWordScore(score: number): string {
  return score > 0 ? `+${score}` : `${score}`;
}

export function getWordScoreLevel(
  word: Pick<Word, 'wrongAnswers' | 'correctAnswers' | 'mergeMatches' | 'streak' | 'reverseStreak'>
): number {
  return clamp(getWordScore(word) + 4, 0, WORD_HEAT_PALETTE.length - 1);
}

export function getWordLevelLabel(level: number): string {
  return WORD_HEAT_LABELS[clamp(level, 0, WORD_HEAT_PALETTE.length - 1)];
}

export function getWordHeatPalette(level: number): WordHeatPalette {
  return WORD_HEAT_PALETTE[clamp(level, 0, WORD_HEAT_PALETTE.length - 1)];
}

export function matchesWordScoreFilter(
  word: Pick<Word, 'wrongAnswers' | 'correctAnswers' | 'mergeMatches' | 'streak' | 'reverseStreak'>,
  filter: WordScoreFilterMode
): boolean {
  const score = getWordScore(word);

  switch (filter) {
    case 'default':
      return score >= 0;
    case 'wrong':
      return score >= 1;
    case 'all':
    default:
      return true;
  }
}

export function compareWordsByDate(leftWord: Word, rightWord: Word): number {
  return rightWord.lastAnswered.getTime() - leftWord.lastAnswered.getTime() ||
    rightWord.created.getTime() - leftWord.created.getTime() ||
    leftWord.word.localeCompare(rightWord.word) ||
    leftWord.translation.localeCompare(rightWord.translation);
}

export function compareWordsByScore(leftWord: Word, rightWord: Word): number {
  return getWordScore(rightWord) - getWordScore(leftWord) ||
    compareWordsByDate(leftWord, rightWord);
}

export function findWordMergeMatches(
  words: Word[],
  draft: Pick<WordMergeDraft, 'word' | 'translation'>
): WordMergeMatch[] {
  const normalizedWord = normalizeWordMatchValue(draft.word);
  const normalizedTranslation = normalizeWordMatchValue(draft.translation);

  return words.flatMap((word) => {
    const matchedFields: WordMergeMatchField[] = [];

    if (normalizedWord && normalizeWordMatchValue(word.word) === normalizedWord) {
      matchedFields.push('word');
    }

    if (
      normalizedTranslation &&
      normalizeWordMatchValue(word.translation) === normalizedTranslation
    ) {
      matchedFields.push('translation');
    }

    return matchedFields.length > 0
      ? [{ word, matchedFields }]
      : [];
  });
}

export function createWordFromDraft(
  draft: WordMergeDraft,
  createdAt = new Date()
): Omit<Word, 'id'> {
  return {
    sourceLanguage: draft.sourceLanguage,
    targetLanguage: draft.targetLanguage,
    word: draft.word.trim(),
    translation: draft.translation.trim(),
    notes: draft.notes.trim(),
    tags: normalizeTags(draft.tags),
    streak: 0,
    reverseStreak: 0,
    wrongAnswers: 0,
    correctAnswers: 0,
    mergeMatches: 0,
    lastAnswered: new Date(createdAt),
    created: new Date(createdAt)
  };
}

export function buildWordMergePreview(
  matches: WordMergeMatch[],
  draft: WordMergeDraft,
  mergedAt = new Date()
): WordMergePreview {
  const sortedMatches = [...matches].sort((leftMatch, rightMatch) =>
    leftMatch.word.created.getTime() - rightMatch.word.created.getTime() ||
    leftMatch.word.id - rightMatch.word.id
  );
  const createdAt = sortedMatches.length > 0
    ? new Date(Math.min(...sortedMatches.map((match) => match.word.created.getTime())))
    : new Date(mergedAt);

  return {
    matches: sortedMatches,
    mergedWord: {
      sourceLanguage: draft.sourceLanguage,
      targetLanguage: draft.targetLanguage,
      word: mergeWordField([
        ...sortedMatches.map((match) => match.word.word),
        draft.word
      ]),
      translation: mergeWordField([
        ...sortedMatches.map((match) => match.word.translation),
        draft.translation
      ]),
      notes: mergeNotes([
        ...sortedMatches.map((match) => match.word.notes),
        draft.notes
      ]),
      tags: normalizeTags([
        ...sortedMatches.flatMap((match) => match.word.tags),
        ...draft.tags
      ]),
      streak: sortedMatches.reduce((maxStreak, match) => Math.max(maxStreak, match.word.streak), 0),
      reverseStreak: sortedMatches.reduce(
        (maxStreak, match) => Math.max(maxStreak, match.word.reverseStreak),
        0
      ),
      wrongAnswers: sortedMatches.reduce(
        (totalWrongAnswers, match) => totalWrongAnswers + match.word.wrongAnswers,
        0
      ),
      correctAnswers: sortedMatches.reduce(
        (totalCorrectAnswers, match) => totalCorrectAnswers + getWordCorrectAnswers(match.word),
        0
      ),
      mergeMatches: sortedMatches.reduce(
        (totalMergeMatches, match) => totalMergeMatches + getWordMergeMatches(match.word),
        0
      ) + sortedMatches.length,
      lastAnswered: new Date(mergedAt),
      created: createdAt
    }
  };
}

function mergeWordField(values: string[]): string {
  const dedupedValues = dedupeByNormalizedText(values);
  return dedupedValues.join(' / ');
}

function mergeNotes(values: string[]): string {
  const dedupedValues = dedupeByNormalizedSentence(values);
  return dedupedValues.join('\n\n');
}

function dedupeByNormalizedText(values: string[]): string[] {
  const groupedValues = new Map<string, string[]>();

  for (const value of values.map((currentValue) => currentValue.trim()).filter(Boolean)) {
    const normalizedValue = normalizeWordMatchValue(value);
    const variants = groupedValues.get(normalizedValue) ?? [];
    variants.push(value);
    groupedValues.set(normalizedValue, variants);
  }

  return Array.from(groupedValues.values()).map((variants) => pickPreferredTextVariant(variants));
}

function dedupeByNormalizedSentence(values: string[]): string[] {
  const groupedValues = new Map<string, string[]>();

  for (const value of values.map((currentValue) => currentValue.trim()).filter(Boolean)) {
    const normalizedValue = value.replace(/\s+/g, ' ').toLocaleLowerCase();
    const variants = groupedValues.get(normalizedValue) ?? [];
    variants.push(value);
    groupedValues.set(normalizedValue, variants);
  }

  return Array.from(groupedValues.values()).map((variants) => pickPreferredTextVariant(variants));
}

function pickPreferredTextVariant(variants: string[]): string {
  return [...variants].sort((leftValue, rightValue) =>
    rightValue.length - leftValue.length ||
    leftValue.localeCompare(rightValue)
  )[0];
}

function clamp(value: number, minValue: number, maxValue: number): number {
  return Math.min(Math.max(value, minValue), maxValue);
}
