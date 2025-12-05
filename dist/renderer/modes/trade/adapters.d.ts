export interface BrokerAdapter {
    getBalance(): number;
    buy(symbol: string, qty: number): void;
    sell(symbol: string, qty: number): void;
}
export declare class MockBroker implements BrokerAdapter {
    private balance;
    getBalance(): number;
    buy(_symbol: string, qty: number): void;
    sell(_symbol: string, qty: number): void;
}
