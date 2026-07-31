/**
 * ==========================================
 *        AuraDash Public Articles Routes
 * ==========================================
 * 
 * Defines public routing endpoints for Articles operations.
 */

import { Hono } from 'hono';
import { PublicArticlesController } from '../controllers/public-articles.controller';
import { AppContext } from '../types';

const publicArticlesRoutes = new Hono<AppContext>();

/**
 * GET /api/public/articles/all
 * Retrieves all articles (including category-linked ones).
 */
publicArticlesRoutes.get('/articles/all', PublicArticlesController.getAllArticlesIncludingLinked);

/**
 * GET /api/public/articles
 * Retrieves paginated list of public articles.
 */
publicArticlesRoutes.get('/articles', PublicArticlesController.getArticles);

/**
 * GET /api/public/articles/count
 * Retrieves the total count of active articles.
 */
publicArticlesRoutes.get('/articles/count', PublicArticlesController.getArticlesCount);

/**
 * GET /api/public/articles/count/all
 * Retrieves the count of all articles.
 */
publicArticlesRoutes.get('/articles/count/all', PublicArticlesController.getAllArticlesCount);

/**
 * GET /api/public/articles/:slug
 * Retrieves details of a public article by its unique slug.
 */
publicArticlesRoutes.get('/articles/:slug', PublicArticlesController.getArticleBySlug);

/**
 * GET /api/public/articles/:slug/comments
 * Retrieves public comments associated with a specific article.
 */
publicArticlesRoutes.get('/articles/:slug/comments', PublicArticlesController.getArticleComments);

/**
 * GET /api/public/article-categories
 * Lists all public article categories.
 */
publicArticlesRoutes.get('/article-categories', PublicArticlesController.getArticleCategories);

/**
 * GET /api/public/article-categories/count
 * Retrieves the total count of active article categories.
 */
publicArticlesRoutes.get('/article-categories/count', PublicArticlesController.getArticleCategoriesCount);

/**
 * GET /api/public/article-categories/:slug
 * Retrieves details of a specific article category by slug.
 */
publicArticlesRoutes.get('/article-categories/:slug', PublicArticlesController.getArticleCategoryBySlug);

/**
 * GET /api/public/article-categories/:slug/articles/count
 * Retrieves the article count for a category.
 */
publicArticlesRoutes.get('/article-categories/:slug/articles/count', PublicArticlesController.getCategoryArticlesCount);

/**
 * GET /api/public/article-categories/:slug/articles
 * Lists all public articles belonging to a specific category.
 */
publicArticlesRoutes.get('/article-categories/:slug/articles', PublicArticlesController.getArticlesByCategory);

export default publicArticlesRoutes;
