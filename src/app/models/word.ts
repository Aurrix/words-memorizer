export interface Word {
  id: number;
  sourceLanguage: string;
  targetLanguage: string;
  word: string;
  translation: string;
  notes: string;
  tags: string[];
  streak: number;
  reverseStreak: number;
  wrongAnswers: number;
  correctAnswers: number;
  mergeMatches: number;
  lastAnswered: Date;
  created: Date;
}
