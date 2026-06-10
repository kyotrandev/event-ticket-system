'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, MapPin } from 'lucide-react';
import { toast } from 'sonner';

// Dynamically import the map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('./LocationPickerMap'), { 
  ssr: false, 
  loading: () => <div className="h-[300px] w-full bg-muted flex items-center justify-center animate-pulse rounded-md border">Loading map...</div> 
});

interface Props {
  value: string; // The JSON string representing { address, lat, lng } or just address
  onChange: (value: string) => void;
}

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export function LocationPicker({ value, onChange }: Props) {
  const [address, setAddress] = useState(() => {
    if (!value) return '';
    try {
      const parsed = JSON.parse(value);
      return parsed.address || '';
    } catch {
      return value;
    }
  });

  const [position, setPosition] = useState<{lat: number, lng: number} | null>(() => {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      if (parsed.lat && parsed.lng) {
        return { lat: parsed.lat, lng: parsed.lng };
      }
      return null;
    } catch {
      return null;
    }
  });

  const [searchCenter, setSearchCenter] = useState<{lat: number, lng: number} | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleUpdate = (newAddress: string, newPos: {lat: number, lng: number} | null) => {
    setAddress(newAddress);
    setPosition(newPos);
    
    // Save as JSON if we have position, else just the string
    if (newPos) {
      onChange(JSON.stringify({ address: newAddress, lat: newPos.lat, lng: newPos.lng }));
    } else {
      onChange(newAddress);
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    handleUpdate(val, position);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (val.trim().length > 2) {
      timeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`);
          const data = await res.json();
          setSuggestions(data);
          setShowSuggestions(true);
        } catch {
          // ignore
        }
      }, 500); // 500ms debounce
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (s: Suggestion) => {
    const newPos = { lat: parseFloat(s.lat), lng: parseFloat(s.lon) };
    setSearchCenter(newPos);
    handleUpdate(s.display_name, newPos);
    setShowSuggestions(false);
  };

  const handleSearch = async () => {
    if (!address.trim()) return;
    setIsSearching(true);
    setShowSuggestions(false);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const newPos = { lat: parseFloat(first.lat), lng: parseFloat(first.lon) };
        setSearchCenter(newPos);
        handleUpdate(address, newPos);
      } else {
        toast.error('Location not found. Please try a different query or pick manually on the map.');
      }
    } catch {
      toast.error('Failed to search for location.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4 w-full relative">
      <div className="flex gap-2 relative">
        <div className="relative flex-1">
          <Input
            placeholder="Search or enter address name (e.g., Hanoi Opera House)"
            value={address}
            onChange={handleAddressChange}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onBlur={() => {
              // Delay hiding to allow click events on suggestions to fire
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-[300px] overflow-y-auto">
              {suggestions.map((s) => (
                <div 
                  key={s.place_id} 
                  className="px-3 py-2 text-sm hover:bg-muted cursor-pointer flex items-start gap-2"
                  onClick={() => selectSuggestion(s)}
                >
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="line-clamp-2">{s.display_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button type="button" variant="secondary" onClick={handleSearch} disabled={isSearching || !address.trim()}>
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>
      <div className="rounded-md overflow-hidden border relative z-0">
        <Map position={position} searchCenter={searchCenter} onPositionChange={(pos) => handleUpdate(address, pos)} />
      </div>
      {position && (
        <p className="text-xs text-muted-foreground mt-2">
          Selected coordinates: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}
