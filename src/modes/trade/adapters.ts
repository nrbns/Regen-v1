export interface BrokerAdapter {
  getBalance(): number;
  buy(symbol: string, qty: number): void;
  sell(symbol: string, qty: number): void;
}

export class MockBroker implements BrokerAdapter {
  private balance = 10000;
  getBalance() { return this.balance; }
  buy(_symbol: string, qty: number) { this.balance -= qty * 100; }
  sell(_symbol: string, qty: number) { this.balance += qty * 100; }
}


