# Open KYC Verifier

A web component and React wrapper for KYC (Know Your Customer) verification using camera capture and OpenCV.js face detection. Includes both full KYC verification and re-verification components.

**Latest Version: 3.7.11** - Includes SSR compatibility fixes for Next.js and other server-side rendering frameworks.

## Installation

```bash
npm install open-kyc-verifier
```

## Updating to Version 3.7.11

Version 3.7.11 includes critical fixes for Server-Side Rendering (SSR) compatibility, especially for Next.js applications. If you're experiencing build errors related to `HTMLElement` or module imports, update immediately:

```bash
npm install open-kyc-verifier@3.7.11
```

Or update to the latest:

```bash
npm update open-kyc-verifier
```

To check your current version:

```bash
npm list open-kyc-verifier
```

## SSR Compatibility

This library is now fully compatible with Server-Side Rendering frameworks like Next.js. The components safely handle browser-only APIs and can be used in both client and server environments without build errors.

## Usage

### Get an API Key

To use the service, you need an API key. Register for an account and obtain your API key at:

https://open-kyc.ziang.me

After registration, store the API key securely in your application's environment variables.

### 1) Next.js / React (Recommended)

For Next.js, create a `.env.local` file in your project root:

```
NEXT_PUBLIC_API_KEY=your_api_key_here
```

Example Next.js page (client component):

```tsx
'use client';

import { useState } from 'react';
import { OpenKyc, ReKyc } from 'open-kyc-verifier/react';

export default function KycPage() {
    const [result, setResult] = useState<any | null>(null);
    const [sessionId, setSessionId] = useState<string>('');

    const handleVerification = (result: any) => {
        setResult(result);
        if (result.verified) {
            console.log('✅ KYC verification successful!');
            // 🔑 IMPORTANT: Store ses_id for future ReKyc
            setSessionId(result.ses_id || '');
        } else {
            console.log('❌ KYC verification failed');
        }
    };

    const handleReVerification = (result: any) => {
        setResult(result);
        if (result.verified) {
            console.log('✅ Re-KYC verification successful!');
        } else {
            console.log('❌ Re-KYC verification failed');
        }
    };

    return (
        <div>
            {!sessionId ? (
                <OpenKyc
                    apiKey={process.env.NEXT_PUBLIC_API_KEY || ''}
                    onVerificationComplete={handleVerification}
                />
            ) : (
                <ReKyc
                    apiKey={process.env.NEXT_PUBLIC_API_KEY || ''}
                    sesId={sessionId}
                    onVerificationComplete={handleReVerification}
                />
            )}

            {!process.env.NEXT_PUBLIC_API_KEY && (
                <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 rounded">
                    <strong>Warning:</strong> NEXT_PUBLIC_API_KEY is not set. The verifier will be unauthenticated.
                </div>
            )}

            {result && (
                <div className="mt-4">
                    <h3>Verification Result:</h3>
                    <pre className="bg-gray-100 p-2 rounded">{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}
```

**Important Notes for Next.js:**
- Use `'use client'` directive since the component requires browser APIs
- The library is SSR-safe and won't cause build errors
- Store `ses_id` from successful verification for re-verification

### 2) Vanilla JavaScript / Web Component

If you don't use React, import and register the web components directly:

```html
<!-- In a bundler or module-enabled environment -->
<script type="module">
  import { KycVerifier, ReVerifier } from 'open-kyc-verifier';
  
  if (!customElements.get('kyc-verifier')) {
    customElements.define('kyc-verifier', KycVerifier);
  }
  
  if (!customElements.get('re-verifier')) {
    customElements.define('re-verifier', ReVerifier);
  }
</script>

<!-- In your HTML -->
<kyc-verifier api-key="YOUR_API_KEY"></kyc-verifier>

<!-- For re-verification (sử dụng ses_id từ lần xác thực thành công trước đó) -->
<re-verifier api-key="YOUR_API_KEY" ses_id="SESSION_ID_FROM_PREVIOUS_VERIFICATION"></re-verifier>
```

### 3) Listening for verification events (vanilla)

Both components dispatch a `kyc-verification-complete` event with detail:

```javascript
{
  verified: boolean, // Whether the verification was successful
  success: boolean,  // API response success
  ses_id?: string,   // Session ID (chỉ trả về từ OpenKyc khi verified = true)
  message?: string   // Optional server/error message
}

// Example listener
document.querySelector('kyc-verifier')?.addEventListener('kyc-verification-complete', (e) => {
  console.log('KYC result', e.detail);
});

document.querySelector('re-verifier')?.addEventListener('kyc-verification-complete', (e) => {
  console.log('Re-KYC result', e.detail);
});
```

## Components Overview

### OpenKyc (Full KYC Verification)
- **Purpose**: Complete identity verification with ID card and facial matching
- **Process**: Capture ID card photo + selfie, compare faces
- **Returns**: Verification result + `ses_id` for future re-verification
- **Use when**: First-time customer verification

### ReKyc (Re-verification)
- **Purpose**: Quick verification using previously stored facial data
- **Process**: Capture selfie only, compare with stored data using `ses_id`
- **Returns**: Verification result
- **Use when**: Re-authenticating existing verified users

### Session ID (`ses_id`) Management
- **Always store `ses_id`** from successful OpenKyc verification
- Use `ses_id` for ReKyc operations
- Treat `ses_id` as sensitive data - store securely
- If `ses_id` is lost, user must complete full OpenKyc again

## API Reference

### OpenKyc Props
- `apiKey` (string, required): Your API key
- `onVerificationComplete` (function): Callback for React usage

### ReKyc Props
- `apiKey` (string, required): Your API key
- `sesId` (string, required): Session ID from previous verification
- `onVerificationComplete` (function): Callback for React usage

### Web Component Attributes
- `api-key`: Your API key
- `ses_id`: Session ID (for re-verifier only)

## Requirements

- Modern browser with camera support
- HTTPS for camera access in production
- OpenCV.js loaded automatically from CDN
- Internet connection for API calls

## Troubleshooting

### Build Errors
- Update to version 3.7.11 or later for SSR compatibility
- Ensure you're using client components in Next.js

### Camera Issues
- Grant camera permissions
- Use HTTPS in production
- Check browser compatibility

### API Issues
- Verify API key is correct
- Check network connectivity
- Ensure HTTPS endpoint usage

## Privacy & Security

- Images are sent to remote API endpoints
- Use HTTPS and ensure compliance with privacy regulations
- Store session IDs securely
- Obtain user consent for image capture

## License

MIT

Copyright (c) Ziang - 2025