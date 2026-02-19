import React, { useState } from 'react';
import { X, BadgeCheck, FileBadge, Loader2 } from 'lucide-react';
import { cardStyle } from '../lib/styles';
import { useToast } from '../contexts/ToastContext';

export const VerificationModal = ({ onClose, onUploadComplete }) => {
    const [uploading, setUploading] = useState(false);
    const { addToast } = useToast();

    const handleUpload = async () => {
        setUploading(true);
        try {
            // Simulated upload for prototype
            await new Promise(r => setTimeout(r, 1500));
            addToast("Dokumente erfolgreich hochgeladen! Wir prüfen deinen Status.", 'success');
            onUploadComplete();
            onClose();
        } catch (e) {
            addToast("Fehler beim Hochladen.", 'error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className={`w-full max-w-md ${cardStyle} p-6 border-t border-zinc-700 shadow-2xl relative`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><BadgeCheck className="text-blue-500" size={24} /> Verifizierung</h3>
                    <button onClick={onClose}><X className="text-zinc-400 hover:text-white" /></button>
                </div>
                <div className="space-y-6">
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-sm text-blue-200">
                        Lade ein Foto deines Spielerpasses oder Personalausweises hoch, um das "Verifiziert"-Badge zu erhalten.
                    </div>
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-zinc-700 rounded-2xl cursor-pointer hover:bg-zinc-800/50 hover:border-blue-500/50 transition-all group">
                        <div className="p-4 bg-zinc-800 rounded-full mb-3 group-hover:scale-110 transition-transform"><FileBadge className="w-8 h-8 text-blue-400" /></div>
                        <p className="text-sm text-zinc-300 font-medium">Dokument auswählen</p>
                        <p className="text-xs text-zinc-500 mt-1">JPG, PNG oder PDF</p>
                        <input type="file" className="hidden" onChange={handleUpload} />
                    </label>
                    {uploading && <div className="text-center text-zinc-400 text-xs flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={14} /> Upload läuft...</div>}
                </div>
            </div>
        </div>
    );
};
