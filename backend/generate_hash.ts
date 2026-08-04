import { hashPassword } from './src/utils/crypto.js';

async function main() {
  const hash = await hashPassword('AuraDash@2026');
  console.log('NEW HASH FOR AuraDash@2026:');
  console.log(hash);
}

main().catch(console.error);
