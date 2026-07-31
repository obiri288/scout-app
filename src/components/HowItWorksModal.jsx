import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, User, MapPin, Radar, Video, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const slides = [
  {
    id: 1,
    title: 'Dein digitales Aushängeschild',
    desc: 'Erstelle ein tiefgehendes Profil mit deiner taktischen DNA, Position und deinen physischen Leistungsdaten.',
    icon: User
  },
  {
    id: 2,
    title: 'Highlight-Videos',
    desc: 'Worte sind gut, Bilder sind besser. Lade die besten Momente deiner Spiele hoch und zeige dein echtes Können.',
    icon: Video
  },
  {
    id: 3,
    title: 'Die interaktive Scouting-Map',
    desc: 'Dank Geotagging bist du auf der Karte sichtbar. Werde von Scouts direkt in deiner Region oder weltweit entdeckt.',
    icon: MapPin
  },
  {
    id: 4,
    title: 'Präzise Suchfilter',
    desc: 'Vereine suchen gezielt nach Spielertypen. Optimiere dein Profil mit den richtigen Skills, um im Raster der Scouts ganz oben zu landen.',
    icon: Search
  },
  {
    id: 5,
    title: 'Direktes Networking',
    desc: 'Werde vom Radar erfasst. Verifizierte Vereine und Scouts können direkt über die Plattform mit dir in Kontakt treten.',
    icon: Radar
  }
];

export const HowItWorksModal = ({ onClose, onRegister }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      if (onRegister) {
        onRegister();
      } else {
        onClose();
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const slide = slides[currentIndex];
  const SlideIcon = slide.icon;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in-95">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 relative shadow-2xl overflow-hidden flex flex-col">
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition z-10"
        >
          <X size={24} />
        </button>

        <div className="flex-1 min-h-[400px] flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center text-center mt-4"
            >
              {/* App Screenshot Placeholder */}
              <div className="w-full max-w-sm aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/50 flex items-center justify-center mb-8 relative overflow-hidden group">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <SlideIcon size={64} className="text-cyan-400/50 group-hover:scale-110 transition-transform duration-500" />
              </div>
              
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                {slide.title}
              </h3>
              <p className="text-slate-400 text-lg max-w-md leading-relaxed">
                {slide.desc}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation & Controls */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800">
          <div className="flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'w-8 bg-cyan-400' : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`p-3 rounded-xl transition-all duration-300 border ${
                currentIndex === 0 
                  ? 'border-transparent text-slate-700 cursor-not-allowed' 
                  : 'border-slate-700 text-white hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-3 font-bold bg-white text-slate-900 rounded-xl hover:bg-slate-200 transition-all duration-300 flex items-center gap-2"
            >
              {currentIndex === slides.length - 1 ? 'Jetzt starten' : 'Weiter'}
              {currentIndex !== slides.length - 1 && <ChevronRight size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksModal;
