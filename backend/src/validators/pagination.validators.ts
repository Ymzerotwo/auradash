import { z } from 'zod';
import { sanitizeForDb } from '../utils/sanitize';


/**
 * ℹ️ FLEXIBLE PAGINATION DEFAULT ℹ️
 * 
 * The default value of `limit` is set to 20, but this is a flexible default, NOT a hard constraint.
 * You are free to change this value if the application's UX requires different pagination sizes (e.g., 50 or 100).
 * 
 * HOW CACHING WORKS WITH PAGINATION:
 * Thanks to our "Atomic Overwrite" Meta-Cache architecture, we no longer rely on exact URL matching 
 * to purge cache entries. Instead, every frontend request dynamically appends a version hash (e.g. `?_v=123...`) 
 * retrieved from the Meta-Cache. 
 * 
 * When data is mutated (create/update/delete), the backend simply bumps this hash in the Meta-Cache. 
 * Because the hash changes, all paginated URLs instantly miss the old cache and fetch fresh data, 
 * regardless of the `page` or `limit` parameters they use.
 */
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    search: z.string().max(100, { message: 'too_long' }).optional().transform(val => val ? sanitizeForDb(val) : val),
});