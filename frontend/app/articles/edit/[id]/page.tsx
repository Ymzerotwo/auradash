"use client";

import React, { use } from "react";
import { ArticleFormPage } from "../../ArticleFormPage";
import { useQuery } from "@tanstack/react-query";
import { ArticleService } from "@/lib/services/article.service";
import { Loader2 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditGlobalArticlePage({ params }: PageProps) {
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

  return <ArticleFormPage article={article as any} />;
}
