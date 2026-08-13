export class Money {
  constructor(
    public readonly amountMinor: number,
    public readonly currency: string,
  ) {
    if (!Number.isInteger(amountMinor)) {
      throw new Error(`Money amount must be an integer minor unit, got: ${amountMinor}`);
    }
    if (!currency || currency.length !== 3) {
      throw new Error(`Money currency must be a 3-letter ISO code, got: ${currency}`);
    }
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor + other.amountMinor, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor - other.amountMinor, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this.amountMinor * factor), this.currency);
  }

  pct(percentage: number): Money {
    return new Money(Math.round(this.amountMinor * (percentage / 100)), this.currency);
  }

  toMajor(): number {
    return this.amountMinor / 100;
  }

  toString(): string {
    return `${this.currency} ${this.toMajor().toFixed(2)}`;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }

  static fromMajor(amount: number, currency: string): Money {
    return new Money(Math.round(amount * 100), currency);
  }

  static zero(currency: string): Money {
    return new Money(0, currency);
  }
}
