"use client";

import React, { use } from "react";
import { ArticleFormPage } from "../../../ArticleFormPage";
import { useQuery } from "@tanstack/react-query";
import { ArticleService } from "@/lib/services/article.service";
import { Loader2 } from "lucide-react";

interface PageProps {
  params: Promise<{ categoryId: string; id: string }>;
}

export default function EditArticlePage({ params }: PageProps) {
  const unwrappedParams = use(params);
  
  const { data: article, isLoading } = useQuery({
    queryKey: ["articles", "detail", unwrappedParams.id],
    queryFn: () => ArticleService.getById(unwrappedParams.id),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-text-muted">Article not found.</p>
      </div>
    );
  }

  return <ArticleFormPage categoryId={unwrappedParams.categoryId} article={article as any} />;
}
