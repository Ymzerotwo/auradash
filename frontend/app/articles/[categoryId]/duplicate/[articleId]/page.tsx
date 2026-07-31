import { DuplicateArticlePage } from "../../../DuplicateArticlePage";
import { use } from "react";

interface PageProps {
  params: Promise<{ categoryId: string; articleId: string }>;
}

/**
 * Full-page "Duplicate Article" form for a given category and source article.
 * Route: /articles/[categoryId]/duplicate/[articleId]
 */
export default function DuplicateArticleRoute({ params }: PageProps) {
  const unwrappedParams = use(params);
  return (
    <DuplicateArticlePage 
      categoryId={unwrappedParams.categoryId} 
      duplicateFrom={unwrappedParams.articleId} 
    />
  );
}
