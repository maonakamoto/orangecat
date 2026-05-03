'use client';

import { Input } from './Input';
import { MapPin } from 'lucide-react';
import { useLocationInput } from './useLocationInput';

interface LocationData {
  country: string;
  city: string;
  zipCode: string;
  state?: string;
  stateCode?: string;
  canton?: string;
  cantonCode?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress: string;
}

interface LocationInputProps {
  value: string;
  onChange: (locationData: LocationData | null) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
}

export function LocationInput({
  value,
  onChange,
  placeholder = 'Type your city or address...',
  className,
  onFocus,
}: LocationInputProps) {
  const {
    inputValue,
    suggestions,
    showSuggestions,
    isLoading,
    inputRef,
    suggestionsRef,
    handleInputChange,
    handleSuggestionSelect,
    handleFocus,
  } = useLocationInput(value, onChange, onFocus);

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className={className}
          onFocus={handleFocus}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {isLoading && (
            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          )}
          <MapPin className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map(suggestion => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSuggestionSelect(suggestion)}
              className="w-full px-4 py-3 min-h-[44px] text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-gray-50"
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{suggestion.mainText}</div>
                  {suggestion.secondaryText && (
                    <div className="text-sm text-gray-600 truncate">{suggestion.secondaryText}</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showSuggestions && inputValue.length >= 2 && suggestions.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="text-sm text-gray-600 text-center">
            No locations found. Try typing a city name or address.
          </div>
        </div>
      )}
    </div>
  );
}
