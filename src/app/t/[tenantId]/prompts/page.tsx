import { Suspense } from 'react';
import { getUserPermissions, getPrompts, getPromptCategories } from '@/server/actions/prompts';
import { PromptsPageClient } from '@/components/prompts/prompts-page-client';

interface PromptsPageProps {
  params: {
    tenantId: string;
  };
}

export default async function PromptsPage({ params }: PromptsPageProps) {
  const { tenantId } = params;

  try {
    const [permissions, prompts, categories] = await Promise.all([
      getUserPermissions(tenantId),
      getPrompts(tenantId),
      getPromptCategories(tenantId),
    ]);

    return (
      <div className="container mx-auto py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Prompts</h1>
              <p className="text-muted-foreground">
                Manage and use pre-defined prompts for your AI interactions
              </p>
            </div>
          </div>

          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          }>
            <PromptsPageClient
              tenantId={tenantId}
              initialPrompts={prompts}
              initialCategories={categories}
              permissions={permissions}
            />
          </Suspense>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading prompts page:', error);
    return (
      <div className="container mx-auto py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Prompts</h1>
              <p className="text-muted-foreground">
                Manage and use pre-defined prompts for your AI interactions
              </p>
            </div>
          </div>
          
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">Failed to load prompts</p>
            <p className="text-muted-foreground text-sm">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
          </div>
        </div>
      </div>
    );
  }
} 