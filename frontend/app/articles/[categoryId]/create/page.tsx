import { ArticleFormPage } from "../../ArticleFormPage";

import { use } from "react";

interface PageProps {
  params: Promise<{ categoryId: string }>;
}

/**
 * Full-page "Create Article" form for a given category.
 * Route: /articles/[categoryId]/create
 */
export default function CreateArticlePage({ params }: PageProps) {
  const unwrappedParams = use(params);
  return <ArticleFormPage categoryId={unwrappedParams.categoryId} />;
}
