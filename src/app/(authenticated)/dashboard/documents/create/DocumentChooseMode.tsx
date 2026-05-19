'use client';

import Link from 'next/link';
import { ArrowLeft, Upload, PenLine, Cat, FileText, Sparkles } from 'lucide-react';
import { ROUTES } from '@/config/routes';

interface Props {
  onUpload: () => void;
  onWrite: () => void;
}

export function DocumentChooseMode({ onUpload, onWrite }: Props) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          href={`${ROUTES.DASHBOARD.CAT}?tab=context`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to My Context
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-md border border-border-subtle bg-muted p-2">
            <Cat className="h-6 w-6 text-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Create Cat Context</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Help your Cat understand you better by adding context about your goals, skills, and
          situation.
        </p>
      </div>

      <div className="mb-8 rounded-md border border-border-subtle bg-muted/30 p-6">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-foreground" />
          <div>
            <h3 className="font-semibold text-foreground">The more context, the better advice</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Share your goals, skills, financial situation, or business plans. Cat uses this to
              tailor advice to your situation.
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <button
          onClick={onUpload}
          className="group relative rounded-md border border-border-subtle bg-background p-8 text-left transition-colors hover:border-border-strong hover:bg-muted/30"
        >
          <div className="absolute right-4 top-4 rounded-sm border border-border-subtle bg-muted px-2 py-1 text-xs font-medium text-foreground">
            Easiest
          </div>
          <div className="mb-4 w-fit rounded-md bg-muted p-4 transition-colors group-hover:bg-muted/80">
            <Upload className="h-8 w-8 text-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Upload a file</h3>
          <p className="text-muted-foreground mb-4">
            Drop a .txt or .md file and we&apos;ll extract the content automatically.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-muted rounded-md text-xs font-medium text-muted-foreground">
              .txt
            </span>
            <span className="px-2 py-1 bg-muted rounded-md text-xs font-medium text-muted-foreground">
              .md
            </span>
          </div>
        </button>

        <button
          onClick={onWrite}
          className="group rounded-md border border-border-subtle bg-background p-8 text-left transition-colors hover:border-border-strong hover:bg-muted/30"
        >
          <div className="mb-4 w-fit rounded-md bg-muted p-4 transition-colors group-hover:bg-muted/80">
            <PenLine className="h-8 w-8 text-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Write from scratch</h3>
          <p className="text-muted-foreground mb-4">
            Type or paste your content directly into the form.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Goals', 'Skills', 'Plans'].map(tag => (
              <span
                key={tag}
                className="px-2 py-1 bg-muted rounded-md text-xs font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </button>
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h4 className="font-medium text-foreground mb-3">Ideas for context to add:</h4>
        <div className="grid md:grid-cols-2 gap-3 text-sm text-muted-foreground">
          {[
            'Your 2026 goals and aspirations',
            'Your skills and expertise',
            'Your financial situation and budget',
            "Business ideas you're working on",
          ].map(idea => (
            <div key={idea} className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-muted-dim mt-0.5 flex-shrink-0" />
              <span>{idea}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
