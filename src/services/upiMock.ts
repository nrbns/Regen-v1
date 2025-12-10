/**
 * UPI Mock Service - v0.4 Week 3: Desi Mode
 * Simulates UPI payment flow for Indian users (no real payments)
 *
 * Supports: PhonePe, Google Pay, Paytm, BHIM UPI
 */

export type UPIPSP = 'phonepe' | 'googlepay' | 'paytm' | 'bhim';

export interface UPIPaymentRequest {
  amount: number;
  merchantName: string;
  merchantId?: string;
  transactionId?: string;
  description?: string;
  psp?: UPIPSP;
  vpa?: string; // Virtual Payment Address (e.g., user@paytm)
}

export interface UPIPaymentResponse {
  success: boolean;
  transactionId: string;
  upiId: string;
  amount: number;
  timestamp: number;
  status: 'success' | 'failed' | 'pending';
  message?: string;
}

export interface UPIMockConfig {
  simulateDelay?: boolean;
  delayMs?: number;
  successRate?: number; // 0-1, default 0.95 (95% success)
  psp?: UPIPSP;
}

class UPIMockService {
  private config: UPIMockConfig;

  constructor(config: UPIMockConfig = {}) {
    this.config = {
      simulateDelay: true,
      delayMs: 2000,
      successRate: 0.95,
      psp: 'phonepe',
      ...config,
    };
  }

  /**
   * Simulate UPI payment
   */
  async processPayment(request: UPIPaymentRequest): Promise<UPIPaymentResponse> {
    const transactionId = request.transactionId || this.generateTransactionId();
    const upiId = this.generateUPIId(request.psp || this.config.psp || 'phonepe');

    // Simulate network delay
    if (this.config.simulateDelay && this.config.delayMs) {
      await new Promise(resolve => setTimeout(resolve, this.config.delayMs));
    }

    // Simulate success/failure based on success rate
    const success = Math.random() < (this.config.successRate || 0.95);

    if (success) {
      return {
        success: true,
        transactionId,
        upiId,
        amount: request.amount,
        timestamp: Date.now(),
        status: 'success',
        message: `Payment of ₹${request.amount.toFixed(2)} successful via ${request.psp || this.config.psp}`,
      };
    } else {
      return {
        success: false,
        transactionId,
        upiId,
        amount: request.amount,
        timestamp: Date.now(),
        status: 'failed',
        message: 'Payment failed. Please try again.',
      };
    }
  }

  /**
   * Generate mock UPI transaction ID
   */
  private generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0');
    return `TXN${timestamp}${random}`;
  }

  /**
   * Generate mock UPI ID based on PSP
   */
  private generateUPIId(psp: UPIPSP): string {
    const domains: Record<UPIPSP, string> = {
      phonepe: 'ybl',
      googlepay: 'okaxis',
      paytm: 'paytm',
      bhim: 'upi',
    };

    const random = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0');
    return `${random}@${domains[psp]}`;
  }

  /**
   * Validate UPI VPA format
   */
  validateVPA(vpa: string): boolean {
    // Basic UPI VPA format: username@psp
    const vpaRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    return vpaRegex.test(vpa);
  }

  /**
   * Get PSP name from VPA
   */
  getPSPFromVPA(vpa: string): UPIPSP | null {
    const pspMap: Record<string, UPIPSP> = {
      ybl: 'phonepe',
      okaxis: 'googlepay',
      paytm: 'paytm',
      upi: 'bhim',
    };

    const domain = vpa.split('@')[1]?.toLowerCase();
    return pspMap[domain] || null;
  }
}

// Singleton instance
let upiMockInstance: UPIMockService | null = null;

/**
 * Get UPI mock service instance
 */
export function getUPIMockService(config?: UPIMockConfig): UPIMockService {
  if (!upiMockInstance) {
    upiMockInstance = new UPIMockService(config);
  }
  return upiMockInstance;
}

/**
 * Process UPI payment (mock)
 */
export async function processUPIPayment(
  request: UPIPaymentRequest,
  config?: UPIMockConfig
): Promise<UPIPaymentResponse> {
  const service = getUPIMockService(config);
  return service.processPayment(request);
}
