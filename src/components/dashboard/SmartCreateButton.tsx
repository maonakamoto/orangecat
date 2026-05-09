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
import { GRADIENTS } from '@/config/gradients';

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
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
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
        ? 'border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400'
        : variant === 'ghost'
          ? 'text-blue-700 hover:text-blue-800 hover:bg-blue-50'
          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg';
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
          'flex items-center justify-center w-12 h-12 rounded-full',
          `${GRADIENTS.brandMixed} text-white shadow-lg`,
          'hover:from-orange-600 hover:to-tiffany-600',
          'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2'
        )}
        aria-label="Create new"
      >
        <Plus className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setIsOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
            style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
          >
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-4 px-2">Create New</h3>
            <div className="grid grid-cols-3 gap-2">
              {CREATE_OPTIONS.map(option => (
                <div key={option.name} className="contents">
                  <Link
                    href={option.href}
                    onClick={() => setIsOpen(false)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 transition-colors"
                  >
                    <div className={cn('p-2.5 rounded-xl', option.bgColor)}>
                      <option.icon className={cn('w-5 h-5', option.color)} />
                    </div>
                    <span className="text-xs font-medium text-gray-900 text-center">
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
      className={`${hasAnyDraft ? GRADIENTS.brandTiffanyDark : GRADIENTS.btnPrimary} min-h-11 ${className}`}
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
