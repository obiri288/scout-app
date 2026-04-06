import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mail, Bell, User, ChevronRight, Heart, UserPlus, Bookmark, Star, Trophy, CheckCheck, Filter, ShieldCheck, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as api from '../lib/api';
import { cardStyle, glassHeader } from '../lib/styles';
import { GuestFallback } from './GuestFallback';
import { EmptyState } from './EmptyState';
import { VerificationBadge } from './VerificationBadge';

// Stagger animation variants
const listContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.07,
            delayChildren: 0.05,
        },
    },
};

const listItemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.3, ease: "easeOut" },
    },
};

// Notification type config
const NOTIF_CONFIG = {
    like: { icon: Heart, color: 'text-red-400', bg: 'bg-red-500/15', textDE: 'hat dein Video geliked.', textEN: 'liked your video.' },
    follow: { icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-500/15', textDE: 'folgt dir jetzt.', textEN: 'started following you.' },
    watchlist_add: { icon: Bookmark, color: 'text-amber-400', bg: 'bg-amber-500/15', textDE: 'hat dich auf die Watchlist gesetzt! 🔥', textEN: 'added you to their watchlist! 🔥' },
    rating: { icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/15', textDE: 'hat dich bewertet.', textEN: 'rated your profile.' },
    likes_milestone: { icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-500/15', textDE: 'Likes erreicht!', textEN: 'likes reached!' },
    comment: { icon: Mail, color: 'text-purple-400', bg: 'bg-purple-500/15', textDE: 'hat kommentiert.', textEN: 'left a comment.' },
};

const FILTER_TABS = [
    { id: 'all', label: 'Alle' },
    { id: 'follow', label: 'Follower' },
    { id: 'like', label: 'Likes' },
    { id: 'watchlist_add', label: 'Scouts' },
];

// Time ago helper
const timeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'gerade eben';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `vor ${minutes} Min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `vor ${hours} Std`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'gestern';
    if (days < 7) return `vor ${days} Tagen`;
    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
};

export const InboxScreen = ({ session, onSelectChat, onUserClick, onLoginReq }) => {
    const [subTab, setSubTab] = useState('notifications');
    const [notis, setNotis] = useState([]);
    const [chats, setChats] = useState([]);
    const [notifFilter, setNotifFilter] = useState('all');
    const [hasUnread, setHasUnread] = useState(false);
    const [msgTab, setMsgTab] = useState('inbox'); // 'inbox' | 'requests'

    if (!session) return <div className="pt-20"><GuestFallback icon={Mail} title="Posteingang" text="Melde dich an, um mit Scouts und anderen Spielern zu chatten." onLogin={onLoginReq} /></div>;

    const loadNotifications = useCallback(async () => {
        const data = await api.fetchNotifications(session.user.id);
        setNotis(data);
        setHasUnread(data.some(n => !n.read));
    }, [session]);

    useEffect(() => {
        if (subTab === 'notifications') {
            loadNotifications();
        } else if (subTab === 'messages' && session?.user?.id) {
            (async () => {
                try {
                    const { data } = await supabase.from('direct_messages')
                        .select('*')
                        .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
                        .order('created_at', { ascending: false })
                        .limit(100);

                    const map = new Map();
                    // Track unread status per partner
                    const unreadMap = new Map();
                    (data || []).forEach(m => {
                        const pid = m.sender_id === session.user.id ? m.receiver_id : m.sender_id;
                        if (!map.has(pid)) map.set(pid, m);
                        // Track if there are unread messages from this partner
                        if (m.sender_id !== session.user.id && !m.is_read) {
                            unreadMap.set(pid, true);
                        }
                    });

                    if (map.size > 0) {
                        const { data: users } = await supabase.from('players_master').select('*').in('user_id', [...map.keys()]);
                        setChats((users || []).map(u => ({
                            ...u,
                            lastMsg: map.get(u.user_id)?.content,
                            time: map.get(u.user_id)?.created_at,
                            hasUnread: unreadMap.get(u.user_id) || false,
                        })).sort((a, b) => new Date(b.time) - new Date(a.time)));
                    }
                } catch (e) {
                    console.error("Failed to load chats:", e);
                }
            })();
        }
    }, [subTab, session, loadNotifications]);

    const handleMarkAllRead = async () => {
        await api.markNotificationsRead(session.user.id);
        setNotis(prev => prev.map(n => ({ ...n, read: true })));
        setHasUnread(false);
    };

    const filteredNotis = notifFilter === 'all' ? notis : notis.filter(n => {
        if (notifFilter === 'like') return n.type === 'like' || n.type === 'likes_milestone';
        return n.type === notifFilter;
    });

    // Gatekeeper: split chats by sender verification status
    const inboxChats = chats.filter(c => c.is_verified);
    const requestChats = chats.filter(c => !c.is_verified);
    const hasUnreadInbox = inboxChats.some(c => c.hasUnread);
    const requestCount = requestChats.length;

    const renderNotification = (n) => {
        const config = NOTIF_CONFIG[n.type] || NOTIF_CONFIG.like;
        const Icon = config.icon;

        let message = config.textDE;
        if (n.type === 'likes_milestone' && n.metadata?.count) {
            message = `Dein Video hat ${n.metadata.count} Likes erreicht! 🎉`;
        }

        return (
            <motion.div key={n.id} variants={listItemVariants} className={`flex items-start gap-3.5 p-4 ${cardStyle} ${!n.read ? 'border-l-2 border-l-cyan-400' : ''}`}>
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon size={18} className={config.color} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">
                        {n.type !== 'likes_milestone' && (
                            <span className="font-bold">{n.actor?.full_name || "Jemand"} </span>
                        )}
                        <span className="text-muted-foreground">{message}</span>
                    </p>
                    <span className="text-[10px] text-muted-foreground/60 mt-1 block">{timeAgo(n.created_at)}</span>
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-card overflow-hidden border border-border shrink-0">
                    {n.actor?.avatar_url ? <img src={n.actor.avatar_url} className="w-full h-full object-cover" /> : <User size={14} className="text-muted-foreground m-2" />}
                </div>
            </motion.div>
        );
    };

    const renderChatItem = (c) => (
        <motion.div
            key={c.id}
            variants={listItemVariants}
            whileHover={{ scale: 1.01 }}
            onClick={() => onSelectChat(c)}
            className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-white/5 transition ${cardStyle}`}
        >
            {/* Avatar */}
            <div className="relative" onClick={(e) => { e.stopPropagation(); onUserClick(c); }}>
                <div className="w-14 h-14 rounded-2xl bg-card flex items-center justify-center overflow-hidden flex-shrink-0 hover:opacity-80 transition border border-border">
                    <div className="w-full h-full">{c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" /> : <User size={24} className="text-muted-foreground m-3.5" />}</div>
                </div>
                {/* Unread indicator (Inbox only) */}
                {c.hasUnread && c.is_verified && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                    <h4 className="text-base font-bold text-foreground truncate flex items-center gap-1.5">
                        {c.full_name}
                        {c.verification_status && c.verification_status !== 'unverified' && <VerificationBadge size={14} status={c.verification_status} verificationStatus={c.verification_status} />}
                    </h4>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(c.time)}</span>
                </div>
                <p className={`text-sm truncate ${c.hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{c.lastMsg}</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
        </motion.div>
    );

    return (
        <div className="pb-32 max-w-md mx-auto min-h-screen bg-background">
            <div className={glassHeader}><h2 className="text-2xl font-black text-foreground">Inbox</h2></div>
            <div className="px-4 mt-4">
                <div className="flex bg-card rounded-xl p-1 mb-4 border border-border relative">
                    <button onClick={() => setSubTab('notifications')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all z-10 ${subTab === 'notifications' ? 'bg-muted text-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground/80'}`}>
                        Mitteilungen
                        {hasUnread && subTab !== 'notifications' && <span className="ml-1 w-2 h-2 bg-cyan-400 rounded-full inline-block animate-pulse" />}
                    </button>
                    <button onClick={() => setSubTab('messages')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all z-10 ${subTab === 'messages' ? 'bg-muted text-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground/80'}`}>
                        Nachrichten
                        {hasUnreadInbox && subTab !== 'messages' && <span className="ml-1 w-2 h-2 bg-cyan-400 rounded-full inline-block animate-pulse" />}
                    </button>
                </div>

                {/* Notification filter tabs + mark read */}
                {subTab === 'notifications' && (
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-1.5 overflow-x-auto">
                            {FILTER_TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setNotifFilter(tab.id)}
                                    className={`text-[11px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${notifFilter === tab.id
                                        ? 'bg-indigo-500/15 text-cyan-400 border border-indigo-500/20'
                                        : 'bg-white/5 text-muted-foreground border border-transparent hover:bg-white/10'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        {hasUnread && (
                            <button
                                onClick={handleMarkAllRead}
                                className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition shrink-0 ml-2"
                            >
                                <CheckCheck size={14} /> Gelesen
                            </button>
                        )}
                    </div>
                )}

                {/* Gatekeeper Inbox/Anfragen tabs for messages */}
                {subTab === 'messages' && (
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => setMsgTab('inbox')}
                            className={`flex items-center gap-1.5 text-[11px] font-bold px-4 py-2 rounded-lg transition-all ${msgTab === 'inbox'
                                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20 shadow-[0_0_12px_rgba(255,215,0,0.15)]'
                                : 'bg-white/5 text-muted-foreground border border-transparent hover:bg-white/10'
                                }`}
                        >
                            <ShieldCheck size={14} />
                            Inbox
                            {hasUnreadInbox && (
                                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                            )}
                        </button>
                        <button
                            onClick={() => setMsgTab('requests')}
                            className={`flex items-center gap-1.5 text-[11px] font-bold px-4 py-2 rounded-lg transition-all ${msgTab === 'requests'
                                ? 'bg-white/10 text-foreground border border-white/15'
                                : 'bg-white/5 text-muted-foreground border border-transparent hover:bg-white/10'
                                }`}
                        >
                            <MessageSquare size={14} />
                            Anfragen
                            {requestCount > 0 && (
                                <span className="bg-white/15 text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {requestCount}
                                </span>
                            )}
                        </button>
                    </div>
                )}

                <motion.div
                    variants={listContainerVariants}
                    initial="hidden"
                    animate="visible"
                    key={`${subTab}-${notifFilter}-${msgTab}`}
                    className="space-y-2"
                >
                    {subTab === 'notifications' && (filteredNotis.length > 0 ? filteredNotis.map(renderNotification) : (
                        <EmptyState
                            icon={Bell}
                            title="Alles ruhig hier"
                            description="Poste dein erstes Highlight — die Benachrichtigungen kommen von ganz allein! 🚀"
                        />
                    ))}

                    {/* Gatekeeper: Inbox (verified senders) */}
                    {subTab === 'messages' && msgTab === 'inbox' && (
                        inboxChats.length > 0 ? inboxChats.map(renderChatItem) : (
                            <EmptyState
                                icon={ShieldCheck}
                                title="Keine Elite-Nachrichten"
                                description="Nachrichten von verifizierten Scouts und Agenten erscheinen hier."
                                variant="subtle"
                            />
                        )
                    )}

                    {/* Gatekeeper: Anfragen (unverified senders) */}
                    {subTab === 'messages' && msgTab === 'requests' && (
                        <>
                            {requestChats.length > 0 && (
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-3 mb-2 flex items-start gap-2.5">
                                    <Filter size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        Nachrichten von unverifizierten Nutzern. Prüfe sorgfältig, bevor du antwortest.
                                    </p>
                                </div>
                            )}
                            {requestChats.length > 0 ? requestChats.map(renderChatItem) : (
                                <EmptyState
                                    icon={Mail}
                                    title="Keine Anfragen"
                                    description="Wenn dir jemand Neues schreibt, landet die Nachricht hier."
                                    variant="subtle"
                                />
                            )}
                        </>
                    )}
                </motion.div>
            </div>
        </div>
    );
};
