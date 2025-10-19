import React from 'react';
import { KycVerificationEventDetail } from './index';

export interface OpenKycProps {
  apiKey: string;
  onVerificationComplete?: (result: KycVerificationEventDetail) => void;
  className?: string;
  style?: React.CSSProperties;
}

declare const OpenKyc: React.FC<OpenKycProps>;

export default OpenKyc;