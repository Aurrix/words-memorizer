import { computed, inject, Injectable, signal } from '@angular/core';
import { DbService } from '../db/db.service';
import {
  buildLanguagePairKey,
  createLanguagePair,
  DeclaredLanguagePair,
  getDefaultLanguagePair,
  getLanguageFlag,
  getLanguageLabel,
  getLanguagePairFlags,
  getLanguagePairLabel,
  normalizeLanguageTag,
  TARGET_LANGUAGE_OPTIONS
} from '../settings/target-language';

@Injectable({ providedIn: 'root' })
export class LanguageSettingsService {
  readonly availableLanguages = TARGET_LANGUAGE_OPTIONS;
  readonly declaredPairs = signal<DeclaredLanguagePair[]>([getDefaultLanguagePair()]);
  readonly activePairKey = signal(getDefaultLanguagePair().key);
  readonly isReady = signal(false);
  readonly wordDataVersion = signal(0);
  readonly activePair = computed(
    () =>
      this.declaredPairs().find((pair) => pair.key === this.activePairKey()) ??
      this.declaredPairs()[0] ??
      getDefaultLanguagePair()
  );
  readonly activePairLabel = computed(
    () => getLanguagePairLabel(this.activePair())
  );
  readonly activePairFlags = computed(
    () => getLanguagePairFlags(this.activePair())
  );
  readonly activeSourceLanguage = computed(
    () => this.activePair().sourceLanguage
  );
  readonly activeTargetLanguage = computed(
    () => this.activePair().targetLanguage
  );

  private readonly db = inject(DbService);

  constructor() {
    void this.load();
  }

  async setActivePair(pairKey: string): Promise<void> {
    const nextPair = this.declaredPairs().find((pair) => pair.key === pairKey);
    if (!nextPair) {
      return;
    }

    await this.db.setActiveLanguagePairKey(pairKey);
    this.activePairKey.set(pairKey);
    this.isReady.set(true);
  }

  async addLanguagePair(sourceLanguage: string, targetLanguage: string): Promise<boolean> {
    const normalizedSourceLanguage = normalizeLanguageTag(sourceLanguage);
    const normalizedTargetLanguage = normalizeLanguageTag(targetLanguage);

    if (
      !normalizedSourceLanguage ||
      !normalizedTargetLanguage ||
      normalizedSourceLanguage === normalizedTargetLanguage ||
      this.hasPair(normalizedSourceLanguage, normalizedTargetLanguage)
    ) {
      return false;
    }

    const nextPair = createLanguagePair(normalizedSourceLanguage, normalizedTargetLanguage);
    const nextPairs = await this.db.setDeclaredLanguagePairs([
      ...this.declaredPairs(),
      nextPair
    ]);

    await this.db.setActiveLanguagePairKey(nextPair.key);
    this.declaredPairs.set(nextPairs);
    this.activePairKey.set(nextPair.key);
    this.isReady.set(true);
    return true;
  }

  async removeLanguagePair(pairKey: string): Promise<boolean> {
    if (this.declaredPairs().length <= 1) {
      return false;
    }

    const nextPairs = this.declaredPairs().filter((pair) => pair.key !== pairKey);
    const normalizedPairs = await this.db.setDeclaredLanguagePairs(nextPairs);
    const nextActivePairKey = normalizedPairs.some((pair) => pair.key === this.activePairKey())
      ? this.activePairKey()
      : normalizedPairs[0].key;

    await this.db.setActiveLanguagePairKey(nextActivePairKey);
    this.declaredPairs.set(normalizedPairs);
    this.activePairKey.set(nextActivePairKey);
    this.isReady.set(true);
    return true;
  }

  hasPair(sourceLanguage: string, targetLanguage: string): boolean {
    const normalizedSourceLanguage = normalizeLanguageTag(sourceLanguage);
    const normalizedTargetLanguage = normalizeLanguageTag(targetLanguage);

    if (!normalizedSourceLanguage || !normalizedTargetLanguage) {
      return false;
    }

    const pairKey = buildLanguagePairKey(normalizedSourceLanguage, normalizedTargetLanguage);
    return this.declaredPairs().some((pair) => pair.key === pairKey);
  }

  getPairFlags(pair: DeclaredLanguagePair): string {
    return getLanguagePairFlags(pair);
  }

  getPairLabel(pair: DeclaredLanguagePair): string {
    return getLanguagePairLabel(pair);
  }

  getLanguageLabel(languageCode: string): string {
    return getLanguageLabel(languageCode);
  }

  getLanguageFlag(languageCode: string): string {
    return getLanguageFlag(languageCode);
  }

  notifyWordDataChanged(): void {
    this.wordDataVersion.update((value) => value + 1);
  }

  private async load(): Promise<void> {
    const declaredPairs = await this.db.getDeclaredLanguagePairs();
    const activePairKey = await this.db.getActiveLanguagePairKey();

    this.declaredPairs.set(declaredPairs);
    this.activePairKey.set(
      declaredPairs.some((pair) => pair.key === activePairKey)
        ? activePairKey
        : declaredPairs[0].key
    );
    this.isReady.set(true);
  }
}
