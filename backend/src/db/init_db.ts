import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = __dirname;

function runCommand(cmd: string, description: string) {
  console.log(`\n⏳ ${description}...`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✅ Completed: ${description}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed: ${description}`);
    return false;
  }
}

function dropTables(isRemote: boolean) {
  const target = isRemote ? '--remote' : '--local';
  const modeName = isRemote ? 'Cloudflare D1 (REMOTE)' : 'Local D1';
  const dropFilePath = path.join(dbDir, 'drop_all.sql');

  if (!fs.existsSync(dropFilePath)) {
    console.error(`❌ drop_all.sql not found at ${dropFilePath}`);
    return false;
  }

  return runCommand(
    `npx wrangler d1 execute auradash ${target} --file="${dropFilePath}"`,
    `Dropping all tables on ${modeName}`
  );
}

function applySchemas(isRemote: boolean) {
  const target = isRemote ? '--remote' : '--local';
  const modeName = isRemote ? 'Cloudflare D1 (REMOTE)' : 'Local D1';
  console.log(`\n🚀 Starting migrations on ${modeName}...`);

  runCommand(
    `npx wrangler d1 migrations apply auradash ${target}`,
    `Applying migrations [${modeName}]`
  );
  
  console.log('\n----------------------------------------');
  console.log(`📊 Result [${modeName}]: Migrations process finished.`);
}

async function showMenu() {
  const args = process.argv.slice(2);
  if (args.includes('--local')) {
    applySchemas(false);
    return;
  }
  if (args.includes('--remote')) {
    applySchemas(true);
    return;
  }
  if (args.includes('--drop-remote')) {
    dropTables(true);
    return;
  }
  if (args.includes('--reset-remote')) {
    dropTables(true);
    applySchemas(true);
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
  };

  console.log('\n========================================');
  console.log('   🗄️  AuraDash Database Manager (D1)  ');
  console.log('========================================');
  console.log('1) 🟢 Local: Apply All Schemas');
  console.log('2) ☁️ Remote (Cloudflare D1): Apply All Schemas');
  console.log('3) 🗑️ Local: Drop All Tables');
  console.log('4) 🗑️ Remote (Cloudflare D1): Drop All Tables');
  console.log('5) 💥 Full Remote Reset (Drop + Re-apply Schemas)');
  console.log('6) 💥 Full Local Reset (Drop + Re-apply Schemas)');
  console.log('0) ❌ Exit');
  console.log('========================================');

  const answer = (await question('Select Option [0-6]: ')).trim();
  rl.close();

  switch (answer) {
    case '1':
      applySchemas(false);
      break;
    case '2':
      applySchemas(true);
      break;
    case '3':
      dropTables(false);
      break;
    case '4':
      dropTables(true);
      break;
    case '5':
      console.log('\n⚠️ WARNING: This will drop ALL tables in REMOTE Cloudflare D1!');
      if (dropTables(true)) {
        applySchemas(true);
      }
      break;
    case '6':
      console.log('\n⚠️ WARNING: This will drop ALL tables in LOCAL D1!');
      if (dropTables(false)) {
        applySchemas(false);
      }
      break;
    case '0':
      console.log('Bye! 👋');
      break;
    default:
      console.log('❌ Invalid option.');
      break;
  }
}

showMenu().catch((err) => {
  console.error('Fatal error:', err);
});
