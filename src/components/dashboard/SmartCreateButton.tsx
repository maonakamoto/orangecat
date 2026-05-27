'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit3, MessageSquare, LucideIcon } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useProjectStore } from '@/stores/projectStore';
import DraftContinueDialog from './DraftContinueDialog';
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
