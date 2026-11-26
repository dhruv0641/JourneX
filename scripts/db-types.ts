import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('Missing SUPABASE_DB_URL in .env.local');
  process.exit(1);
}

try {
  const output = execFileSync(
    'npx',
    ['--yes', 'supabase', 'gen', 'types', 'typescript', `--remote=${dbUrl}`, '--schema', 'public'],
    { encoding: 'utf8', shell: process.platform === 'win32' },
  );

  const target = resolve(process.cwd(), 'src/types/database.types.ts');
  writeFileSync(target, output, 'utf8');
  console.log(`Generated Supabase types at ${target}`);
} catch {
  console.error('Type generation failed.');
  process.exit(1);
}
