import React from 'react';
import { ArrowLeft } from 'lucide-react';
import MapExplorer from './MapExplorer';

export const MapScreen = ({ onClose, onUserClick }) => {
    return (
        <div className="fixed inset-0 z-[10000] bg-zinc-950 flex flex-col animate-in fade-in">
            {/* Top Navigation Bar */}
            <div className="absolute top-0 left-0 right-0 z-[10001] p-4 pt-8 flex justify-between items-center pointer-events-none">
                <button
                    onClick={onClose}
                    className="p-2.5 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-full shadow-xl pointer-events-auto hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all active:scale-95"
                    title="Zurück"
                >
                    <ArrowLeft size={20} />
                </button>
            </div>

            {/* Main Mapbox Explorer View */}
            <div className="flex-1 w-full h-full">
                <MapExplorer
                    onSelectVideo={(video) => {
                        if (video.player && onUserClick) {
                            onUserClick(video.player);
                        }
                    }}
                />
            </div>
        </div>
    );
};

