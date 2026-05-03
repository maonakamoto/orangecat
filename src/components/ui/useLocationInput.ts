'use client';

import { useEffect, useRef, useState } from 'react';
import {
  detectCountryFromZipCode,
  looksLikeZipCode,
  ZIP_CODE_PATTERNS,
} from '@/lib/global-location';
import { searchNominatim, type LocationSuggestion } from '@/lib/nominatim';
import { logger } from '@/utils/logger';
import {
  lookupZipCodeLocation,
  processLocationSuggestion,
  type LocationData,
} from './locationInputHelpers';

export function useLocationInput(
  value: string,
  onChange: (locationData: LocationData | null) => void,
  onFocus?: () => void
) {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [_detectedCountry, setDetectedCountry] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const zipCodeLookupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchTimeRef = useRef<number>(0);
  const currentInputValueRef = useRef<string>(value || '');

  useEffect(() => {
    const newVal = value || '';
    setInputValue(newVal);
    currentInputValueRef.current = newVal;
  }, [value]);

  const handleInputChange = async (newValue: string) => {
    setInputValue(newValue);
    currentInputValueRef.current = newValue;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (zipCodeLookupTimeoutRef.current) {
      clearTimeout(zipCodeLookupTimeoutRef.current);
    }

    if (newValue.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
      return;
    }

    const looksLikeZip = looksLikeZipCode(newValue);
    if (looksLikeZip && newValue.length >= 4) {
      const cleanZip = newValue.replace(/\s/g, '').trim();
      const detectedCountryFromZip = detectCountryFromZipCode(cleanZip);
      if (detectedCountryFromZip) {
        const pattern = ZIP_CODE_PATTERNS[detectedCountryFromZip];
        if (pattern && cleanZip.length === pattern.length) {
          setIsLoading(true);
          const zipLookupValue = newValue;
          zipCodeLookupTimeoutRef.current = setTimeout(async () => {
            const result = await lookupZipCodeLocation(cleanZip, detectedCountryFromZip);
            if (result && currentInputValueRef.current === zipLookupValue) {
              setInputValue(result.formattedAddress);
              currentInputValueRef.current = result.formattedAddress;
              onChange(result);
              setShowSuggestions(false);
              setIsLoading(false);
              return;
            }
            setIsLoading(false);
          }, 300);
        }
      }
    }

    setIsLoading(true);
    const searchValue = newValue;
    searchTimeoutRef.current = setTimeout(async () => {
      const now = Date.now();
      const timeSinceLastSearch = now - lastSearchTimeRef.current;
      if (timeSinceLastSearch < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastSearch));
      }
      lastSearchTimeRef.current = Date.now();
      try {
        const results = await searchNominatim(searchValue, 5);
        if (currentInputValueRef.current === searchValue) {
          setSuggestions(results);
          setShowSuggestions(true);
        }
      } catch (error) {
        logger.error('Nominatim search error:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  const handleSuggestionSelect = (suggestion: LocationSuggestion) =>
    processLocationSuggestion(suggestion, {
      setInputValue,
      setShowSuggestions,
      setIsLoading,
      setDetectedCountry,
      onChange,
    });

  const handleFocus = () => {
    onFocus?.();
    if (inputValue.length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (zipCodeLookupTimeoutRef.current) {
        clearTimeout(zipCodeLookupTimeoutRef.current);
      }
    };
  }, []);

  return {
    inputValue,
    suggestions,
    showSuggestions,
    isLoading,
    inputRef,
    suggestionsRef,
    handleInputChange,
    handleSuggestionSelect,
    handleFocus,
  };
}
