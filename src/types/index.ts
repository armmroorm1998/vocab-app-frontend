export enum EPartOfSpeech {
  NOUN = 'noun',
  VERB = 'verb',
  ADJECTIVE = 'adjective',
  ADVERB = 'adverb',
  PREPOSITION = 'preposition',
  CONJUNCTION = 'conjunction',
  PRONOUN = 'pronoun',
  PHRASE = 'phrase',
  OTHER = 'other',
}

export enum ECefrLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
}

export interface Category {
  id: number;
  name: string;
  nameTh: string | null;
}

export interface VocabularyExample {
  id: number;
  sentence: string;
  createdDate: string;
}

export interface Vocabulary {
  id: number;
  word: string;
  meaning: string;
  examples: VocabularyExample[];
  pronunciationThai: string | null;
  ipa: string | null;
  partOfSpeech: EPartOfSpeech;
  cefrLevel: ECefrLevel | null;
  category: Category | null;
  createdDate: string;
  updatedDate: string;
}

export interface ApiResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  total: number | null;
  body: T;
}

export interface VocabListResponse extends ApiResponse<Vocabulary[]> {
  page: number;
  limit: number;
}

export const POS_LABELS: Record<EPartOfSpeech, string> = {
  [EPartOfSpeech.NOUN]: 'Noun',
  [EPartOfSpeech.VERB]: 'Verb',
  [EPartOfSpeech.ADJECTIVE]: 'Adj.',
  [EPartOfSpeech.ADVERB]: 'Adv.',
  [EPartOfSpeech.PREPOSITION]: 'Prep.',
  [EPartOfSpeech.CONJUNCTION]: 'Conj.',
  [EPartOfSpeech.PRONOUN]: 'Pron.',
  [EPartOfSpeech.PHRASE]: 'Phrase',
  [EPartOfSpeech.OTHER]: 'Other',
};

export const POS_COLORS: Record<EPartOfSpeech, string> = {
  [EPartOfSpeech.NOUN]: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  [EPartOfSpeech.VERB]: 'bg-green-500/20 text-green-300 border-green-500/30',
  [EPartOfSpeech.ADJECTIVE]: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  [EPartOfSpeech.ADVERB]: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  [EPartOfSpeech.PREPOSITION]: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  [EPartOfSpeech.CONJUNCTION]: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  [EPartOfSpeech.PRONOUN]: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  [EPartOfSpeech.PHRASE]: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  [EPartOfSpeech.OTHER]: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};
