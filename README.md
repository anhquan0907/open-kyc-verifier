# Open KYC Verifier

A web component and React wrapper for KYC (Know Your Customer) verification using camera capture and OpenCV.js face detection.

## Installation

```bash
npm install open-kyc-verifier
```

## Usage

Below are examples for how to use the package in React/Next.js and in plain JavaScript, plus how to provide the API key securely via environment variables.

### Get an API key

To use the service you need an API key. Register for an account and obtain your API key at:

https://open-kyc.ziang.me

After registration, copy the provided API key and store it in your application's environment variables (example below uses Next.js `.env.local`).

### 1) Next.js / React (recommended)

Create a `.env.local` (or `.env`) at your project root and add your public API key:

```
NEXT_PUBLIC_API_KEY=your_api_key_here
```

Example Next.js page (client component) that uses the React wrapper and reads the key from `process.env`:

```tsx
'use client';

import { useState } from 'react';
import OpenKyc from 'open-kyc-verifier/react';

export default function Page() {
    const [result, setResult] = useState<any | null>(null);

    const handleVerification = (result: any) => {
        setResult(result);
        if (result.verified) {
            console.log('✅ KYC verification successful!');
        } else {
            console.log('❌ KYC verification failed');
        }
    };

    return (
        <div>
            <OpenKyc
                apiKey={process.env.NEXT_PUBLIC_API_KEY || ''}
                onVerificationComplete={handleVerification}
            />
            {!process.env.NEXT_PUBLIC_API_KEY && (
                <div className="mt-4 p-3 bg-yellow-800 text-yellow-100 rounded">
                    <strong>Warning:</strong> NEXT_PUBLIC_API_KEY is not set. The verifier will be unauthenticated.
                </div>
            )}
            {result && (
                <div>
                    <h3>Verification Result:</h3>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}
```

Notes:
- Make sure the page is a client component (Next 13+ / app router) or used inside a client-side React tree because the verifier uses browser APIs (camera, WebAssembly).
- Use `NEXT_PUBLIC_` prefix (or your framework's public env convention) so the value is injectible into client-side code.

### 2) Vanilla JavaScript / Web Component

If you don't use React, import and register the web component directly:

```html
<!-- In a bundler or module-enabled environment -->
<script type="module">
  import KycVerifier from 'open-kyc-verifier';
  if (!customElements.get('kyc-verifier')) {
    customElements.define('kyc-verifier', KycVerifier);
  }
</script>

<!-- In your HTML -->
<kyc-verifier api-key="YOUR_API_KEY"></kyc-verifier>
```

### 3) Listening for verification events (vanilla)

The component dispatches a `kyc-verification-complete` event with detail:

```javascript
{
  verified: boolean, // Whether the verification was successful
  success: boolean,  // API response success
  message?: string   // Optional server/error message
}

// Example listener
document.querySelector('kyc-verifier')?.addEventListener('kyc-verification-complete', (e) => {
  console.log('KYC result', e.detail);
});
```

## Requirements & behavior

- OpenCV.js will be loaded automatically by the component from `https://open-kyc.ziang.me/Lib/v1.0/js/main.js` if not already present on the page.
- The component needs camera access (getUserMedia). Production environments require HTTPS for camera access.
- The component uploads two images (ID front and selfie) to the server endpoint defined in the component. Ensure you trust the endpoint and use HTTPS in production.

## Publishing to npm (quick checklist)

1. Make sure you have an npm account and are logged in locally:

```powershell
npm login
```

2. Verify which files will be published:

```powershell
npm publish --dry-run
```

3. Publish the package:

```powershell
npm publish
```

If the package name is scoped (e.g. `@yourname/open-kyc-verifier`) use:

```powershell
npm publish --access public
```

4. After publishing, check the package page on https://www.npmjs.com/

## Troubleshooting

- If publish fails because the package name is taken, pick a new unique `name` in `package.json` or use a scope.
- If your project uses CommonJS consumers, note this package is ESM (`export default`). Consider adding an interop build if needed.
- If OpenCV fails to load due to CSP or network restrictions, host the script on a domain allowed by your app or bundle a compatible OpenCV build.

## Privacy & Security

- The component sends image data to a remote API endpoint. Ensure you have permission to transmit user images and that the endpoint uses HTTPS and appropriate privacy policies.

## License & Copyright

MIT

Copyright (c) Ziang - 2025