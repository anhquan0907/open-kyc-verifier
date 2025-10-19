# Hướng dẫn Publish lên npm

## Bước 1: Chuẩn bị tài khoản npm

### Tạo tài khoản npm (nếu chưa có):
```bash
npm adduser
# Hoặc
npm login
```

### Hoặc tạo tài khoản online:
1. Truy cập https://www.npmjs.com/
2. Click "Sign Up"
3. Verify email

## Bước 2: Chuẩn bị package

### 1. Kiểm tra package.json:
```json
{
  "name": "open-kyc-verifier",
  "version": "1.0.0",
  "description": "A web component for KYC verification using camera and face detection",
  "main": "index.js",
  "module": "index.js",
  "types": "index.d.ts",
  "exports": {
    ".": {
      "types": "./index.d.ts",
      "import": "./index.js"
    },
    "./react": {
      "types": "./OpenKyc.d.ts",
      "import": "./OpenKyc.js"
    }
  },
  "keywords": ["kyc", "verification", "web-component", "opencv", "face-detection"],
  "author": "Ziang",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/open-kyc-verifier"
  },
  "bugs": {
    "url": "https://github.com/your-username/open-kyc-verifier/issues"
  },
  "homepage": "https://github.com/your-username/open-kyc-verifier#readme"
}
```

### 2. Đảm bảo version chưa tồn tại:
```bash
npm view open-kyc-verifier versions
```

### 3. Test package cuối cùng:
```bash
cd npm_lib
npm test  # Nếu có test script
```

## Bước 3: Publish lên npm

### Cách 1: Publish trực tiếp
```bash
cd npm_lib
npm login  # Nếu chưa login
npm publish
```

### Cách 2: Publish với tag
```bash
# Publish as beta
npm publish --tag beta

# Publish as latest
npm publish
```

### Cách 3: Publish với access
```bash
# Public package
npm publish --access public

# Scoped package
npm publish --access public  # For @your-scope/package-name
```

## Bước 4: Verify publish

### 1. Kiểm tra trên npmjs.com:
```bash
# Mở browser: https://www.npmjs.com/package/open-kyc-verifier
```

### 2. Test install từ npm:
```bash
# Tạo project test mới
mkdir test-install
cd test-install
npm init -y

# Install package từ npm
npm install open-kyc-verifier

# Test import
node -e "console.log('Package installed:', require('open-kyc-verifier'))"
```

### 3. Test React component:
```javascript
// test-install/index.js
import OpenKyc from 'open-kyc-verifier/react';
console.log('React component:', OpenKyc);
```

## Bước 5: Update package

### Khi có thay đổi:
```bash
# Update version trong package.json
# 1.0.0 -> 1.0.1 (patch)
# 1.0.0 -> 1.1.0 (minor)
# 1.0.0 -> 2.0.0 (major)

# Publish version mới
npm publish
```

### Unpublish (cẩn thận!):
```bash
# Chỉ unpublish trong 72h đầu
npm unpublish open-kyc-verifier@1.0.0

# Deprecate thay vì unpublish
npm deprecate open-kyc-verifier@1.0.0 "Use version 1.0.1 instead"
```

## Troubleshooting

### Lỗi "You do not have permission to publish":
- Package name đã tồn tại
- Đổi tên package trong package.json

### Lỗi "Cannot publish over existing version":
- Tăng version number

### Lỗi "Two-factor authentication required":
```bash
npm profile enable-2fa auth-and-writes
```

### Lỗi network:
```bash
npm config set registry https://registry.npmjs.org/
npm login
```

## Best Practices

### 1. Semantic Versioning:
- `MAJOR.MINOR.PATCH`
- `1.0.0` - Breaking changes
- `0.1.0` - New features
- `0.0.1` - Bug fixes

### 2. Pre-release versions:
```bash
# Beta version
npm version prerelease --preid=beta
npm publish --tag beta

# Release candidate
npm version prerelease --preid=rc
npm publish --tag rc
```

### 3. Scoped packages:
```json
{
  "name": "@your-org/open-kyc-verifier",
  "publishConfig": {
    "access": "public"
  }
}
```

### 4. CI/CD với GitHub Actions:
```yaml
# .github/workflows/publish.yml
name: Publish to npm
on:
  release:
    types: [published]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org/'
      - run: npm ci
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Kiểm tra cuối cùng

Trước khi publish, chạy:
```bash
# Lint code
npm run lint

# Run tests
npm test

# Build (nếu có)
npm run build

# Dry run publish
npm publish --dry-run
```

Chúc bạn publish thành công! 🚀