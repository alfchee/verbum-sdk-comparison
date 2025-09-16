import { createStore } from 'easy-peasy';
import { StoreModel } from './types';
import { deepgramModel } from './deepgramModel';
import { verbumModel } from './verbumModel';

export const store = createStore<StoreModel>({
  deepgram: deepgramModel,
  verbum: verbumModel,
});

export type Store = typeof store;