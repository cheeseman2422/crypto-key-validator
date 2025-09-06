
# Crypto Key Validator

Minimal Bitcoin artifact finder. GUI desktop app. Offline, secure, personal use.

## Quick Start

**Requirements:**
- Node.js 18+
- pnpm (recommended) or npm

**Setup:**
```bash
git clone <repository-url>
cd crypto-key-validator
pnpm install
cd core-engine && pnpm build && cd ..
cd app-electron && pnpm dev
```

## Usage

- Main focus: Find Bitcoin keys, seed phrases, addresses, wallet files.
- Use GUI to scan folders or paste data.
- All detection is offline and secure.

## Notes

- Only Bitcoin is supported.
- No artifact saving to disk by default.
- Validation and reporting features are secondary.

---
Personal project. Less is more.
