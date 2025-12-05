import { ContainerInfo } from '../lib/ipc-events';
type ContainerState = {
    containers: ContainerInfo[];
    activeContainerId: string;
    setContainers: (containers: ContainerInfo[]) => void;
    setActiveContainer: (container: ContainerInfo) => void;
};
export declare const useContainerStore: import("zustand").UseBoundStore<import("zustand").StoreApi<ContainerState>>;
export {};
