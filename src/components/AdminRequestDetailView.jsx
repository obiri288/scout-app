import React from 'react';
import { motion } from 'framer-motion';
import { 
    X, Check, Ban, User, Calendar, Trophy, Flag, Shield, 
    ExternalLink, Clock, ChevronRight, MapPin, Briefcase,
    ShieldCheck, MessageSquare, Video, Info, Building,
    ChevronLeft, AlertTriangle, Globe, Crown
} from 'lucide-react';
import { getCountryFlag, getCountryNameOnly } from '../lib/countries';

const AdminRequestDetailView = ({ request, type, onApprove, onReject, onClose }) => {
    if (!request) return null;

    const profile = request.profile || (type === 'account' ? request : null);
    const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) : 'Unbekannt';

    const renderUserDossier = () => (
        <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                    ) : (
                        <User size={32} className="text-zinc-600" />
                    )}
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white leading-tight">{profile?.full_name || 'Unbekannter User'}</h2>
                    <p className="text-blue-500 font-bold">@{profile?.username || 'user'}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 bg-white/5 text-zinc-400 text-[10px] font-black uppercase tracking-widest rounded-md border border-white/5">
                            {profile?.role === 'scout' ? 'Scout' : profile?.role === 'trainer' ? 'Trainer' : profile?.role === 'admin' ? 'Admin' : 'Spieler'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <div className="flex items-center gap-2 text-zinc-500 mb-1">
                        <Calendar size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Mitglied seit</span>
                    </div>
                    <p className="text-sm font-bold text-white">{memberSince}</p>
                </div>
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <div className="flex items-center gap-2 text-zinc-500 mb-1">
                        <ShieldCheck size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Trust Score</span>
                    </div>
                    <p className="text-sm font-bold text-white">Verified Stations: {profile?.verified_stations_count || 0}</p>
                </div>
            </div>
        </div>
    );

    const renderRequestContent = () => {
        switch (type) {
            case 'career':
                const isCaptainReq = request.is_captain_request;
                return (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            {isCaptainReq ? (
                                <>
                                    <Trophy className="text-amber-400" size={20} />
                                    <h3 className="text-lg font-black text-amber-400 uppercase tracking-tight">👑 Kapitäns-Rolle Beantragt</h3>
                                </>
                            ) : (
                                <>
                                    <Trophy className="text-yellow-500" size={20} />
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Karriere-Station Details</h3>
                                </>
                            )}
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <DetailRow label="Verein" value={request.club_name} />
                            <DetailRow label="Liga" value={request.league} />
                            <DetailRow label="Position" value={request.position} />
                            <DetailRow label="Zeitraum" value={`${request.start_date || 'N/A'} - ${request.is_current ? 'Heute' : (request.end_date || 'N/A')}`} />
                            
                            {isCaptainReq && (
                                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl mt-2">
                                    <div className="flex items-start gap-3">
                                        <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-400/80 leading-relaxed font-medium">
                                            Dieser User beantragt die offizielle <span className="font-bold text-amber-300">Kapitäns-Rolle (Digitale Kapitänsbinde ©)</span> für diesen Verein. Nach der Freigabe hat er die Locker-Room-Berechtigung, um Mitspieler seines Vereins zu verifizieren.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {request.proof_url && (
                                <div className="mt-4">
                                    <a 
                                        href={request.proof_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full py-3 bg-cyan-500/10 text-cyan-400 font-bold rounded-xl border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
                                    >
                                        <ExternalLink size={16} />
                                        Beweis-Link öffnen
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'report':
                const isTransfer = request.targetData?.type === 'transfer';
                return (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Flag className="text-red-500" size={20} />
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Beweismittel sichten</h3>
                        </div>

                        {/* Evidence Preview Box */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Inhalts-Vorschau</p>
                            
                            {request.target_type === 'video' ? (
                                <div className="aspect-video rounded-2xl overflow-hidden bg-black relative border border-white/10">
                                    {request.targetData?.video_url ? (
                                        <video src={request.targetData.video_url} className="w-full h-full object-contain" controls />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                                            <Video size={32} className="mb-2" />
                                            <p className="text-xs font-bold">Video nicht verfügbar</p>
                                        </div>
                                    )}
                                </div>
                            ) : request.target_type === 'post' ? (
                                <div className="p-5 bg-zinc-900 border border-white/5 rounded-2xl space-y-4">
                                    {isTransfer && (
                                        <div className="flex items-center gap-3 p-3 bg-cyan-500/5 border border-cyan-500/15 rounded-xl">
                                            <Trophy size={18} className="text-cyan-400 shrink-0" />
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">Automatisierter Transfer-Post</p>
                                                <p className="text-xs font-bold text-white mt-0.5">
                                                    {request.targetData?.metadata?.club_name || 'Verein'} • {request.targetData?.metadata?.position || 'Position'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">"{request.targetData?.content || 'Kein Textinhalt.'}"</p>
                                    
                                    {request.targetData?.metadata?.image_url && (
                                        <img src={request.targetData.metadata.image_url} className="w-full aspect-video rounded-xl object-cover border border-white/5 bg-black/40 mt-2" alt="Post Attachment" />
                                    )}
                                </div>
                            ) : (
                                <div className="p-4 bg-zinc-900 border border-white/5 rounded-2xl">
                                    <p className="text-white text-sm italic">"{request.targetData?.content || 'Inhalt konnte nicht geladen werden.'}"</p>
                                </div>
                            )}
                        </div>

                        {/* Dossier and reports loop */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                Gemeldete Gründe ({request.reports?.length || 0})
                            </p>
                            
                            <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                                {request.reports?.map((r, idx) => (
                                    <div key={r.id || idx} className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl space-y-1">
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="font-bold text-zinc-400">
                                                Gemeldet von: {r.reporterProfile?.full_name || 'Anonymer User'} (@{r.reporterProfile?.username || 'user'})
                                            </span>
                                            <span className="text-zinc-500">
                                                {r.created_at ? new Date(r.created_at).toLocaleDateString('de-DE') : ''}
                                            </span>
                                        </div>
                                        <p className="text-white text-xs font-semibold">"{r.reason || 'Kein Grund angegeben'}"</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'account':
                const isClubUpdate = request.type === 'club';
                return (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Shield className="text-blue-500" size={20} />
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">
                                {isClubUpdate ? 'Vereins-Verifizierung' : 'Status-Freigabe'}
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {isClubUpdate ? (
                                <>
                                    <DetailRow label="Angeforderter Verein" value={request.clubs?.name || 'Unbekannt'} />
                                    <DetailRow label="Aktueller Status" value="Wartet auf Freigabe" />
                                    <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl mt-2">
                                        <div className="flex items-start gap-3">
                                            <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                            <p className="text-xs text-amber-500/80 leading-relaxed">
                                                Der User möchte seine Vereinszugehörigkeit offiziell bestätigen lassen. Dies schaltet den verifizierten Haken neben dem Vereinsnamen frei.
                                            </p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <DetailRow label="Angeforderte Rolle" value={request.role === 'scout' ? 'Scout' : 'Trainer'} />
                                    <DetailRow label="Aktuelle Rolle" value="Spieler" />
                                    <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl mt-2">
                                        <div className="flex items-start gap-3">
                                            <ShieldCheck size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                            <p className="text-xs text-blue-500/80 leading-relaxed">
                                                Status-Upgrades auf Scout oder Trainer erfordern manuelles Review von Zertifikaten oder offiziellen Nachweisen.
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            case 'claim':
                return (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Building className="text-indigo-500" size={20} />
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Vereins-Inhaberschaft (Claim)</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <DetailRow label="Verein" value={request.clubs?.name} />
                            <DetailRow label="Nachricht / Begründung" value={request.message || 'Keine Nachricht hinterlegt.'} />
                            <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl mt-2">
                                <div className="flex items-start gap-3">
                                    <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-indigo-500/80 leading-relaxed">
                                        Ein Claim bedeutet, dass der User Admin-Rechte für diesen Verein erhalten möchte, um Daten zu verwalten.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'nationality':
                return (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Globe className="text-teal-400" size={20} />
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Zweite Nationalität Nachweis</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <DetailRow label="Angeforderte Zweite Nationalität" value={request.nationality ? `${getCountryFlag(request.nationality)} ${getCountryNameOnly(request.nationality)}` : 'N/A'} />
                            <DetailRow label="Verifizierungsart" value={request.verification_type === 'document' ? 'Reisepass / Dokumenten-Upload' : 'Club-Admin Freigabe'} />
                            <DetailRow label="Status" value={request.status === 'pending' ? 'Ausstehend' : request.status} />
                            
                            {request.document_url && (
                                <div className="mt-4 space-y-2">
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Hochgeladener Reisepass / Nachweis</span>
                                    <div className="border border-white/10 rounded-2xl overflow-hidden bg-black max-h-[300px] flex items-center justify-center relative group">
                                        <img src={request.document_url} className="max-w-full max-h-[300px] object-contain transition-transform group-hover:scale-105 duration-300" alt="Passport Document" />
                                    </div>
                                    <div className="pt-2">
                                        <a 
                                            href={request.document_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-3 bg-teal-500/10 text-teal-400 font-bold rounded-xl border border-teal-500/20 hover:bg-teal-500/20 transition-all text-xs sm:text-sm uppercase tracking-wider"
                                        >
                                            <ExternalLink size={16} />
                                            Dokument in neuem Tab öffnen
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60000] flex items-center justify-center p-4 sm:p-6"
        >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
            
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl bg-[#0A0A0A] border border-white/10 shadow-2xl rounded-[32px] overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0 bg-[#050505]/50">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition text-zinc-400">
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-widest leading-none">
                                {type === 'report' ? 'Verstoß prüfen' : 'Antrags-Akte'}
                            </h3>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">ID: {request.id?.slice(0, 8)}...</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-zinc-400">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-32">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Area A: User Dossier */}
                        <div className="w-full md:w-[40%] shrink-0">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">
                                {type === 'report' ? 'Gemeldeter Ersteller' : 'Antragsteller'}
                            </p>
                            {renderUserDossier()}
                        </div>

                        {/* Area B: Request Details */}
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Moderationsakte</p>
                            
                            {/* CAPTAIN BANNER — glowing, unmissable */}
                            {type === 'career' && request.is_captain_request && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="relative overflow-hidden bg-amber-500/15 border-2 border-amber-500/60 text-amber-300 font-black p-4 rounded-2xl mb-4 flex items-center gap-3 shadow-[0_0_25px_rgba(245,158,11,0.25),inset_0_1px_0_rgba(255,255,255,0.1)]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 animate-pulse" />
                                    <div className="relative w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                                        <Crown size={22} className="text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
                                    </div>
                                    <div className="relative">
                                        <span className="text-sm uppercase tracking-widest">Kapitäns-Antrag</span>
                                        <p className="text-[10px] text-amber-400/70 font-bold mt-0.5">Digitale Kapitänsbinde © wird beantragt</p>
                                    </div>
                                </motion.div>
                            )}

                            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6">
                                {renderRequestContent()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Bar - Tripartite Custom Moderation or Standard */}
                <div className="absolute bottom-0 left-0 w-full p-5 bg-[#050505]/95 border-t border-white/10 z-[100] backdrop-blur-md">
                    {type === 'report' ? (
                        <div className="flex flex-col gap-3 w-full max-w-xl mx-auto">
                            <div className="flex gap-2 w-full">
                                {/* Action 1: Dismiss / Meldung verwerfen */}
                                <button 
                                    onClick={() => onApprove('dismiss')} 
                                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-2xl font-bold transition-all text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5"
                                >
                                    <ShieldCheck size={16} />
                                    Meldung verwerfen
                                </button>
                                
                                {/* Action 2: Takedown / Content löschen */}
                                <button 
                                    onClick={() => onReject('takedown')} 
                                    className="flex-1 py-3 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/30 rounded-2xl font-black transition-all text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5"
                                >
                                    <XCircle size={16} />
                                    Takedown
                                </button>
                                
                                {/* Action 3: Warning & Takedown */}
                                <button 
                                    onClick={() => onReject('warn_and_takedown')} 
                                    className="flex-1 py-3 bg-amber-950/40 hover:bg-amber-900/40 text-amber-400 border border-amber-900/30 rounded-2xl font-black transition-all text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5"
                                >
                                    <AlertTriangle size={16} />
                                    Verwarnen & Löschen
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 w-full max-w-md mx-auto">
                            <button 
                                onClick={onClose} 
                                className="p-3 md:px-4 bg-zinc-800 rounded-xl text-zinc-300 hover:bg-zinc-700 transition flex-shrink-0"
                            >
                                Zurück
                            </button>
                            <button 
                                onClick={onReject} 
                                className="flex-1 p-3 bg-red-950/40 text-red-500 border border-red-900/50 rounded-xl font-bold hover:bg-red-900/40 transition truncate"
                            >
                                Ablehnen
                            </button>
                            <button 
                                onClick={onApprove} 
                                className="flex-1 p-3 bg-green-950/40 text-green-500 border border-green-900/50 rounded-xl font-bold hover:bg-green-900/40 transition truncate"
                            >
                                Bestätigen
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

const DetailRow = ({ label, value }) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</span>
        <p className="text-sm font-bold text-white">{value || 'Keine Angabe'}</p>
    </div>
);

export default AdminRequestDetailView;
