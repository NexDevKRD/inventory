import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// globalSetup runs in a separate process context before any test file/setupFiles,
// so .env is not yet loaded here — load it manually before invoking prisma.
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      if (key && value) {
        process.env[key] = value;
      }
    }
  });
}

export default async function setup() {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  execSync('npx prisma migrate deploy', { cwd: __dirname + '/..', stdio: 'inherit' });
}
