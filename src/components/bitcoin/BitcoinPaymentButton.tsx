'use client';

import { useState } from 'react';
import { Bitcoin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PaymentDialog } from '@/components/payment';

interface BitcoinPaymentButtonProps {
  projectId: string;
  projectTitle: string;
}

export default function BitcoinPaymentButton({
  projectId,
  projectTitle,
}: BitcoinPaymentButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="gradient" className="flex items-center gap-2">
        <Bitcoin className="w-4 h-4" />
        Fund with Bitcoin
      </Button>

      <PaymentDialog
        open={open}
        onOpenChange={setOpen}
        entityType="project"
        entityId={projectId}
        entityTitle={projectTitle}
      />
    </>
  );
}
