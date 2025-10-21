import React, { useEffect, useRef, useState } from 'react';
import { KycVerifier, ReVerifier } from './index.mjs';

const OpenKyc = ({
  apiKey,
  onVerificationComplete,
  className,
  style
}) => {
  const containerRef = useRef(null);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    // Register the custom element only once
    if (!customElements.get('kyc-verifier')) {
      customElements.define('kyc-verifier', KycVerifier);
    }
    setIsRegistered(true);
  }, []);

  useEffect(() => {
    if (!isRegistered || !containerRef.current) return;

    const element = containerRef.current.querySelector('kyc-verifier');
    if (element && onVerificationComplete) {
      const handleEvent = (event) => {
        onVerificationComplete(event.detail);
      };
      element.addEventListener('kyc-verification-complete', handleEvent);

      return () => {
        element.removeEventListener('kyc-verification-complete', handleEvent);
      };
    }
  }, [isRegistered, onVerificationComplete]);

  if (!isRegistered) {
    return (
      <div className={className} style={style}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '200px',
          padding: '20px'
        }}>
          <div style={{
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            marginBottom: '15px'
          }} />
          <p>Loading KYC Verifier...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className} style={style}>
      <kyc-verifier api-key={apiKey} />
    </div>
  );
};

const ReKyc = ({
  apiKey,
  sesId,
  onVerificationComplete,
  className,
  style
}) => {
  const containerRef = useRef(null);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    // Register the custom element only once
    if (!customElements.get('re-verifier')) {
      customElements.define('re-verifier', ReVerifier);
    }
    setIsRegistered(true);
  }, []);

  useEffect(() => {
    if (!isRegistered || !containerRef.current) return;

    const element = containerRef.current.querySelector('re-verifier');
    if (element && onVerificationComplete) {
      const handleEvent = (event) => {
        onVerificationComplete(event.detail);
      };
      element.addEventListener('kyc-verification-complete', handleEvent);

      return () => {
        element.removeEventListener('kyc-verification-complete', handleEvent);
      };
    }
  }, [isRegistered, onVerificationComplete]);

  if (!isRegistered) {
    return (
      <div className={className} style={style}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '200px',
          padding: '20px'
        }}>
          <div style={{
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            marginBottom: '15px'
          }} />
          <p>Loading Re-KYC Verifier...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className} style={style}>
      <re-verifier api-key={apiKey} ses_id={sesId} />
    </div>
  );
};

export { OpenKyc, ReKyc };