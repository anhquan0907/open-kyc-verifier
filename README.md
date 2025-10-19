# Open KYC Verifier

A web component and React wrapper for KYC (Know Your Customer) verification using camera capture and OpenCV.js face detection. Includes both full KYC verification and re-verification components.

## Installation

```bash
npm install open-kyc-verifier
```

## Updating

To update to the latest version of the library:

```bash
npm update open-kyc-verifier
```

Or install a specific version:

```bash
npm install open-kyc-verifier@latest
```

To check your current installed version:

```bash
npm list open-kyc-verifier
```

Check the [npm package page](https://www.npmjs.com/package/open-kyc-verifier) for the latest version and changelog.

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

Example Next.js page (client component) that uses the React wrappers:

```tsx
'use client';

import { useState } from 'react';
import { OpenKyc, ReKyc } from 'open-kyc-verifier/react';

export default function Page() {
    const [result, setResult] = useState<any | null>(null);
    const [sessionId, setSessionId] = useState<string>('');

    const handleVerification = (result: any) => {
        setResult(result);
        if (result.verified) {
            console.log('✅ KYC verification successful!');
            // 🔑 QUAN TRỌNG: Lưu trữ ses_id để sử dụng cho ReKyc sau này
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
- **Quan trọng**: Luôn lưu trữ `ses_id` từ kết quả OpenKyc thành công để sử dụng cho ReKyc. `ses_id` là khóa để truy cập dữ liệu xác thực đã lưu.
- `OpenKyc` thực hiện xác thực đầy đủ (thẻ ID + selfie) và trả về `ses_id`.
- `ReKyc` chỉ cần selfie và `ses_id` để xác thực lại nhanh chóng.

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
**Mục đích**: Xác thực đầy đủ giữa khuôn mặt và thẻ ID (Know Your Customer).

**Quy trình**:
- Chụp ảnh mặt trước thẻ ID
- Chụp ảnh chân dung (selfie)
- So sánh khuôn mặt trên thẻ với khuôn mặt trong ảnh selfie
- Xác thực tính hợp lệ của thông tin

**Kết quả**: Trả về kết quả xác thực và `ses_id` (session ID) để sử dụng cho việc xác thực lại.

**Khi nào sử dụng**: Lần đầu tiên xác thực khách hàng, khi cần thu thập và xác thực đầy đủ thông tin cá nhân.

### ReKyc (Re-verification)
**Mục đích**: Xác thực lại khuôn mặt dựa trên dữ liệu đã được xác thực đúng trước đó, không cần chụp thẻ ID nữa.

**Quy trình**:
- Yêu cầu `ses_id` từ lần xác thực thành công trước đó (từ OpenKyc)
- Chỉ chụp ảnh chân dung (selfie)
- So sánh khuôn mặt với dữ liệu khuôn mặt đã lưu từ lần xác thực đầu tiên
- Xác thực nhanh chóng

**Kết quả**: Trả về kết quả xác thực lại.

**Khi nào sử dụng**: Khi cần xác thực lại danh tính của khách hàng đã được xác thực trước đó (ví dụ: đăng nhập lại, xác thực giao dịch, v.v.).

### Lưu ý quan trọng về Session ID
- **Luôn lưu trữ `ses_id`** nhận được từ OpenKyc thành công để sử dụng cho ReKyc
- `ses_id` là khóa duy nhất để truy cập dữ liệu xác thực đã lưu
- Không chia sẻ `ses_id` và bảo mật nó như thông tin nhạy cảm
- Nếu mất `ses_id`, người dùng sẽ cần thực hiện lại quy trình OpenKyc đầy đủ

## Requirements & behavior

- OpenCV.js will be loaded automatically by the component from `https://open-kyc.ziang.me/Lib/v1.0/js/main.js` if not already present on the page.
- The component needs camera access (getUserMedia). Production environments require HTTPS for camera access.
- The component uploads image data to the server endpoint defined in the component. Ensure you trust the endpoint and use HTTPS in production.

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
- If your project uses CommonJS consumers, note this package is ESM. Consider adding an interop build if needed.
- If OpenCV fails to load due to CSP or network restrictions, host the script on a domain allowed by your app or bundle a compatible OpenCV build.

## Privacy & Security

- The component sends image data to a remote API endpoint. Ensure you have permission to transmit user images and that the endpoint uses HTTPS and appropriate privacy policies.

## License & Copyright

MIT

Copyright (c) Ziang - 2025