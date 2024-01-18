export interface Word {
  id: number;
  word: string;
  translation: string;
  streak: number;
  wrongAnswers: number;
  lastAnswered: Date;
}
