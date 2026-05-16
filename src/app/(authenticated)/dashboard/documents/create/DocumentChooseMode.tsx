'use client';

import Link from 'next/link';
import { ArrowLeft, Upload, PenLine, Cat, FileText, Sparkles } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { GRADIENTS } from '@/config/gradients';

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
          className="inline-flex items-center text-sm text-muted-foreground hover:text-gray-900 dark:hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to My Context
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 ${GRADIENTS.brandTiffanyBr} rounded-xl`}>
            <Cat className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Create Context for My Cat</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Help My Cat understand you better by adding context about your goals, skills, and
          situation.
        </p>
      </div>

      <div
        className={`${GRADIENTS.sectionTiffanyMuted} border border-tiffany-200 rounded-xl p-6 mb-8`}
      >
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-tiffany-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-tiffany-900">The more context, the better advice</h3>
            <p className="text-sm text-tiffany-700 mt-1">
              Share your goals, skills, financial situation, or business plans. My Cat uses this to
              give you personalized advice tailored to your unique situation.
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <button
          onClick={onUpload}
          className="group relative bg-card border-2 border-border rounded-2xl p-8 text-left hover:border-tiffany-400 dark:hover:border-tiffany-500 hover:shadow-lg transition-all duration-200"
        >
          <div className="absolute top-4 right-4 px-2 py-1 bg-tiffany-100 text-tiffany-700 text-xs font-medium rounded-full">
            Easiest
          </div>
          <div className="p-4 bg-tiffany-100 rounded-xl w-fit mb-4 group-hover:bg-tiffany-200 transition-colors">
            <Upload className="h-8 w-8 text-tiffany-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Upload a file</h3>
          <p className="text-muted-foreground mb-4">
            Drop a .txt or .md file and we&apos;ll extract the content automatically.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-gray-100 dark:bg-muted rounded-md text-xs font-medium text-muted-foreground">
              .txt
            </span>
            <span className="px-2 py-1 bg-gray-100 dark:bg-muted rounded-md text-xs font-medium text-muted-foreground">
              .md
            </span>
          </div>
        </button>

        <button
          onClick={onWrite}
          className="group bg-card border-2 border-border rounded-2xl p-8 text-left hover:border-tiffany-400 dark:hover:border-tiffany-500 hover:shadow-lg transition-all duration-200"
        >
          <div className="p-4 bg-orange-100 rounded-xl w-fit mb-4 group-hover:bg-orange-200 transition-colors">
            <PenLine className="h-8 w-8 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Write from scratch</h3>
          <p className="text-muted-foreground mb-4">
            Type or paste your content directly into the form.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Goals', 'Skills', 'Plans'].map(tag => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 dark:bg-muted rounded-md text-xs font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </button>
      </div>

      <div className="mt-8 p-4 bg-gray-50 dark:bg-muted rounded-xl">
        <h4 className="font-medium text-foreground mb-3">Ideas for context to add:</h4>
        <div className="grid md:grid-cols-2 gap-3 text-sm text-muted-foreground">
          {[
            'Your 2026 goals and aspirations',
            'Your skills and expertise',
            'Your financial situation and budget',
            "Business ideas you're working on",
          ].map(idea => (
            <div key={idea} className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-gray-400 dark:text-muted-foreground mt-0.5 flex-shrink-0" />
              <span>{idea}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
