export class MockBroker {
    balance = 10000;
    getBalance() { return this.balance; }
    buy(_symbol, qty) { this.balance -= qty * 100; }
    sell(_symbol, qty) { this.balance += qty * 100; }
}
