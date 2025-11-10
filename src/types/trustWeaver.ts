export type TrustVerdict = 'trusted' | 'caution' | 'risk';

export interface TrustSignal {
  id: string;
  domain: string;
  url?: string;
  title?: string;
  score: number;
  confidence: number;
  tags: string[];
  comment?: string;
  sourcePeer?: string;
  createdAt: number;
}

export interface TrustSummary {
  domain: string;
  score: number;
  confidence: number;
  verdict: TrustVerdict;
  signals: number;
  tags: string[];
  lastUpdated: number;
  topSignals: TrustSignal[];
}
