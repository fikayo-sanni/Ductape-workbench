# Ductape Workbench - Setup Guide

## Quick Start

### 1. Environment Variables

The `.env` file has already been created for you with the correct values:

```bash
VITE_API_BASE_URL=https://api.ductape.app/
VITE_LOGIN_ENC_KEY=DAVIDBOWIEBABYBOWIE
VITE_APP_ENV=production
```

**These values are the same as the main ductape-frontend-app.**

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The app will start at `http://localhost:4310`

## Environment Variables Explained

### `VITE_API_BASE_URL`

This is the backend API endpoint.

**Production (default):**
```
VITE_API_BASE_URL=https://api.ductape.app/
```

**Local Development:**
If you have the Ductape backend running locally, use:
```
VITE_API_BASE_URL=http://localhost:4311/
```

All API calls will be made to this base URL:
- Login: `${VITE_API_BASE_URL}users/v1/login`
- OAuth: `${VITE_API_BASE_URL}users/v1/auth/google`
- etc.

### `VITE_LOGIN_ENC_KEY`

This is the encryption key used to decrypt OAuth callback tokens.

**Value:** `DAVIDBOWIEBABYBOWIE`

When users login via Google/GitHub/LinkedIn OAuth:
1. They're redirected to: `${VITE_API_BASE_URL}users/v1/auth/google`
2. After OAuth, they're redirected back with an encrypted token
3. This key decrypts the token to get user data

**This must match the encryption key used by the backend.**

### `VITE_APP_ENV`

Environment flag for the application.

**Value:** `production`

This is used by the SDK and other parts of the app to determine the environment.

## Authentication Flow

### 1. Email/Password Login

When you enter email and password:
- Sends POST to `/users/v1/login`
- Receives user object with `auth_token` and `public_key`
- Stores token in `localStorage`
- Token is automatically added to all future requests via Axios interceptor

### 2. OAuth Login (Google/GitHub/LinkedIn)

When you click OAuth button:
- Redirects to: `https://api.ductape.app/users/v1/auth/google`
- Backend handles OAuth flow
- Redirects back to workbench with encrypted token in URL
- Token is decrypted using `VITE_LOGIN_ENC_KEY`
- User data is extracted and stored

### 3. Session Persistence

- User data stored in `localStorage` under key `"user"`
- Auth token stored in `localStorage` under key `"token"`
- On app reload, these are read and user stays logged in
- On logout, both are cleared

## API Integration

### Axios Configuration

All HTTP requests go through the configured Axios instance:

```typescript
// Located in: src/config/axiosinstance.ts
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Request Interceptor automatically adds:
Authorization: Bearer ${token}
```

### Making API Calls

Example from auth service:

```typescript
const login = async (data: LoginPayload): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>("/users/v1/login", data);
  return response.data;
};
```

The `apiClient` automatically:
- Prepends `VITE_API_BASE_URL`
- Adds Authorization header with token
- Handles errors

## Troubleshooting

### "Network Error" or "Failed to Login"

**Cause:** Backend API is not reachable

**Solutions:**
1. Check `VITE_API_BASE_URL` is correct
2. Verify backend is running (if using local)
3. Check network/CORS issues
4. Verify backend accepts requests from your origin

### "Invalid encryption key" or OAuth not working

**Cause:** `VITE_LOGIN_ENC_KEY` doesn't match backend

**Solution:**
- Ensure `VITE_LOGIN_ENC_KEY=DAVIDBOWIEBABYBOWIE`
- This must match the backend's encryption key

### Login works but requests fail with 401

**Cause:** Token not being sent or invalid

**Solutions:**
1. Check localStorage has `token` key
2. Verify Axios interceptor is adding Authorization header
3. Token might be expired - logout and login again

### OAuth redirect doesn't work

**Cause:** Backend OAuth callback URL might not include workbench URL

**Solution:**
- Ensure backend OAuth callback includes workbench URL in allowed redirects
- For local dev: Add `http://localhost:4310` to backend OAuth config

## Testing Authentication

### 1. Test with Existing Ductape Account

If you already have a Ductape account:
```
Email: your@email.com
Password: your-password
```

### 2. Create New Account

Click "Create an account" link in login modal:
- You'll be redirected to Ductape signup
- After signup, return to workbench and login

### 3. Test OAuth

Click Google/GitHub/LinkedIn button:
- You'll be redirected to OAuth provider
- Authorize the app
- You'll be redirected back and automatically logged in

## Development Tips

### Inspecting Stored Data

Open browser DevTools Console:

```javascript
// Check stored token
localStorage.getItem('token')

// Check stored user
JSON.parse(localStorage.getItem('user'))

// Clear session (logout manually)
localStorage.removeItem('token')
localStorage.removeItem('user')
```

### Testing Different Environments

**Switch to local backend:**
```bash
# In .env, change:
VITE_API_BASE_URL=http://localhost:4311/
```

**Switch back to production:**
```bash
# In .env, change:
VITE_API_BASE_URL=https://api.ductape.app/
```

After changing, restart the dev server:
```bash
npm run dev
```

## Next Steps

Once authenticated, you can:
1. Create workspaces and projects
2. Build and test API requests
3. Generate SDK code
4. All requests will automatically include your auth token
5. Access will be scoped to your workspaces

## Security Notes

- Never commit `.env` file to git (already in `.gitignore`)
- Token is stored in localStorage (accessible by JavaScript)
- For production deployment, consider:
  - Using httpOnly cookies for tokens
  - Implementing token refresh
  - Adding CSRF protection
  - Session timeout

## Support

If you encounter issues:
1. Check this guide first
2. Verify all environment variables are set correctly
3. Check browser console for errors
4. Check network tab for failed requests
5. Verify backend is accessible
