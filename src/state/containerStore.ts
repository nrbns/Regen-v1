import { create } from 'zustand';
import { ContainerInfo } from '../lib/ipc-events';

type ContainerState = {
  containers: ContainerInfo[];
  activeContainerId: string;
  setContainers: (containers: ContainerInfo[]) => void;
  setActiveContainer: (container: ContainerInfo) => void;
};

export const useContainerStore = create<ContainerState>((set) => ({
  containers: [],
  activeContainerId: 'default',
  setContainers: (containers) =>
    set((state) => {
      const unique = containers.reduce<ContainerInfo[]>((acc, container) => {
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
  setActiveContainer: (container) =>
    set((state) => ({
      activeContainerId: container.id,
      containers: [container, ...state.containers.filter((c) => c.id !== container.id)],
    })),
}));


