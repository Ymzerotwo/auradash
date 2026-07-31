/**
 * AuraDash Pagination
 * This file contains utility functions to handle pagination across the application.
 * It provides standardized interfaces and helpers to parse pagination parameters
 * safely and execute paginated database queries efficiently.
 */

/**
 * Interface representing the standardized pagination parameters requested by the client.
 */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Interface representing the standardized paginated response format returned to the client.
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Parses and sanitizes pagination query parameters from the request.
 * Purpose: Ensures valid integer values for page and limit, and enforces a MAX_LIMIT 
 * to prevent clients from requesting massive datasets that could exhaust database 
 * memory or timeout the server.
 * 
 * @param pageQuery The page number as a string (from query params)
 * @param limitQuery The limit per page as a string (from query params)
 * @param defaultLimit The default limit if none is provided
 * @returns Cleaned and validated PaginationOptions object
 */
export const getPaginationOptions = (
  pageQuery?: string | null,
  limitQuery?: string | null,
  defaultLimit = 25
): PaginationOptions => {
  const MAX_LIMIT = 100; // Hard cap on maximum rows per request

  let page = parseInt(pageQuery || '', 10);
  if (isNaN(page)) page = 1;
  page = Math.max(1, page); // Ensure page is never 0 or negative

  let limit = parseInt(limitQuery || '', 10);
  if (isNaN(limit)) limit = defaultLimit;
  limit = Math.min(MAX_LIMIT, Math.max(1, limit));

  return { page, limit };
};

/**
 * Executes a paginated database query alongside a total count query.
 * Purpose: Safely appends LIMIT and OFFSET to the base query, executes both the 
 * paginated query and the total count query concurrently for better latency, 
 * and formats the output into a standardized PaginatedResult.
 * 
 * @param db The database connection instance (e.g., Cloudflare D1)
 * @param baseQuery The base SQL query string without LIMIT/OFFSET
 * @param countQuery The SQL query string to count the total records
 * @param params The array of parameters to bind to the SQL queries
 * @param options The pagination options (page and limit)
 * @returns A promise resolving to the standardized paginated result
 */
export const paginateQuery = async <T>(
  db: any,
  baseQuery: string,
  countQuery: string,
  params: any[],
  options: PaginationOptions
): Promise<PaginatedResult<T>> => {
  const { page, limit } = options;
  const offset = (page - 1) * limit;
  const safeBaseQuery = baseQuery.replace(/;+\s*$/, '');
  const paginatedQuery = `${safeBaseQuery} LIMIT ? OFFSET ?`;
  const countParams = [...params];
  const queryParams = [...params, limit, offset];
  const [results, countResult] = await Promise.all([
    db.prepare(paginatedQuery).bind(...queryParams).all(),
    db.prepare(countQuery).bind(...countParams).first()
  ]);

  const total = (countResult?.total as number) || (countResult?.count as number) || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data: (results?.results || []) as T[],
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  };
};
