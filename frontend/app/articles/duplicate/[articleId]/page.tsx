import { DuplicateArticlePage } from "../../DuplicateArticlePage";
import { use } from "react";

interface PageProps {
  params: Promise<{ articleId: string }>;
}

/**
 * Full-page "Duplicate Article" form for a global source article.
 * Route: /articles/duplicate/[articleId]
 */
export default function DuplicateGlobalArticleRoute({ params }: PageProps) {
  const unwrappedParams = use(params);
  return (
    <DuplicateArticlePage 
      duplicateFrom={unwrappedParams.articleId} 
    />
  );
}
