export interface ImageEngine {
    generate(prompt: string): string[];
}
export declare class MockImageEngine implements ImageEngine {
    generate(prompt: string): string[];
}
