import { test as setup } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { loginViaApi, writeAuthStorageFile, writeEmptyAuthStorageFile } from './helpers/api-auth';
import { e2eBaseUrl, hasAuthCredentials } from './helpers/env';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate via API', async () => {
  const baseUrl = e2eBaseUrl();

  if (!hasAuthCredentials()) {
    writeEmptyAuthStorageFile(authFile, baseUrl);
    return;
  }

  const session = await loginViaApi(
    process.env.E2E_EMAIL!.trim(),
    process.env.E2E_PASSWORD!.trim(),
  );
  writeAuthStorageFile(authFile, baseUrl, session);
  process.env.E2E_AUTH_READY = '1';
});
