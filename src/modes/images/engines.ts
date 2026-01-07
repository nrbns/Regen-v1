export interface ImageEngine {
  generate(prompt: string): string[];
}

export class MockImageEngine implements ImageEngine {
  generate(prompt: string) {
    const seed = encodeURIComponent(prompt || 'omni');
    return [
      `https://picsum.photos/seed/${seed}-1/512/384`,
      `https://picsum.photos/seed/${seed}-2/512/384`,
      `https://picsum.photos/seed/${seed}-3/512/384`,
    ];
  }
}


