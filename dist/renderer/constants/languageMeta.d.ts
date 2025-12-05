export type LanguageMeta = {
    code: string;
    nativeName: string;
    englishName: string;
    accent: string;
    gradient: [string, string];
    waveform: [string, string];
};
export declare function getLanguageMeta(code?: string): LanguageMeta;
