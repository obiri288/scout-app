import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check, Search, X } from 'lucide-react';
import { inputStyle } from '../lib/styles';
import { COUNTRIES } from '../lib/countries';

export const CountryCombobox = ({ value, onChange, placeholder = "Wähle ein Land..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);
    const listboxRef = useRef(null);

    // Current formatted value calculation
    const currentCountryMatch = value ? COUNTRIES.find(c => c.code === value) : null;
    const displayValue = currentCountryMatch 
        ? `${currentCountryMatch.flag} ${currentCountryMatch.name}` 
        : (value || '');

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter logic
    const filteredCountries = COUNTRIES.filter(country => 
        country.name.toLowerCase().includes(search.toLowerCase()) || 
        country.code.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (code) => {
        onChange(code);
        setSearch('');
        setIsOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange('');
        setSearch('');
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div 
                className={`${inputStyle} flex justify-between items-center cursor-pointer pl-10 pr-10`}
                onClick={() => {
                    setIsOpen(!isOpen);
                    setSearch('');
                }}
            >
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Globe size={16} />
                </div>
                
                <span className={`truncate ${displayValue ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {displayValue || placeholder}
                </span>

                {value && (
                    <button 
                        type="button" 
                        onClick={handleClear} 
                        className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                        <X size={14} />
                    </button>
                )}
                
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div 
                    ref={listboxRef}
                    className="absolute z-[9999] w-full mt-1 bg-white dark:bg-zinc-900 border border-border rounded-xl shadow-xl max-h-60 flex flex-col overflow-hidden"
                    style={{
                        // In case of limited screen space, making sure it stays above things
                        boxShadow: "0 10px 40px -10px rgba(0,0,0,0.3)"
                    }}
                >
                    <div className="p-2 border-b border-border bg-slate-50 dark:bg-zinc-900 sticky top-0 z-10">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Land suchen..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-white dark:bg-zinc-800 text-sm border border-border rounded-lg pl-9 pr-3 py-2 text-foreground focus:outline-none focus:border-cyan-500 transition-colors"
                            />
                        </div>
                    </div>
                    
                    <div className="overflow-y-auto overflow-x-hidden flex-1 p-1">
                        {filteredCountries.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                Kein Land gefunden.
                            </div>
                        ) : (
                            filteredCountries.map((country) => {
                                const isSelected = value === country.code;
                                return (
                                    <div
                                        key={country.code}
                                        onClick={() => handleSelect(country.code)}
                                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
                                            isSelected 
                                            ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-bold' 
                                            : 'text-foreground hover:bg-slate-100 dark:hover:bg-zinc-800'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl leading-none">{country.flag}</span>
                                            <span>{country.name}</span>
                                        </div>
                                        {isSelected && <Check size={16} className="text-cyan-500" />}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
