import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger';

// Resolve directory path for ESM in TS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = __dirname;
const sqlFiles = [
  'auth.sql',
  'services.sql',
  'article.sql',
  'booking.sql',
  'Customers.sql',
  'Inbox.sql',
  'Notifications.sql',
  'Article_Comments.sql',
  'apikey.sql',
  'web-settings.sql'
];

const REQ_ID = 'INIT_DB';

logger.info(REQ_ID, 'Starting AuraDash D1 local database initialization...');
logger.info(REQ_ID, `Found ${sqlFiles.length} schema files to execute.`);

let successCount = 0;
let errorCount = 0;

sqlFiles.forEach((file) => {
  const filePath = path.join(dbDir, file);
  
  if (fs.existsSync(filePath)) {
    logger.info(REQ_ID, `Executing schema file: ${file}...`);
    try {
      execSync(`npx wrangler d1 execute auradash --local --file="${filePath}"`, { stdio: 'pipe' });
      logger.info(REQ_ID, `Successfully applied ${file}`);
      successCount++;
    } catch (error: any) {
      logger.error(REQ_ID, `Failed to execute ${file}.`, error);
      
      if (error.stdout) {
        logger.error(REQ_ID, `Wrangler Stdout: ${error.stdout.toString()}`);
      }
      if (error.stderr) {
        logger.error(REQ_ID, `Wrangler Stderr: ${error.stderr.toString()}`);
      }
      
      errorCount++;
      logger.error(REQ_ID, 'Aborting initialization due to critical schema error.');
      process.exit(1);
    }
  } else {
    logger.warn(REQ_ID, `Schema file not found: ${filePath}. Skipping...`);
    errorCount++;
  }
});

logger.info(REQ_ID, '----------------------------------------');
if (errorCount === 0) {
  logger.info(REQ_ID, `AuraDash D1 local database successfully initialized! 🎉 (${successCount}/${sqlFiles.length} files)`);
} else {
  logger.warn(REQ_ID, `Initialization finished with issues. Success: ${successCount}, Missing/Failed: ${errorCount}`);
}
