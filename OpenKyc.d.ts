import React from 'react';
import { KycVerificationEventDetail } from './index';

export interface OpenKycProps {
  apiKey: string;
  onVerificationComplete?: (result: KycVerificationEventDetail) => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface ReKycProps {
  apiKey: string;
  sesId: string;
  onVerificationComplete?: (result: KycVerificationEventDetail) => void;
  className?: string;
  style?: React.CSSProperties;
}

declare const OpenKyc: React.FC<OpenKycProps>;
declare const ReKyc: React.FC<ReKycProps>;

export { OpenKyc, ReKyc };