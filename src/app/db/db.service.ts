import { Injectable } from "@angular/core";
import Dexie from "dexie";
import { AppSetting } from "../models/app-setting";
import { Word } from "../models/word";
import {
  ACTIVE_LANGUAGE_PAIR_SETTING_KEY,
  createLanguagePair,
  DECLARED_LANGUAGE_PAIRS_SETTING_KEY,
  DeclaredLanguagePair,
  getDefaultLanguagePair,
  LEGACY_TARGET_LANGUAGE_SETTING_KEY,
  normalizeLanguageTag
} from "../settings/target-language";
import { normalizeTags } from "../tags/tag-utils";

type StoredWord = Partial<Word> & { language?: string };
const SAVED_TAGS_SETTING_KEY = 'savedTags';

@Injectable()
export class DbService extends Dexie {
  words!: Dexie.Table<Word, number>;
  settings!: Dexie.Table<AppSetting, string>;

  constructor() {
    super('word-db');

    this.version(5).stores({
      words: '++id,word,translation,streak,wrongAnswers,lastAnswered,created,reverseStreak'
    });

    this.version(6)
      .stores({
        words: '++id,language,word,translation,streak,wrongAnswers,lastAnswered,created,reverseStreak',
        settings: '&key'
      })
      .upgrade(async (transaction) => {
        await transaction.table('words').toCollection().modify((word: StoredWord) => {
          word.language = word.language ?? getDefaultLanguagePair().targetLanguage;
        });

        const targetLanguageSetting = await transaction
          .table('settings')
          .get(LEGACY_TARGET_LANGUAGE_SETTING_KEY);

        if (!targetLanguageSetting) {
          await transaction.table('settings').put({
            key: LEGACY_TARGET_LANGUAGE_SETTING_KEY,
            value: getDefaultLanguagePair().targetLanguage
          });
        }
      });

    this.version(7)
      .stores({
        words: '++id,sourceLanguage,targetLanguage,[sourceLanguage+targetLanguage],word,translation,notes,streak,wrongAnswers,lastAnswered,created,reverseStreak',
        settings: '&key'
      })
      .upgrade(async (transaction) => {
        const settingsTable = transaction.table('settings');
        const legacyTargetLanguageSetting = await settingsTable.get(LEGACY_TARGET_LANGUAGE_SETTING_KEY);
        const defaultPair = getDefaultLanguagePair(legacyTargetLanguageSetting?.value);

        await transaction.table('words').toCollection().modify((word: StoredWord) => {
          const targetLanguage = normalizeLanguageTag(word.targetLanguage ?? word.language)
            ?? defaultPair.targetLanguage;
          const sourceLanguage = normalizeLanguageTag(word.sourceLanguage)
            ?? getDefaultLanguagePair(targetLanguage).sourceLanguage;

          word.sourceLanguage = sourceLanguage === targetLanguage
            ? getDefaultLanguagePair(targetLanguage).sourceLanguage
            : sourceLanguage;
          word.targetLanguage = targetLanguage;
          word.notes = typeof word.notes === 'string' ? word.notes : '';
          delete word.language;
        });

        const declaredPairsSetting = await settingsTable.get(DECLARED_LANGUAGE_PAIRS_SETTING_KEY);
        const activePairSetting = await settingsTable.get(ACTIVE_LANGUAGE_PAIR_SETTING_KEY);
        const declaredPairs = this.parseLanguagePairs(declaredPairsSetting?.value);
        const normalizedPairs = declaredPairs.length > 0 ? declaredPairs : [defaultPair];
        const activePairKey = activePairSetting?.value;

        await settingsTable.put({
          key: DECLARED_LANGUAGE_PAIRS_SETTING_KEY,
          value: JSON.stringify(normalizedPairs)
        });

        await settingsTable.put({
          key: ACTIVE_LANGUAGE_PAIR_SETTING_KEY,
          value: normalizedPairs.some((pair) => pair.key === activePairKey)
            ? activePairKey
            : normalizedPairs[0].key
        });
      });

    this.version(8)
      .stores({
        words: '++id,sourceLanguage,targetLanguage,[sourceLanguage+targetLanguage],word,translation,notes,*tags,streak,wrongAnswers,lastAnswered,created,reverseStreak',
        settings: '&key'
      })
      .upgrade(async (transaction) => {
        const settingsTable = transaction.table('settings');
        const collectedTags = new Set<string>();

        await transaction.table('words').toCollection().modify((word: StoredWord) => {
          const nextTags = normalizeTags(Array.isArray(word.tags) ? word.tags : []);
          word.tags = nextTags;
          nextTags.forEach((tag) => collectedTags.add(tag));
        });

        const currentSavedTagsSetting = await settingsTable.get(SAVED_TAGS_SETTING_KEY);
        const savedTags = normalizeTags([
          ...this.parseSavedTags(currentSavedTagsSetting?.value),
          ...Array.from(collectedTags)
        ]);

        await settingsTable.put({
          key: SAVED_TAGS_SETTING_KEY,
          value: JSON.stringify(savedTags)
        });
      });

    this.version(9)
      .stores({
        words: '++id,sourceLanguage,targetLanguage,[sourceLanguage+targetLanguage],word,translation,notes,*tags,streak,wrongAnswers,lastAnswered,created,reverseStreak,correctAnswers,mergeMatches',
        settings: '&key'
      })
      .upgrade(async (transaction) => {
        await transaction.table('words').toCollection().modify((word: StoredWord) => {
          word.correctAnswers = typeof word.correctAnswers === 'number'
            ? word.correctAnswers
            : Math.max(0, Number(word.streak ?? 0) + Number(word.reverseStreak ?? 0));
          word.mergeMatches = typeof word.mergeMatches === 'number' ? word.mergeMatches : 0;
        });
      });
  }

  async getWordsForPair(pair: DeclaredLanguagePair): Promise<Word[]> {
    return this.words
      .where('[sourceLanguage+targetLanguage]')
      .equals([pair.sourceLanguage, pair.targetLanguage])
      .toArray();
  }

  async resetWordsForPair(pair: DeclaredLanguagePair): Promise<void> {
    const words = await this.getWordsForPair(pair);
    await this.words.bulkPut(
      words.map((word) => ({
        ...word,
        streak: 0,
        reverseStreak: 0,
        wrongAnswers: 0,
        correctAnswers: 0,
        mergeMatches: 0,
        lastAnswered: new Date()
      }))
    );
  }

  async deleteWordsForPair(pair: DeclaredLanguagePair): Promise<void> {
    await this.words
      .where('[sourceLanguage+targetLanguage]')
      .equals([pair.sourceLanguage, pair.targetLanguage])
      .delete();
  }

  async getSavedTags(): Promise<string[]> {
    const currentSetting = await this.settings.get(SAVED_TAGS_SETTING_KEY);
    return this.parseSavedTags(currentSetting?.value);
  }

  async mergeSavedTags(tags: string[]): Promise<string[]> {
    const nextTags = normalizeTags([
      ...(await this.getSavedTags()),
      ...tags
    ]);

    await this.settings.put({
      key: SAVED_TAGS_SETTING_KEY,
      value: JSON.stringify(nextTags)
    });

    return nextTags;
  }

  async getDeclaredLanguagePairs(): Promise<DeclaredLanguagePair[]> {
    const currentSetting = await this.settings.get(DECLARED_LANGUAGE_PAIRS_SETTING_KEY);
    const declaredPairs = this.parseLanguagePairs(currentSetting?.value);

    if (declaredPairs.length > 0) {
      return declaredPairs;
    }

    const defaultPairs = [getDefaultLanguagePair()];
    await this.setDeclaredLanguagePairs(defaultPairs);
    return defaultPairs;
  }

  async setDeclaredLanguagePairs(pairs: DeclaredLanguagePair[]): Promise<DeclaredLanguagePair[]> {
    const normalizedPairs = this.normalizeLanguagePairs(pairs);
    await this.settings.put({
      key: DECLARED_LANGUAGE_PAIRS_SETTING_KEY,
      value: JSON.stringify(normalizedPairs)
    });

    return normalizedPairs;
  }

  async getActiveLanguagePairKey(): Promise<string> {
    const declaredPairs = await this.getDeclaredLanguagePairs();
    const currentSetting = await this.settings.get(ACTIVE_LANGUAGE_PAIR_SETTING_KEY);

    if (currentSetting && declaredPairs.some((pair) => pair.key === currentSetting.value)) {
      return currentSetting.value;
    }

    await this.setActiveLanguagePairKey(declaredPairs[0].key);
    return declaredPairs[0].key;
  }

  async setActiveLanguagePairKey(languagePairKey: string): Promise<void> {
    await this.settings.put({
      key: ACTIVE_LANGUAGE_PAIR_SETTING_KEY,
      value: languagePairKey
    });
  }

  private parseLanguagePairs(value?: string): DeclaredLanguagePair[] {
    if (!value) {
      return [];
    }

    try {
      const parsedValue = JSON.parse(value);
      if (!Array.isArray(parsedValue)) {
        return [];
      }

      return this.normalizeLanguagePairs(
        parsedValue.flatMap((pair) => {
          if (!pair || typeof pair !== 'object') {
            return [];
          }

          const sourceLanguage = normalizeLanguageTag(
            (pair as { sourceLanguage?: string }).sourceLanguage
          );
          const targetLanguage = normalizeLanguageTag(
            (pair as { targetLanguage?: string }).targetLanguage
          );

          if (!sourceLanguage || !targetLanguage || sourceLanguage === targetLanguage) {
            return [];
          }

          return [createLanguagePair(sourceLanguage, targetLanguage)];
        })
      );
    } catch {
      return [];
    }
  }

  private parseSavedTags(value?: string): string[] {
    if (!value) {
      return [];
    }

    try {
      const parsedValue = JSON.parse(value);
      return Array.isArray(parsedValue)
        ? normalizeTags(parsedValue.filter((tag): tag is string => typeof tag === 'string'))
        : [];
    } catch {
      return [];
    }
  }

  private normalizeLanguagePairs(pairs: DeclaredLanguagePair[]): DeclaredLanguagePair[] {
    const normalizedPairs = pairs.flatMap((pair) => {
      const sourceLanguage = normalizeLanguageTag(pair.sourceLanguage);
      const targetLanguage = normalizeLanguageTag(pair.targetLanguage);

      if (!sourceLanguage || !targetLanguage || sourceLanguage === targetLanguage) {
        return [];
      }

      return [createLanguagePair(sourceLanguage, targetLanguage)];
    });

    const uniquePairs = normalizedPairs.filter((pair, index, currentPairs) =>
      currentPairs.findIndex((currentPair) => currentPair.key === pair.key) === index
    );

    return uniquePairs.length > 0 ? uniquePairs : [getDefaultLanguagePair()];
  }
}
