'use client';

import { Shield, Wallet, Package, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DEFAULT_CURRENCY } from '@/config/currencies';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/config/routes';
import { useCollateralSelector } from './useCollateralSelector';

export interface CollateralItem {
  id: string;
  type: 'asset' | 'wallet';
  name: string;
  value: number;
  currency: string;
  metadata?: {
    verification_status?: string;
    balance_btc?: number;
  };
}

interface CollateralSelectorProps {
  selectedCollateral: CollateralItem[];
  onCollateralChange: (items: CollateralItem[]) => void;
  loanAmount?: number;
  loanCurrency?: string;
  disabled?: boolean;
}

export function CollateralSelector({
  selectedCollateral,
  onCollateralChange,
  loanAmount,
  loanCurrency = DEFAULT_CURRENCY,
  disabled = false,
}: CollateralSelectorProps) {
  const { profile } = useAuth();
  const { formatAmountBtc: formatAmount } = useDisplayCurrency();

  const {
    assets,
    wallets,
    loading,
    showAssetSelector,
    showWalletSelector,
    totalCollateral,
    coveragePercentage,
    handleAddAsset,
    handleAddWallet,
    handleRemoveCollateral,
    toggleAssetSelector,
    toggleWalletSelector,
  } = useCollateralSelector({
    profileId: profile?.id,
    selectedCollateral,
    onCollateralChange,
    loanAmount,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Collateral (Optional)
        </CardTitle>
        <CardDescription>
          Add assets or wallets as collateral to potentially improve loan terms. Higher collateral
          value may result in better interest rates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedCollateral.length > 0 && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Total Collateral Value</span>
              <span className="text-lg font-bold text-gray-900">
                {totalCollateral.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                {loanCurrency}
              </span>
            </div>
            {loanAmount && coveragePercentage !== null && (
              <>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all',
                        coveragePercentage >= 100
                          ? 'bg-green-500'
                          : coveragePercentage >= 50
                            ? 'bg-yellow-500'
                            : 'bg-orange-500'
                      )}
                      style={{ width: `${Math.min(100, coveragePercentage)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 font-medium">
                    {coveragePercentage.toFixed(0)}% coverage
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs">
                  {coveragePercentage >= 100 ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                      <span className="text-green-700">Collateral fully covers loan amount</span>
                    </>
                  ) : coveragePercentage >= 50 ? (
                    <>
                      <AlertCircle className="w-3 h-3 text-yellow-600" />
                      <span className="text-yellow-700">Partial collateral coverage</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-orange-600" />
                      <span className="text-orange-700">Low collateral coverage</span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {selectedCollateral.length > 0 && (
          <div className="space-y-2">
            {selectedCollateral.map(item => (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center',
                      item.type === 'asset'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    )}
                  >
                    {item.type === 'asset' ? (
                      <Package className="w-4 h-4" />
                    ) : (
                      <Wallet className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.type === 'asset' ? 'Asset' : 'Wallet'}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-500">
                      {item.value.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      {item.currency}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveCollateral(item.id)}
                  disabled={disabled}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={toggleAssetSelector}
            disabled={disabled || loading}
            className="flex-1"
          >
            <Package className="w-4 h-4 mr-2" />
            Add Asset
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={toggleWalletSelector}
            disabled={disabled || loading}
            className="flex-1"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Add Wallet
          </Button>
        </div>

        {showAssetSelector && (
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Select Asset</h4>
            {loading ? (
              <p className="text-base text-gray-500">Loading assets...</p>
            ) : assets.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-base text-gray-500 mb-2">No assets available</p>
                <a
                  href={ROUTES.DASHBOARD.ASSETS_CREATE}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Create an asset
                </a>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {assets
                  .filter(
                    asset => !selectedCollateral.some(c => c.id === asset.id && c.type === 'asset')
                  )
                  .map(asset => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => handleAddAsset(asset)}
                      className="w-full text-left p-2 hover:bg-gray-50 rounded border border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{asset.title}</span>
                        {asset.estimated_value && (
                          <span className="text-xs text-gray-500">
                            {asset.estimated_value.toLocaleString()}{' '}
                            {asset.currency || DEFAULT_CURRENCY}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {showWalletSelector && (
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Select Wallet</h4>
            {loading ? (
              <p className="text-base text-gray-500">Loading wallets...</p>
            ) : wallets.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-base text-gray-500 mb-2">No wallets available</p>
                <a
                  href={ROUTES.DASHBOARD.WALLETS_CREATE}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Create a wallet
                </a>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {wallets
                  .filter(
                    wallet =>
                      !selectedCollateral.some(c => c.id === wallet.id && c.type === 'wallet')
                  )
                  .map(wallet => (
                    <button
                      key={wallet.id}
                      type="button"
                      onClick={() => handleAddWallet(wallet)}
                      className="w-full text-left p-2 hover:bg-gray-50 rounded border border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{wallet.label}</span>
                        {wallet.balance_btc && (
                          <span className="text-xs text-gray-500">
                            {formatAmount(wallet.balance_btc)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
