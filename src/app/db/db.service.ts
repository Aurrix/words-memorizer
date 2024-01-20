import {Injectable} from "@angular/core";
import Dexie from "dexie";
import {Word} from "../models/word";

@Injectable()
export class DbService extends Dexie {
  words!: Dexie.Table<Word, number>;
  constructor() {
    super('word-db');
    this.version(4).stores({
      words: '++id,word,translation,streak,wrongAnswers,lastAnswered,reverseStreak'
    });
  }
}
