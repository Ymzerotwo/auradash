import { z } from "zod";
import { resolveKey, extractZodErrors, extractApiErrors } from "@/lib/utils/error";

export { resolveKey, extractZodErrors, extractApiErrors };

export const getSeoSchema = () => {
  return z.object({
    meta_title: z.string().max(255, { message: "too_long" }).optional(),
    meta_description: z.string().max(10000, { message: "too_long" }).optional(),
    og_image: z.string().max(1000, { message: "too_long" }).optional().nullable(),
    canonical_url: z.union([
      z.string().url({ message: "invalid_url" }).max(1000, { message: "too_long" }),
      z.literal(""),
      z.undefined()
    ]),
    is_indexable: z.boolean().optional(),
  }).optional().nullable();
};

export const getSlugSchema = () => {
  return z
    .string()
    .min(2, { message: "too_short" })
    .max(255, { message: "too_long" })
    .regex(/^[a-z0-9\u0621-\u064A-]+$/, { message: "invalid_slug" });
};

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
    search: z.string().max(255, { message: "too_long" }).optional(),
});
