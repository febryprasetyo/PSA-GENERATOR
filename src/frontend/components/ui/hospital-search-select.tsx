import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/frontend/hooks/useDebounce";
import { Search, Loader2, X } from "lucide-react";

type Client = {
  id: string;
  hospitalName: string;
  city: string | null;
};

interface HospitalSearchSelectProps {
  value: string; // clientId
  onChange: (clientId: string) => void;
  placeholder?: string;
  // If editing, we might need initial name since we only have ID
  initialHospitalName?: string; 
}

export function HospitalSearchSelect({ value, onChange, placeholder = "Ketik nama Rumah Sakit...", initialHospitalName = "" }: HospitalSearchSelectProps) {
  const [query, setQuery] = useState(initialHospitalName);
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedName, setSelectedName] = useState(initialHospitalName);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    // If value changes from outside (e.g. form reset), update query
    if (!value) {
      setQuery("");
      setSelectedName("");
    }
  }, [value]);

  useEffect(() => {
    const fetchHospitals = async () => {
      if (!debouncedQuery && !value) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(debouncedQuery)}&limit=10`);
        const data = await res.json();
        if (data.clients) {
          setResults(data.clients);
        }
      } catch (error) {
        console.error("Error fetching hospitals:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHospitals();
  }, [debouncedQuery]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Revert query to selected name if click outside and nothing new selected
        setQuery(selectedName);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedName]);

  const handleSelect = (client: Client) => {
    setSelectedName(client.hospitalName);
    setQuery(client.hospitalName);
    onChange(client.id);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedName("");
    setQuery("");
    onChange("");
    setIsOpen(true);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? <Loader2 className="h-4 w-4 text-slate-400 animate-spin" /> : <Search className="h-4 w-4 text-slate-400" />}
        </div>
        <input
          type="text"
          value={query}
          onFocus={() => {
            setIsOpen(true);
            if (selectedName) {
              setQuery(""); // clear to allow searching fresh
            }
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (value && e.target.value !== selectedName) {
              onChange(""); // clear selected if typing new
              setSelectedName("");
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-md border border-dashboard-border pl-9 pr-8 py-2 text-sm outline-none transition focus:border-dashboard-primary focus:ring-1 focus:ring-dashboard-primary"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (query.length > 0 || results.length > 0) && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-slate-200 max-h-60 overflow-y-auto">
          {results.length > 0 ? (
            <ul className="py-1">
              {results.map((client) => (
                <li
                  key={client.id}
                  onClick={() => handleSelect(client)}
                  className="px-3 py-2 cursor-pointer hover:bg-slate-50 flex flex-col"
                >
                  <span className="text-sm font-medium text-slate-800">{client.hospitalName}</span>
                  {client.city && <span className="text-xs text-slate-500">{client.city}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-3 text-sm text-slate-500 text-center">
              {isLoading ? "Mencari..." : "Tidak ada hasil ditemukan."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
