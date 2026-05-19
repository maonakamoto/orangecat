'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Edit3, MessageSquare, LucideIcon } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useProjectStore } from '@/stores/projectStore';
import DraftContinueDialog from './DraftContinueDialog';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/config/routes';
import {
  getEntitiesForCreateMenu,
  COLOR_CLASSES,
  type EntityMetadata,
  type EntityCategory,
} from '@/config/entity-registry';

interface SmartCreateButtonProps {
  children?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient';
  showIcon?: boolean;
  fullWidth?: boolean;
  forceNewProject?: boolean;
}

export interface CreateOption {
  name: string;
  description: string;
  href: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  category: EntityCategory | 'content';
}

function generateCreateOptions(): CreateOption[] {
  const postOption: CreateOption = {
    name: 'Post',
    description: 'Share an update on your timeline',
    href: '/timeline?compose=true',
    icon: MessageSquare,
    color: 'text-foreground',
    bgColor: 'bg-muted',
    category: 'content',
  };

  const entityOptions: CreateOption[] = getEntitiesForCreateMenu().map((entity: EntityMetadata) => {
    const colors = COLOR_CLASSES[entity.colorTheme];
    return {
      name: entity.name,
      description: entity.createActionLabel,
      href: entity.createPath,
      icon: entity.icon,
      color: colors.text,
      bgColor: colors.bg,
      category: entity.category,
    };
  });

  return [postOption, ...entityOptions];
}

export const CREATE_OPTIONS = generateCreateOptions();

export function shouldShowDivider(current: CreateOption, next: CreateOption | undefined): boolean {
  if (!next) {
    return false;
  }
  return current.category !== next.category;
}

export default function SmartCreateButton({
  children,
  className = '',
  size = 'md',
  variant = 'primary',
  showIcon = true,
  fullWidth = false,
  forceNewProject = false,
}: SmartCreateButtonProps) {
  const router = useRouter();
  const { drafts } = useProjectStore();
  const [showDraftDialog, setShowDraftDialog] = useState(false);

  const hasAnyDraft = drafts.length > 0;
  const primaryDraft = hasAnyDraft ? drafts[0] : null;
  const shouldShowDraftPrompt = hasAnyDraft && !forceNewProject;

  const handleClick = () => {
    if (shouldShowDraftPrompt) {
      setShowDraftDialog(true);
    } else {
      router.push(ROUTES.PROJECTS.CREATE);
    }
  };

  const handleContinueDraft = () => {
    setShowDraftDialog(false);
    router.push(ROUTES.PROJECTS.CREATE);
  };

  const handleStartFresh = () => {
    setShowDraftDialog(false);
    router.push(`${ROUTES.PROJECTS.CREATE}?new=true`);
  };

  const getButtonContent = () => {
    if (shouldShowDraftPrompt && primaryDraft) {
      return (
        <>
          {showIcon && <Edit3 className="w-4 h-4 mr-2" />}
          {children || (primaryDraft.isDraft ? 'Continue Project' : 'Complete Project')}
        </>
      );
    }
    return (
      <>
        {showIcon && <Plus className="w-4 h-4 mr-2" />}
        {children || 'Create Project'}
      </>
    );
  };

  const getButtonClassName = () => {
    if (shouldShowDraftPrompt) {
      return variant === 'outline'
        ? 'border-border-strong text-foreground hover:bg-muted'
        : variant === 'ghost'
          ? 'text-foreground hover:bg-muted'
          : 'bg-foreground text-background hover:bg-foreground/90';
    }
    return '';
  };

  return (
    <>
      <Button
        onClick={handleClick}
        className={`${getButtonClassName()} ${fullWidth ? 'w-full' : ''} ${className}`}
        size={size}
        variant={variant}
      >
        {getButtonContent()}
      </Button>

      <DraftContinueDialog
        isOpen={showDraftDialog}
        onClose={() => setShowDraftDialog(false)}
        onContinueDraft={handleContinueDraft}
        onStartFresh={handleStartFresh}
      />
    </>
  );
}

export function MobileCreateButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-md',
          'bg-foreground text-background hover:bg-foreground/90',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
        )}
        aria-label="Create new"
      >
        <Plus className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setIsOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-md border-t border-border-subtle bg-background p-4 pb-8 animate-slide-up"
            onClick={e => e.stopPropagation()}
            style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
          >
            <div className="mx-auto mb-4 h-1 w-12 rounded-sm bg-muted-foreground/20" />
            <h3 className="text-lg font-semibold text-foreground mb-4 px-2">Create New</h3>
            <div className="grid grid-cols-3 gap-2">
              {CREATE_OPTIONS.map(option => (
                <div key={option.name} className="contents">
                  <Link
                    href={option.href}
                    onClick={() => setIsOpen(false)}
                    className="flex flex-col items-center gap-1.5 rounded-md border border-border-subtle p-3 transition-colors hover:border-border-strong hover:bg-muted"
                  >
                    <div className="oc-icon-tile h-10 w-10">
                      <option.icon className={cn('w-5 h-5', option.color)} />
                    </div>
                    <span className="text-xs font-medium text-foreground text-center">
                      {option.name}
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function DashboardCreateButton({ className = '' }: { className?: string }) {
  const { drafts } = useProjectStore();
  const hasAnyDraft = drafts.length > 0;

  return (
    <SmartCreateButton
      className={cn(
        'min-h-11',
        hasAnyDraft ? 'bg-tiffany-600 text-white hover:bg-tiffany-700' : '',
        className
      )}
      size="lg"
      fullWidth={true}
    />
  );
}

export function NewProjectButton({
  children,
  className = '',
  ...props
}: Omit<SmartCreateButtonProps, 'forceNewProject'>) {
  return (
    <SmartCreateButton {...props} forceNewProject={true} className={className}>
      {children || 'Start New Project'}
    </SmartCreateButton>
  );
}
