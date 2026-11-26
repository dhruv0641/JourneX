import { execFileSync } from 'node:child_process';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('Missing SUPABASE_DB_URL in .env.local');
  process.exit(1);
}

try {
  execFileSync(
    'npx',
    ['--yes', 'supabase', 'db', 'push', `--remote=${dbUrl}`, '--yes'],
    { stdio: 'inherit', shell: process.platform === 'win32' },
  );
} catch {
  console.error('Database migration failed. Check SQL output above.');
  process.exit(1);
}
