import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, User, Shield, MapPin, Loader2, ChevronRight, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cardStyle } from '../lib/styles';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Simple geocoding cache to avoid repeated requests
const geoCache = {};

const geocodeCity = async (city) => {
    if (!city) return null;
    const key = city.toLowerCase().trim();
    if (geoCache[key]) return geoCache[key];

    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ', Deutschland')}&format=json&limit=1`);
        const data = await res.json();
        if (data && data.length > 0) {
            const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            geoCache[key] = result;
            return result;
        }
    } catch (e) {
        console.warn("Geocoding failed for:", city, e);
    }
    return null;
};

export const MapScreen = ({ onClose, onUserClick }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markersRef = useRef([]);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [geocodingProgress, setGeocodingProgress] = useState('');
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [posFilter, setPosFilter] = useState('Alle');
    const [statusFilter, setStatusFilter] = useState('Alle');

    // Load players with city
    useEffect(() => {
        const load = async () => {
            try {
                let q = supabase.from('players_master').select('*, clubs(*)').not('city', 'is', null);
                if (posFilter !== 'Alle') q = q.eq('position_primary', posFilter);
                if (statusFilter !== 'Alle') q = q.eq('transfer_status', statusFilter);
                const { data } = await q.limit(200);
                setPlayers(data || []);
            } catch (e) {
                console.error("Map load error:", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [posFilter, statusFilter]);

    // Initialize map
    useEffect(() => {
        if (!mapRef.current || mapInstance.current) return;

        mapInstance.current = L.map(mapRef.current, {
            center: [51.1657, 10.4515], // Center of Germany
            zoom: 6,
            zoomControl: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(mapInstance.current);

        L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []);

    // Add markers
    useEffect(() => {
        if (!mapInstance.current || loading) return;

        // Clear old markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        const addMarkers = async () => {
            const cities = [...new Set(players.map(p => p.city).filter(Boolean))];
            setGeocodingProgress(`Standorte laden (0/${cities.length})...`);

            // Group players by city
            const cityPlayers = {};
            players.forEach(p => {
                if (!p.city) return;
                const key = p.city.toLowerCase().trim();
                if (!cityPlayers[key]) cityPlayers[key] = { city: p.city, players: [] };
                cityPlayers[key].players.push(p);
            });

            let done = 0;
            for (const key of Object.keys(cityPlayers)) {
                const group = cityPlayers[key];
                const coords = await geocodeCity(group.city);
                done++;
                setGeocodingProgress(`Standorte laden (${done}/${Object.keys(cityPlayers).length})...`);

                if (!coords || !mapInstance.current) continue;

                // Small random offset for overlapping markers
                const jitter = () => (Math.random() - 0.5) * 0.005;

                group.players.forEach(p => {
                    const lat = coords.lat + jitter();
                    const lng = coords.lng + jitter();

                    const icon = L.divIcon({
                        className: 'custom-marker',
                        html: `<div style="
                            width: 36px; height: 36px; border-radius: 50%;
                            background: ${p.avatar_url ? `url(${p.avatar_url})` : '#27272a'};
                            background-size: cover; background-position: center;
                            border: 3px solid ${p.transfer_status === 'Suche Verein' ? '#22c55e' : p.transfer_status === 'Vertrag läuft aus' ? '#f59e0b' : '#3b82f6'};
                            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
                            display: flex; align-items: center; justify-content: center;
                            color: #71717a; font-size: 14px;
                        ">${!p.avatar_url ? '👤' : ''}</div>`,
                        iconSize: [36, 36],
                        iconAnchor: [18, 18]
                    });

                    const marker = L.marker([lat, lng], { icon })
                        .addTo(mapInstance.current)
                        .on('click', () => setSelectedPlayer(p));

                    markersRef.current.push(marker);
                });
            }
            setGeocodingProgress('');
        };

        addMarkers();
    }, [players, loading]);

    const FilterChip = ({ label, active, onClick }) => (
        <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition ${active ? 'bg-blue-600 text-white' : 'bg-black/50 text-zinc-400 hover:bg-zinc-800'}`}>{label}</button>
    );

    return (
        <div className="fixed inset-0 z-[10000] bg-black flex flex-col animate-in fade-in">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pt-12 pointer-events-none">
                <div className="flex items-center justify-between pointer-events-auto">
                    <h2 className="text-xl font-black text-white flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl">
                        <MapPin size={20} className="text-blue-500" /> Kartenansicht
                    </h2>
                    <button onClick={onClose} className="p-3 bg-black/60 backdrop-blur-md rounded-full hover:bg-black/80 transition">
                        <X size={20} className="text-white" />
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mt-3 overflow-x-auto pointer-events-auto">
                    {['Alle', 'Suche Verein', 'Vertrag läuft aus', 'Gebunden'].map(s => (
                        <FilterChip key={s} label={s === 'Alle' ? 'Status: Alle' : s} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
                    ))}
                </div>
                <div className="flex gap-2 mt-2 overflow-x-auto pointer-events-auto">
                    {['Alle', 'ST', 'ZOM', 'ZM', 'ZDM', 'IV', 'RV', 'LV', 'TW'].map(p => (
                        <FilterChip key={p} label={p === 'Alle' ? 'Pos: Alle' : p} active={posFilter === p} onClick={() => setPosFilter(p)} />
                    ))}
                </div>

                {/* Geocoding progress */}
                {geocodingProgress && (
                    <div className="mt-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl text-xs text-zinc-400 flex items-center gap-2 pointer-events-auto w-fit">
                        <Loader2 size={14} className="animate-spin" /> {geocodingProgress}
                    </div>
                )}
            </div>

            {/* Map */}
            <div ref={mapRef} className="flex-1 w-full" />

            {/* Legend */}
            <div className="absolute bottom-20 left-4 z-[1000] bg-black/70 backdrop-blur-md rounded-xl p-3 text-[10px] space-y-1.5">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 border border-green-400" /> Suche Verein</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-400" /> Vertrag läuft aus</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-400" /> Gebunden</div>
            </div>

            {/* Player count */}
            <div className="absolute bottom-20 right-4 z-[1000] bg-black/70 backdrop-blur-md rounded-xl px-3 py-2 text-xs text-zinc-400">
                {players.filter(p => p.city).length} Spieler
            </div>

            {/* Selected player card */}
            {selectedPlayer && (
                <div className="absolute bottom-24 left-4 right-4 z-[1000] animate-in slide-in-from-bottom-4 fade-in">
                    <div className={`${cardStyle} p-4 flex items-center gap-4`}>
                        <div className="w-14 h-14 rounded-2xl bg-zinc-800 overflow-hidden border border-white/10 shrink-0">
                            {selectedPlayer.avatar_url ? <img src={selectedPlayer.avatar_url} className="w-full h-full object-cover" /> : <User size={24} className="text-zinc-600 m-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-base truncate">{selectedPlayer.full_name}</h3>
                            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                                <span className="flex items-center gap-1"><Shield size={10} /> {selectedPlayer.clubs?.name || 'Vereinslos'}</span>
                                <span className="flex items-center gap-1"><MapPin size={10} /> {selectedPlayer.city}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-zinc-300 font-bold">{selectedPlayer.position_primary}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${selectedPlayer.transfer_status === 'Suche Verein' ? 'bg-green-500/20 text-green-400' :
                                        selectedPlayer.transfer_status === 'Vertrag läuft aus' ? 'bg-amber-500/20 text-amber-400' :
                                            'bg-zinc-800 text-zinc-400'
                                    }`}>{selectedPlayer.transfer_status}</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => { onUserClick(selectedPlayer); onClose(); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-500 transition flex items-center gap-1">
                                Profil <ChevronRight size={14} />
                            </button>
                            <button onClick={() => setSelectedPlayer(null)} className="text-zinc-500 text-[10px] text-center hover:text-white transition">
                                Schließen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
