import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { GRADIENTS } from '@/config/gradients';

export default function CauseNotFound() {
  return (
    <div className={`min-h-screen ${GRADIENTS.grayLight} flex items-center justify-center p-4`}>
      <Card className="max-w-lg mx-auto shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <FileQuestion className="w-16 h-16 text-gray-400 dark:text-muted-foreground" />
          </div>
          <CardTitle>Cause Not Found</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-6">
            The cause you are looking for does not exist or may have been removed.
          </p>
          <div className="flex gap-2 justify-center">
            <Link href={ROUTES.HOME}>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Go Home
              </Button>
            </Link>
            <Link href={ROUTES.DISCOVER}>
              <Button>Discover Causes</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
