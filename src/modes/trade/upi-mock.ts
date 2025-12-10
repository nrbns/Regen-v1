/**
 * LAG FIX #8: UPI Mock Service
 * Simulates UPI transactions for Indian users
 * Supports: PhonePe, Google Pay, Paytm, BHIM, Amazon Pay
 */

export type UPIPSP = 'phonepe' | 'gpay' | 'paytm' | 'bhim' | 'amazonpay';

export interface UPIRequest {
  amount: number;
  recipientVPA: string; // e.g., "user@paytm"
  recipientName?: string;
  merchantId?: string;
  transactionNote?: string;
  psp?: UPIPSP; // Payment Service Provider
}

export interface UPIResponse {
  success: boolean;
  transactionId: string;
  upiId: string;
  amount: number;
  timestamp: number;
  status: 'success' | 'pending' | 'failed';
  message: string;
  psp?: UPIPSP;
}

/**
 * Mock UPI payment service
 * Simulates UPI transaction flow for testing/demo
 */
export class UPIMockService {
  private transactions: Map<string, UPIResponse> = new Map();

  /**
   * Initiate UPI payment
   */
  async initiatePayment(request: UPIRequest): Promise<UPIResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    const transactionId = `UPI${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const psp = request.psp || this.detectPSP(request.recipientVPA);

    // Simulate 95% success rate
    const success = Math.random() > 0.05;

    const response: UPIResponse = {
      success,
      transactionId,
      upiId: request.recipientVPA,
      amount: request.amount,
      timestamp: Date.now(),
      status: success ? 'success' : 'failed',
      message: success
        ? `Payment of ₹${request.amount} to ${request.recipientName || request.recipientVPA} successful`
        : 'Payment failed. Please try again.',
      psp,
    };

    this.transactions.set(transactionId, response);
    return response;
  }

  /**
   * Check payment status
   */
  async checkStatus(transactionId: string): Promise<UPIResponse | null> {
    return this.transactions.get(transactionId) || null;
  }

  /**
   * Generate UPI QR code data
   */
  generateQRCode(request: UPIRequest): string {
    // UPI QR code format: upi://pay?pa=<VPA>&pn=<Name>&am=<Amount>&cu=INR&tn=<Note>
    const params = new URLSearchParams({
      pa: request.recipientVPA,
      pn: request.recipientName || 'Recipient',
      am: request.amount.toString(),
      cu: 'INR',
      tn: request.transactionNote || 'Payment',
    });
    return `upi://pay?${params.toString()}`;
  }

  /**
   * Detect PSP from VPA
   */
  private detectPSP(vpa: string): UPIPSP {
    const domain = vpa.split('@')[1]?.toLowerCase() || '';
    if (domain.includes('phonepe') || domain.includes('ybl')) return 'phonepe';
    if (domain.includes('gpay') || domain.includes('okaxis')) return 'gpay';
    if (domain.includes('paytm')) return 'paytm';
    if (domain.includes('bhim') || domain.includes('upi')) return 'bhim';
    if (domain.includes('amazon')) return 'amazonpay';
    return 'bhim'; // Default to BHIM
  }

  /**
   * Get transaction history
   */
  getHistory(limit = 10): UPIResponse[] {
    return Array.from(this.transactions.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}

// Singleton instance
export const upiMockService = new UPIMockService();

/**
 * Hindi UPI commands helper
 */
export const HINDI_UPI_COMMANDS = {
  pay: ['भुगतान करो', 'पेमेंट करो', 'भेजो', 'ट्रांसफर करो'],
  amount: ['रुपये', '₹', 'रु'],
  to: ['को', 'के लिए'],
  confirm: ['कन्फर्म करो', 'स्वीकार करो', 'हाँ'],
  cancel: ['रद्द करो', 'नहीं', 'कैंसल'],
};

/**
 * Parse Hindi UPI command
 * Example: "500 रुपये user@paytm को भेजो"
 */
export function parseHindiUPICommand(text: string): Partial<UPIRequest> | null {
  const lowerText = text.toLowerCase();

  // Extract amount
  const amountMatch = lowerText.match(/(\d+)\s*(?:रुपये|रु|₹)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

  // Extract VPA (email-like pattern)
  const vpaMatch = lowerText.match(/([\w.]+@[\w.]+)/);
  const vpa = vpaMatch ? vpaMatch[1] : null;

  // Extract recipient name (optional)
  const nameMatch = lowerText.match(/को\s+([^\s]+)/);
  const name = nameMatch ? nameMatch[1] : undefined;

  if (!amount || !vpa) return null;

  return {
    amount,
    recipientVPA: vpa,
    recipientName: name,
    transactionNote: 'Voice payment',
  };
}
