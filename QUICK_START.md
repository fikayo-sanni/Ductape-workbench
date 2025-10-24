# Quick Start Guide - Ductape Workbench

## TL;DR - Get Running in 30 Seconds

```bash
cd ductape-workbench
npm install
npm run dev
```

**That's it!** The `.env` file is already configured with the correct values.

Open `http://localhost:5173` and login with your Ductape account.

---

## Environment Variables (Already Set!)

The `.env` file already contains:

```bash
VITE_API_BASE_URL=https://api.ductape.app/
VITE_LOGIN_ENC_KEY=DAVIDBOWIEBABYBOWIE
VITE_APP_ENV=production
```

**No configuration needed!** These match the ductape-frontend-app exactly.

---

## Login Options

### Option 1: Email & Password
Use your existing Ductape account credentials.

### Option 2: OAuth (Google, GitHub, LinkedIn)
Click the OAuth button and authorize.

### Option 3: Create New Account
Click "Create an account" to sign up.

---

## What You Get

✅ Authentication with Ductape platform
✅ Workspace and project management
✅ HTTP request testing (like Postman)
✅ Code generation in TypeScript, Python, Go, Java
✅ Response viewing and debugging
✅ SDK-based code examples

---

## Need Help?

- **Full Setup Guide**: See [SETUP.md](SETUP.md)
- **Architecture Details**: See [FRONTEND_APP_ANALYSIS.md](FRONTEND_APP_ANALYSIS.md)
- **SDK Integration**: See [SDK_INTEGRATION_GUIDE.md](SDK_INTEGRATION_GUIDE.md)

---

## Local Backend Development

To use a local backend instead of production:

1. Edit `.env`:
   ```bash
   VITE_API_BASE_URL=http://localhost:8000/api/
   ```

2. Restart dev server:
   ```bash
   npm run dev
   ```

---

That's all you need to know! 🚀
