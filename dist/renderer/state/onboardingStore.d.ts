interface OnboardingState {
    visible: boolean;
    start: () => void;
    finish: () => void;
    reset: () => void;
}
export declare const onboardingStorage: {
    isCompleted(): boolean;
    setCompleted(): void;
    clear(): void;
};
export declare const useOnboardingStore: import("zustand").UseBoundStore<import("zustand").StoreApi<OnboardingState>>;
export {};
