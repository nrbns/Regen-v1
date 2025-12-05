export class MockImageEngine {
    generate(prompt) {
        const seed = encodeURIComponent(prompt || 'omni');
        return [
            `https://picsum.photos/seed/${seed}-1/512/384`,
            `https://picsum.photos/seed/${seed}-2/512/384`,
            `https://picsum.photos/seed/${seed}-3/512/384`,
        ];
    }
}
