import { TrendingUp, Shield, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GRADIENTS } from '@/config/gradients';

export function AuthHeroPanel() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-12 bg-card border-r border-border">
      <div className="max-w-lg text-center lg:text-left">
        {/* Logo */}
        <div className="mb-8 flex justify-center lg:justify-start">
          <div
            className={cn(
              GRADIENTS.brandTiffanyBr,
              'w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-lg'
            )}
          >
            🐾
          </div>
        </div>

        <h1 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground leading-tight">
          Your AI
          <span className="block text-tiffany-600">Economic Agent</span>
        </h1>

        <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
          Fund, lend, invest, trade, and govern — with any identity, any currency, any counterparty.
          No gatekeepers.
        </p>

        {/* Feature highlights */}
        <div className="space-y-4">
          <div className="flex items-center justify-center lg:justify-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-tiffany-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-tiffany-600" />
            </div>
            <span className="text-lg text-gray-700 dark:text-foreground font-medium">
              Full Economic Spectrum
            </span>
          </div>
          <div className="flex items-center justify-center lg:justify-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <Globe className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-lg text-gray-700 dark:text-foreground font-medium">
              Any Currency, Any Identity
            </span>
          </div>
          <div className="flex items-center justify-center lg:justify-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Shield className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-lg text-gray-700 dark:text-foreground font-medium">
              Pseudonymous by Default
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
