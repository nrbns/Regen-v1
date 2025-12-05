import { create } from 'zustand';
export const useContainerStore = create((set) => ({
    containers: [],
    activeContainerId: 'default',
    setContainers: (containers) => set((state) => {
        const unique = containers.reduce((acc, container) => {
            if (!acc.find((c) => c.id === container.id)) {
                acc.push(container);
            }
            return acc;
        }, []);
        const activeExists = unique.some((c) => c.id === state.activeContainerId);
        return {
            containers: unique,
            activeContainerId: activeExists ? state.activeContainerId : unique[0]?.id || 'default',
        };
    }),
    setActiveContainer: (container) => set((state) => ({
        activeContainerId: container.id,
        containers: [container, ...state.containers.filter((c) => c.id !== container.id)],
    })),
}));
