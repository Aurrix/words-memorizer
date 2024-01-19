export interface Word {
  id: number;
  word: string;
  translation: string;
  streak: number;
  reverseStreak: number;
  wrongAnswers: number;
  lastAnswered: Date;
}
