import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, User, Shield, MapPin, Loader2, ChevronRight, ArrowLeft } from 'lucide-react';
import { cardStyle } from '../lib/styles';
import { fetchPlayersWithCoords, fetchPlayersWithCity, geocodeCity } from '../lib/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export const MapScreen = ({ onClose, onUserClick }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markersRef = useRef([]);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('Spieler laden...');
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [posFilter, setPosFilter] = useState('Alle');
    const [statusFilter, setStatusFilter] = useState('Alle');
    const [showToast, setShowToast] = useState(true);

    // Social Proof Toast Timer
    useEffect(() => {
        const t = setTimeout(() => setShowToast(false), 4000);
        return () => clearTimeout(t);
    }, []);

    // Load players — prefer stored coords, fallback to geocoding
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setStatus('Spieler laden...');
            try {
                // First: players with stored coordinates (instant)
                const withCoords = await fetchPlayersWithCoords({ posFilter, statusFilter });

                // Second: players with city but no coords (need geocoding)
                const allWithCity = await fetchPlayersWithCity({ posFilter, statusFilter });
                const needsGeo = allWithCity.filter(p => !p.latitude && p.city);

                // Start with coord-having players
                setPlayers(withCoords);

                // Geocode remaining in background
                if (needsGeo.length > 0) {
                    setStatus(`${withCoords.length} sofort, ${needsGeo.length} werden geocodiert...`);
                    const geocoded = [];
                    const cities = [...new Set(needsGeo.map(p => p.city?.toLowerCase().trim()).filter(Boolean))];

                    for (let i = 0; i < cities.length; i++) {
                        const city = cities[i];
                        const coords = await geocodeCity(city);
                        if (coords) {
                            needsGeo.filter(p => p.city?.toLowerCase().trim() === city).forEach(p => {
                                geocoded.push({ ...p, latitude: coords.lat, longitude: coords.lng });
                            });
                        }
                        setStatus(`Geocoding ${i + 1}/${cities.length}...`);
                    }

                    setPlayers(prev => [...prev, ...geocoded]);
                }
            } catch (e) {
                console.error("Map load error:", e);
            } finally {
                setLoading(false);
                setStatus('');
            }
        };
        load();
    }, [posFilter, statusFilter]);

    // Initialize map
    useEffect(() => {
        if (!mapRef.current || mapInstance.current) return;

        mapInstance.current = L.map(mapRef.current, {
            center: [51.1657, 10.4515],
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

    // Add markers — now uses stored lat/lng directly
    useEffect(() => {
        if (!mapInstance.current) return;

        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        const jitter = () => (Math.random() - 0.5) * 0.005;

        players.forEach(p => {
            if (!p.latitude || !p.longitude) return;

            const icon = L.divIcon({
                className: 'custom-radar-marker',
                html: `<div class="relative flex items-center justify-center w-8 h-8">
                          <div class="absolute w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] z-10"></div>
                          <div class="absolute w-8 h-8 rounded-full bg-cyan-400/30 animate-ping"></div>
                       </div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            const marker = L.marker([p.latitude + jitter(), p.longitude + jitter()], { icon })
                .addTo(mapInstance.current)
                .on('click', () => setSelectedPlayer(p));

            markersRef.current.push(marker);
        });
    }, [players]);

    const FilterChip = ({ label, active, onClick }) => (
        <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition ${active ? 'bg-blue-600 text-white' : 'bg-black/50 text-zinc-400 hover:bg-zinc-800'}`}>{label}</button>
    );

    return (
        <div className="fixed inset-0 z-[10000] bg-[#050505] flex flex-col animate-in fade-in">
            {/* Top Navigation Bar with Escape Hatch */}
            <div className="absolute top-0 left-0 right-0 z-[10001] p-6 pt-12 flex justify-between items-start pointer-events-none">
                <button onClick={onClose} className="p-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-lg pointer-events-auto hover:bg-white/10 transition-all active:scale-95 group">
                    <ArrowLeft size={24} className="text-zinc-300 group-hover:text-white transition-colors" />
                </button>
                <div className="bg-[#050505]/80 backdrop-blur-xl border border-white/5 px-5 py-2.5 rounded-2xl shadow-2xl pointer-events-auto flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
                    <h2 className="text-sm font-bold tracking-widest text-white uppercase">Scout Radar</h2>
                </div>
            </div>

            {/* Social Proof Toast */}
            {showToast && (
                <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[10001] bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-xl px-5 py-2.5 rounded-full shadow-2xl animate-in slide-in-from-top-4 fade-in duration-500 flex items-center gap-2 pointer-events-none">
                    <span className="text-cyan-400 font-bold text-xs uppercase tracking-wider">📍 3 neue Talente entdeckt</span>
                </div>
            )}

            {/* Navigation Filter Overlay (Top Right) */}
            <div className="absolute top-28 right-4 z-[10001] flex flex-col items-end gap-3 pointer-events-none max-w-[200px]">
                {['Alle', 'Suche Verein', 'Vertrag läuft aus', 'Gebunden'].map(s => (
                    <FilterChip key={s} label={s === 'Alle' ? 'Status: Alle' : s} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
                ))}
            </div>
            <div className="absolute top-40 right-4 z-[10001] flex gap-2 mt-2 overflow-x-auto pointer-events-auto max-w-[calc(100vw-32px)]">
                {['Alle', 'ST', 'ZOM', 'ZM', 'ZDM', 'IV', 'RV', 'LV', 'TW'].map(p => (
                    <FilterChip key={p} label={p === 'Alle' ? 'Pos: Alle' : p} active={posFilter === p} onClick={() => setPosFilter(p)} />
                ))}
            </div>

            {/* Status indicator */}
            {status && (
                <div className="absolute top-48 left-1/2 -translate-x-1/2 z-[10001] bg-[#050505]/80 backdrop-blur-md border border-white/5 px-4 py-2 rounded-xl text-xs text-zinc-400 flex items-center gap-2 pointer-events-none w-fit">
                    <Loader2 size={12} className="animate-spin text-cyan-500" /> <span className="truncate">{status}</span>
                </div>
            )}

            {/* Map Container with Filters & Vignette */}
            <div className="flex-1 w-full relative overflow-hidden pb-24">
                <div ref={mapRef} className="absolute inset-0 w-full h-full filter contrast-125 brightness-75 sepia-[.3] hue-rotate-[180deg] saturate-200" />
                {/* Vignette Overlay to focus center */}
                <div className="absolute inset-0 z-[400] pointer-events-none shadow-[inset_0_0_150px_rgba(5,5,5,1)]"></div>
            </div>

            {/* Radar Legend & Counter */}
            <div className="absolute bottom-32 left-6 z-[10001] bg-[#050505]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4 text-[10px] space-y-2.5 shadow-2xl">
                <div className="text-cyan-400 font-bold tracking-wider uppercase mb-1">{players.length} Tracker aktiv</div>
                <div className="flex items-center gap-2.5 text-zinc-400"><span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" /> Suche Verein</div>
                <div className="flex items-center gap-2.5 text-zinc-400"><span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" /> Vertrag läuft aus</div>
                <div className="flex items-center gap-2.5 text-zinc-400"><span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" /> Gebunden</div>
            </div>

            {/* Premium Selected Player Bottom Sheet */}
            {selectedPlayer && (
                <div className="absolute bottom-0 left-0 right-0 z-[10002] animate-in slide-in-from-bottom duration-500 fade-in">
                    <div className="bg-[#050505]/90 backdrop-blur-3xl border-t border-white/10 rounded-t-[2.5rem] p-6 pb-10 shadow-[0_-15px_40px_rgba(0,0,0,0.5)]">
                        {/* Drag Handle Mock */}
                        <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-6"></div>

                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-white/5 shadow-inner overflow-hidden shrink-0">
                                {selectedPlayer.avatar_url ? <img src={selectedPlayer.avatar_url} className="w-full h-full object-cover" /> : <User size={28} className="text-zinc-600 m-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white text-lg truncate tracking-tight">{selectedPlayer.full_name}</h3>
                                <div className="flex items-center gap-2.5 text-xs text-zinc-400 mt-1">
                                    <span className="flex items-center gap-1 font-medium"><Shield size={12} className="text-cyan-500" /> {selectedPlayer.clubs?.name || 'Vereinslos'}</span>
                                    <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                                    <span className="flex items-center gap-1"><MapPin size={12} /> {selectedPlayer.city}</span>
                                </div>
                                <div className="flex items-center gap-2.5 mt-2.5">
                                    <span className="text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-md text-zinc-300 font-bold uppercase tracking-wide">{selectedPlayer.position_primary}</span>
                                    <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wide border ${selectedPlayer.transfer_status === 'Suche Verein' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                                        selectedPlayer.transfer_status === 'Vertrag läuft aus' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                                            'bg-zinc-800 border-zinc-700 text-zinc-400'
                                        }`}>{selectedPlayer.transfer_status}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 shrink-0">
                                <button onClick={() => { onUserClick(selectedPlayer); onClose(); }} className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(8,145,178,0.4)] transition-transform hover:scale-105 active:scale-95">
                                    <ChevronRight size={20} className="text-white" />
                                </button>
                                <button onClick={() => setSelectedPlayer(null)} className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider text-center hover:text-white transition">
                                    ZURÜCK
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
