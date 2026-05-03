import { lookupSwissZipCode, isSwissZipCode, SWISS_CANTONS } from '@/lib/swiss-location';
import { lookupZipCode, getCountryName } from '@/lib/global-location';
import { getNominatimDetails, type LocationSuggestion } from '@/lib/nominatim';
import { logger } from '@/utils/logger';

export interface LocationData {
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

export async function lookupZipCodeLocation(
  zipCode: string,
  country: string
): Promise<LocationData | null> {
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
}

interface SuggestionSetters {
  setInputValue: (v: string) => void;
  setShowSuggestions: (v: boolean) => void;
  setIsLoading: (v: boolean) => void;
  setDetectedCountry: (v: string) => void;
  onChange: (data: LocationData | null) => void;
}

export async function processLocationSuggestion(
  suggestion: LocationSuggestion,
  setters: SuggestionSetters
) {
  const { setInputValue, setShowSuggestions, setIsLoading, setDetectedCountry, onChange } = setters;
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
      onChange({
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
      });
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
}
