'use client';

import { useEffect, useRef, useState } from 'react';
import { lookupSwissZipCode, isSwissZipCode, SWISS_CANTONS } from '@/lib/swiss-location';
import {
  lookupZipCode,
  detectCountryFromZipCode,
  looksLikeZipCode,
  getCountryName,
  ZIP_CODE_PATTERNS,
} from '@/lib/global-location';
import { searchNominatim, getNominatimDetails, LocationSuggestion } from '@/lib/nominatim';
import { logger } from '@/utils/logger';

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

  const handleZipCodeLookup = async (
    zipCode: string,
    country: string
  ): Promise<LocationData | null> => {
    try {
      if (country === 'CH' && isSwissZipCode(zipCode)) {
        const swissLocation = await lookupSwissZipCode(zipCode);
        if (swissLocation) {
          return {
            country: swissLocation.country,
            city: swissLocation.city,
            zipCode,
            canton: swissLocation.canton,
            cantonCode: swissLocation.cantonCode,
            formattedAddress: `${swissLocation.city}, ${swissLocation.canton}, Switzerland`,
          };
        }
      }

      const location = await lookupZipCode(zipCode, country);
      if (location) {
        const formatted = location.state
          ? `${location.city}, ${location.state}, ${getCountryName(location.country)}`
          : `${location.city}, ${getCountryName(location.country)}`;

        return {
          country: location.country,
          city: location.city,
          zipCode: location.zipCode,
          state: location.state,
          stateCode: location.stateCode,
          formattedAddress: formatted,
        };
      }
    } catch (error) {
      logger.error('Zip code lookup error:', error);
    }

    return null;
  };

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
            const result = await handleZipCodeLookup(cleanZip, detectedCountryFromZip);
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

  const handleSuggestionSelect = async (suggestion: LocationSuggestion) => {
    setInputValue(suggestion.displayName);
    setShowSuggestions(false);
    setIsLoading(true);

    try {
      const details = await getNominatimDetails(suggestion.placeId);

      if (details) {
        let canton: string | undefined;
        let cantonCode: string | undefined;
        if (details.country === 'CH') {
          const stateMatch = details.formattedAddress.match(
            /\b(ZH|BE|LU|UR|SZ|OW|NW|GL|ZG|FR|SO|BS|BL|SH|AR|AI|SG|GR|AG|TG|TI|VD|VS|NE|GE|JU)\b/
          );
          if (stateMatch) {
            cantonCode = stateMatch[1];
            canton = SWISS_CANTONS[cantonCode]?.nameEn || cantonCode;
          } else if (details.state) {
            for (const [code, cantonData] of Object.entries(SWISS_CANTONS)) {
              if (
                cantonData.nameEn.toLowerCase() === details.state.toLowerCase() ||
                cantonData.name.toLowerCase() === details.state.toLowerCase()
              ) {
                cantonCode = code;
                canton = cantonData.nameEn;
                break;
              }
            }
          }
        }

        const locationData: LocationData = {
          country: details.country,
          city: details.city,
          zipCode: details.zipCode,
          state: details.state,
          stateCode: details.stateCode,
          canton,
          cantonCode,
          latitude: details.latitude || suggestion.lat,
          longitude: details.longitude || suggestion.lon,
          formattedAddress: details.formattedAddress,
        };

        onChange(locationData);
        setDetectedCountry(details.country);
      } else {
        onChange({
          country: '',
          city: suggestion.mainText,
          zipCode: '',
          formattedAddress: suggestion.displayName,
          latitude: suggestion.lat,
          longitude: suggestion.lon,
        });
      }
    } catch (error) {
      logger.error('Location details error:', error);
      onChange({
        country: '',
        city: suggestion.mainText,
        zipCode: '',
        formattedAddress: suggestion.displayName,
      });
    } finally {
      setIsLoading(false);
    }
  };

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
