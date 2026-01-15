
export interface FileToTranslate {
  path: string;
  content: string;
  type: 'json' | 'lang' | 'js' | 'mcfunction' | 'txt';
  translatedContent?: string;
  status: 'pending' | 'translating' | 'completed' | 'error';
  selected: boolean;
}

export interface TranslationProgress {
  total: number;
  current: number;
  currentFileName: string;
}

export enum SupportLanguage {
  AUTO = 'Auto Detect',
  VIETNAMESE = 'Vietnamese',
  ENGLISH = 'English',
  SPANISH = 'Spanish',
  FRENCH = 'French',
  GERMAN = 'German',
  CHINESE = 'Chinese',
  JAPANESE = 'Japanese',
  KOREAN = 'Korean',
  RUSSIAN = 'Russian',
  PORTUGUESE = 'Portuguese'
}

export const LANGUAGE_CODES: Record<string, string> = {
  [SupportLanguage.VIETNAMESE]: 'vi_VN',
  [SupportLanguage.ENGLISH]: 'en_US',
  [SupportLanguage.SPANISH]: 'es_ES',
  [SupportLanguage.FRENCH]: 'fr_FR',
  [SupportLanguage.GERMAN]: 'de_DE',
  [SupportLanguage.CHINESE]: 'zh_CN',
  [SupportLanguage.JAPANESE]: 'ja_JP',
  [SupportLanguage.KOREAN]: 'ko_KR',
  [SupportLanguage.RUSSIAN]: 'ru_RU',
  [SupportLanguage.PORTUGUESE]: 'pt_BR'
};
