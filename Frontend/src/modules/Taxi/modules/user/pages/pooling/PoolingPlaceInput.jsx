import React, { useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppGoogleMapsLoader, HAS_VALID_GOOGLE_MAPS_KEY } from '../../../admin/utils/googleMaps';

/**
 * Google Places autocomplete that resolves the chosen place to coordinates.
 * value / onChange use { label, lat, lng } (or null while nothing is selected).
 */
const PoolingPlaceInput = ({ value, onChange, placeholder, accentClass = 'text-indigo-500', allowCurrentLocation = false }) => {
  const { isLoaded } = useAppGoogleMapsLoader();
  const [query, setQuery] = useState(value?.label || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const containerRef = useRef(null);
  const serviceRef = useRef(null);
  const tokenRef = useRef(null);

  // Keep the text in sync when the parent sets / swaps the place (a cleared value keeps what the user typed).
  useEffect(() => {
    if (value?.label) setQuery(value.label);
  }, [value?.label]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!open || trimmed.length < 3 || !isLoaded || !window.google?.maps?.places?.AutocompleteService) {
      setSuggestions([]);
      return undefined;
    }
    // The selected place's own label should not re-trigger a search.
    if (value?.label && trimmed === value.label) return undefined;

    let active = true;
    const timer = setTimeout(() => {
      serviceRef.current = serviceRef.current || new window.google.maps.places.AutocompleteService();
      tokenRef.current = tokenRef.current || new window.google.maps.places.AutocompleteSessionToken();

      serviceRef.current.getPlacePredictions(
        { input: trimmed, componentRestrictions: { country: 'in' }, sessionToken: tokenRef.current },
        (predictions, status) => {
          if (!active) return;
          setSuggestions(status === 'OK' && Array.isArray(predictions) ? predictions : []);
        },
      );
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, open, isLoaded, value?.label]);

  const selectPrediction = (prediction) => {
    if (!window.google?.maps?.Geocoder) return;
    setOpen(false);
    setQuery(prediction.description);
    tokenRef.current = null;

    new window.google.maps.Geocoder().geocode({ placeId: prediction.place_id }, (results, status) => {
      const location = results?.[0]?.geometry?.location;
      if (status !== 'OK' || !location) {
        toast.error("Couldn't find that place. Please try another one.");
        return;
      }
      onChange({ label: prediction.description, lat: location.lat(), lng: location.lng() });
    });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not supported on this device');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point = { lat: coords.latitude, lng: coords.longitude };
        if (!window.google?.maps?.Geocoder) {
          setLocating(false);
          onChange({ label: 'Current location', ...point });
          return;
        }
        new window.google.maps.Geocoder().geocode({ location: point }, (results, status) => {
          setLocating(false);
          onChange({ label: status === 'OK' && results?.[0] ? results[0].formatted_address : 'Current location', ...point });
        });
      },
      () => {
        setLocating(false);
        toast.error('Could not get your location. Please type it instead.');
      },
      { enableHighAccuracy: true },
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className={`absolute left-4 top-1/2 z-10 -translate-y-1/2 ${accentClass}`}>
        <MapPin size={20} />
      </div>
      <input
        type="text"
        value={query}
        placeholder={HAS_VALID_GOOGLE_MAPS_KEY ? placeholder : 'Maps key missing'}
        disabled={!HAS_VALID_GOOGLE_MAPS_KEY}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          // Typing again invalidates the previously resolved coordinates.
          if (value) onChange(null);
        }}
        className={`w-full rounded-[24px] bg-slate-50 py-5 pl-12 text-sm font-black text-slate-900 outline-none transition focus:ring-4 focus:ring-indigo-50 border border-transparent focus:border-indigo-100 ${allowCurrentLocation ? 'pr-14' : 'pr-4'}`}
      />
      {allowCurrentLocation ? (
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          aria-label="Use current location"
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm active:scale-90 disabled:opacity-50"
        >
          <LocateFixed size={18} className={locating ? 'animate-pulse' : ''} />
        </button>
      ) : null}

      {open && suggestions.length > 0 ? (
        <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
          {suggestions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => selectPrediction(prediction)}
              className="flex w-full flex-col items-start border-b border-slate-50 px-5 py-4 text-left last:border-0 hover:bg-slate-50"
            >
              <span className="w-full truncate text-sm font-black text-slate-900">
                {prediction.structured_formatting?.main_text || prediction.description}
              </span>
              <span className="w-full truncate text-[11px] font-semibold text-slate-400">
                {prediction.structured_formatting?.secondary_text || ''}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default PoolingPlaceInput;
