import React, { useState, useEffect, useRef, useCallback } from 'react';
import Map, { Marker, Popup, NavigationControl, FullscreenControl, GeolocateControl } from 'react-map-gl/mapbox';
import { MapPin, Video, User, Compass, Filter, Sparkles, Navigation, Layers, Search, RefreshCw, X, Play } from 'lucide-react';
import { supabase } from '../lib/api';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const DEFAULT_VIEW_STATE = {
  longitude: 10.4515,
  latitude: 51.1657,
  zoom: 6,
  pitch: 30,
  bearing: 0
};

export default function MapExplorer({ onSelectVideo, initialLocation }) {
  const [viewState, setViewState] = useState(initialLocation || DEFAULT_VIEW_STATE);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/dark-v11');
  const mapRef = useRef(null);

  // Fetch videos within map bounds using PostGIS RPC or fallback query
  const fetchVideosInBounds = useCallback(async () => {
    if (!mapRef.current) return;

    try {
      setLoading(true);
      const bounds = mapRef.current.getBounds();
      
      if (bounds) {
        const minLng = bounds.getWest();
        const minLat = bounds.getSouth();
        const maxLng = bounds.getEast();
        const maxLat = bounds.getNorth();

        // 1. Try PostGIS RPC function get_videos_in_bounding_box
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_videos_in_bounding_box', {
          min_lat: minLat,
          min_lng: minLng,
          max_lat: maxLat,
          max_lng: maxLng
        });

        if (!rpcError && rpcData && rpcData.length > 0) {
          setVideos(rpcData);
          setLoading(false);
          return;
        }

        // 2. Fallback: Query media_highlights join player location or fallback items
        const { data: highlights, error: queryErr } = await supabase
          .from('media_highlights')
          .select(`
            *,
            player:players_master(id, full_name, username, avatar_url, city, latitude, longitude)
          `)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!queryErr && highlights) {
          // Process highlights to format location coordinates
          const geoVideos = highlights.map(item => {
            let lat = item.player?.latitude;
            let lng = item.player?.longitude;
            
            // Extract from location geography object if available
            if (item.location && typeof item.location === 'object') {
              if (item.location.coordinates) {
                lng = item.location.coordinates[0];
                lat = item.location.coordinates[1];
              }
            }

            return {
              ...item,
              lat,
              lng
            };
          }).filter(v => v.lat && v.lng);

          setVideos(geoVideos);
        }
      }
    } catch (err) {
      console.error('Error fetching videos in map bounds:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideosInBounds();
  }, [fetchVideosInBounds]);

  const handleMapMove = useCallback(() => {
    // Optionally trigger debounced re-fetch when map moves
  }, []);

  const handleMarkerClick = (video, e) => {
    e.originalEvent.stopPropagation();
    setSelectedVideo(video);
  };

  const filteredVideos = videos.filter(v => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'featured') return v.is_featured;
    if (activeFilter === 'goals') return v.category_tag === 'Goal' || v.description?.toLowerCase().includes('tor');
    return true;
  });

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-zinc-950 text-white overflow-hidden rounded-2xl border border-zinc-800 shadow-2xl">
      {/* Top Glassmorphism Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-zinc-100 flex items-center gap-2">
              CAVIOS Map Scouting
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                Live Geotagging
              </span>
            </h2>
            <p className="text-xs text-zinc-400">Videos & Talent-Spots in deiner Nähe erkunden</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {[
            { id: 'all', label: 'Alle Highlights', icon: Layers },
            { id: 'featured', label: 'Featured', icon: Sparkles },
            { id: 'goals', label: 'Tore & Skills', icon: Video }
          ].map(filter => {
            const Icon = filter.icon;
            const active = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? 'bg-emerald-500 text-zinc-950 font-semibold shadow-lg shadow-emerald-500/20'
                    : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700/60 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {filter.label}
              </button>
            );
          })}
          
          <button
            onClick={fetchVideosInBounds}
            disabled={loading}
            className="p-1.5 rounded-lg bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 transition-colors ml-1"
            title="Aktualisieren"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Warning if Token Missing */}
      {!MAPBOX_TOKEN && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm p-6 text-center">
          <div className="max-w-md p-6 rounded-2xl bg-zinc-900 border border-amber-500/30 text-zinc-200 shadow-2xl">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-amber-400 animate-bounce" />
            <h3 className="text-lg font-bold text-amber-400 mb-2">Mapbox Token benötigt</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Bitte hinterlege den <code>VITE_MAPBOX_TOKEN</code> in deiner <code>.env</code> Datei, um die interaktive Karte zu laden.
            </p>
          </div>
        </div>
      )}

      {/* Main Mapbox Container */}
      {MAPBOX_TOKEN && (
        <Map
          ref={mapRef}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          onMoveEnd={handleMapMove}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle={mapStyle}
          className="w-full h-full"
          attributionControl={false}
        >
          <NavigationControl position="bottom-right" showCompass={true} />
          <FullscreenControl position="bottom-right" />
          <GeolocateControl position="bottom-right" trackUserLocation={true} />

          {/* Video Markers */}
          {filteredVideos.map(video => (
            <Marker
              key={video.id}
              longitude={video.lng}
              latitude={video.lat}
              anchor="bottom"
              onClick={e => handleMarkerClick(video, e)}
            >
              <button className="group relative flex items-center justify-center focus:outline-none">
                {/* Glow Effect */}
                <span className="absolute -inset-1 rounded-full bg-emerald-500/40 opacity-75 blur group-hover:opacity-100 transition-opacity animate-pulse" />
                
                {/* Pin Container */}
                <div className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-zinc-900/90 border border-emerald-500/50 shadow-xl text-emerald-400 group-hover:scale-110 group-hover:border-emerald-400 transition-transform">
                  <Video className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-zinc-100 max-w-[90px] truncate">
                    {video.player?.full_name || video.category_tag || 'Video'}
                  </span>
                </div>
              </button>
            </Marker>
          ))}

          {/* Selected Video Popup */}
          {selectedVideo && (
            <Popup
              longitude={selectedVideo.lng}
              latitude={selectedVideo.lat}
              anchor="top"
              onClose={() => setSelectedVideo(null)}
              closeButton={false}
              className="mapbox-custom-popup"
            >
              <div className="w-64 p-3 rounded-xl bg-zinc-900 border border-zinc-700/80 text-zinc-100 shadow-2xl backdrop-blur-md">
                <div className="relative rounded-lg overflow-hidden mb-2 bg-zinc-950 aspect-video group">
                  {selectedVideo.thumbnail_url ? (
                    <img
                      src={selectedVideo.thumbnail_url}
                      alt={selectedVideo.description || 'Highlight'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500">
                      <Video className="w-8 h-8" />
                    </div>
                  )}

                  <button
                    onClick={() => onSelectVideo && onSelectVideo(selectedVideo)}
                    className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 opacity-90 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="p-2.5 rounded-full bg-emerald-500 text-zinc-950 shadow-lg transform group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </button>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-100 truncate">
                      {selectedVideo.player?.full_name || 'Talent Highlight'}
                    </h4>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3 text-emerald-400" />
                      @{selectedVideo.player?.username || 'user'}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setSelectedVideo(null)}
                    className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {selectedVideo.description && (
                  <p className="text-xs text-zinc-300 mt-2 line-clamp-2 italic">
                    "{selectedVideo.description}"
                  </p>
                )}

                <button
                  onClick={() => onSelectVideo && onSelectVideo(selectedVideo)}
                  className="w-full mt-3 py-1.5 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-zinc-950 border border-emerald-500/30 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Video abspielen
                </button>
              </div>
            </Popup>
          )}
        </Map>
      )}

      {/* Mapbox Custom Popup Style Override */}
      <style>{`
        .mapboxgl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
          border-radius: 12px;
        }
        .mapboxgl-popup-anchor-top .mapboxgl-popup-tip,
        .mapboxgl-popup-anchor-bottom .mapboxgl-popup-tip,
        .mapboxgl-popup-anchor-left .mapboxgl-popup-tip,
        .mapboxgl-popup-anchor-right .mapboxgl-popup-tip {
          border-bottom-color: #18181b !important;
          border-top-color: #18181b !important;
        }
      `}</style>
    </div>
  );
}
