import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Check } from 'lucide-react';
import { btnPrimary } from '../lib/styles';

/**
 * Canvas-based circular image cropper.
 * Supports pinch-zoom, scroll-zoom, and drag to position.
 * Returns a cropped square Blob via onCrop callback.
 */
export const ImageCropModal = ({ imageSrc, onCrop, onClose }) => {
    const canvasRef = useRef(null);
    const [img, setImg] = useState(null);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const CROP_SIZE = 280;
    const OUTPUT_SIZE = 400;

    // Load image
    useEffect(() => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            setImg(image);
            // Auto-fit: scale image so shortest side fills the crop area
            const minDim = Math.min(image.width, image.height);
            setScale(CROP_SIZE / minDim);
            setOffset({ x: 0, y: 0 });
        };
        image.src = imageSrc;
    }, [imageSrc]);

    // Draw canvas
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !img) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Draw image centered + offset + scale
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const x = (w - drawW) / 2 + offset.x;
        const y = (h - drawH) / 2 + offset.y;
        ctx.drawImage(img, x, y, drawW, drawH);

        // Dark overlay outside circle
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, w, h);

        // Cut out the circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, CROP_SIZE / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, x, y, drawW, drawH);
        ctx.restore();

        // Circle border
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, CROP_SIZE / 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }, [img, scale, offset]);

    useEffect(() => { draw(); }, [draw]);

    // Mouse/touch handlers for drag
    const handlePointerDown = (e) => {
        setDragging(true);
        const point = e.touches ? e.touches[0] : e;
        dragStart.current = { x: point.clientX - offset.x, y: point.clientY - offset.y };
    };

    const handlePointerMove = (e) => {
        if (!dragging) return;
        e.preventDefault();
        const point = e.touches ? e.touches[0] : e;
        setOffset({
            x: point.clientX - dragStart.current.x,
            y: point.clientY - dragStart.current.y
        });
    };

    const handlePointerUp = () => setDragging(false);

    // Scroll zoom
    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setScale(s => Math.max(0.1, Math.min(5, s + delta)));
    };

    const zoomIn = () => setScale(s => Math.min(5, s + 0.15));
    const zoomOut = () => setScale(s => Math.max(0.1, s - 0.15));
    const resetView = () => {
        if (!img) return;
        const minDim = Math.min(img.width, img.height);
        setScale(CROP_SIZE / minDim);
        setOffset({ x: 0, y: 0 });
    };

    // Export cropped image
    const handleCrop = () => {
        if (!img) return;

        const outCanvas = document.createElement('canvas');
        outCanvas.width = OUTPUT_SIZE;
        outCanvas.height = OUTPUT_SIZE;
        const ctx = outCanvas.getContext('2d');

        // Calculate what region of the image is visible in the crop circle
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const canvasW = canvasRef.current.width;
        const canvasH = canvasRef.current.height;
        const imgX = (canvasW - drawW) / 2 + offset.x;
        const imgY = (canvasH - drawH) / 2 + offset.y;

        const cropLeft = (canvasW / 2 - CROP_SIZE / 2 - imgX) / scale;
        const cropTop = (canvasH / 2 - CROP_SIZE / 2 - imgY) / scale;
        const cropDim = CROP_SIZE / scale;

        // Draw circular crop
        ctx.beginPath();
        ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, cropLeft, cropTop, cropDim, cropDim, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

        outCanvas.toBlob((blob) => {
            if (blob) onCrop(blob);
        }, 'image/jpeg', 0.9);
    };

    return (
        <div className="fixed inset-0 z-[10001] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
            <div className="absolute top-6 right-6">
                <button onClick={onClose} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition"><X size={20} className="text-white" /></button>
            </div>

            <h3 className="text-white font-bold text-lg mb-6">Bild zuschneiden</h3>

            <div
                className="rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl touch-none"
                style={{ width: 320, height: 320 }}
            >
                <canvas
                    ref={canvasRef}
                    width={320}
                    height={320}
                    className="cursor-grab active:cursor-grabbing"
                    onMouseDown={handlePointerDown}
                    onMouseMove={handlePointerMove}
                    onMouseUp={handlePointerUp}
                    onMouseLeave={handlePointerUp}
                    onTouchStart={handlePointerDown}
                    onTouchMove={handlePointerMove}
                    onTouchEnd={handlePointerUp}
                    onWheel={handleWheel}
                />
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-4 mt-6">
                <button onClick={zoomOut} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition"><ZoomOut size={20} className="text-white" /></button>
                <div className="w-32 h-1.5 bg-zinc-800 rounded-full relative">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, (scale / 3) * 100)}%` }} />
                </div>
                <button onClick={zoomIn} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition"><ZoomIn size={20} className="text-white" /></button>
                <button onClick={resetView} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition ml-2"><RotateCcw size={18} className="text-white" /></button>
            </div>

            <p className="text-zinc-500 text-xs mt-3">Ziehen zum Verschieben · Scrollen zum Zoomen</p>

            {/* Action buttons */}
            <div className="flex gap-3 mt-8">
                <button onClick={onClose} className="px-6 py-3 bg-zinc-800 text-white rounded-xl font-bold text-sm hover:bg-zinc-700 transition border border-zinc-700">
                    Abbrechen
                </button>
                <button onClick={handleCrop} className={`${btnPrimary} px-8 flex items-center gap-2`}>
                    <Check size={18} /> Übernehmen
                </button>
            </div>
        </div>
    );
};
