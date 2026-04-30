import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useFocusEffect } from '../hooks/useFocusEffect';
import { Mail, Bell, User, ChevronRight, Heart, UserPlus, Bookmark, Star, Trophy, CheckCheck, Filter, ShieldCheck, MessageSquare, Shirt, Menu, MoreVertical, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as api from '../lib/api';
import { cardStyle, glassHeader } from '../lib/styles';
import { useToast } from '../contexts/ToastContext';
import { GuestFallback } from './GuestFallback';
import { EmptyState } from './EmptyState';
import { VerificationBadge } from './VerificationBadge';
import { useUser } from '../contexts/UserContext';

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

const NOTIF_CONFIG = {
    like: { icon: Heart, color: 'text-red-400', bg: 'bg-red-500/15' },
    follow: { icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-500/15' },
    watchlist_add: { icon: Bookmark, color: 'text-amber-400', bg: 'bg-amber-500/15' },
    rating: { icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/15' },
    likes_milestone: { icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
    comment: { icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-500/15' },
    endorse: { icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    team_join: { icon: Shirt, color: 'text-indigo-400', bg: 'bg-indigo-500/15' },
    new_registration: { icon: UserPlus, color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
};

const getNotifText = (n) => {
    const name = n.actor?.full_name || n.actor?.username || 'Ein Nutzer';
    
    switch (n.type) {
        case 'like':            return <><span className="font-bold">{name}</span> hat dein Video geliked.</>;
        case 'follow':          return <><span className="font-bold">{name}</span> folgt dir jetzt.</>;
        case 'watchlist_add':   return <><span className="font-bold">{name}</span> hat dich auf die Watchlist gesetzt! 🔥</>;
        case 'endorsement':     return <><span className="font-bold">{name}</span> hat deine Skills bestätigt.</>;
        case 'likes_milestone': return 'Dein Video hat einen Meilenstein erreicht! 🎉';
        case 'comment':         return <><span className="font-bold">{name}</span> hat dein Video kommentiert.</>;
        default:                return n.message || 'Neue Aktivität in deinem Profil';
    }
};

const FILTER_TABS = [
    { id: 'all', label: 'Alle' },
    { id: 'follow', label: 'Follower' },
    { id: 'like', label: 'Likes' },
    { id: 'scouts', label: 'Scouts' },
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

export const InboxScreen = ({ session, onSelectChat, onUserClick, onLoginReq, onMenuOpen, setUnreadMessageUsersCount }) => {
    const { currentUserProfile, liveNotifications, setLiveNotifications, unreadCount, resetUnreadCount } = useUser();
    const { addToast } = useToast();
    const [subTab, setSubTab] = useState('messages');
    const [notis, setNotis] = useState([]);
    const [chats, setChats] = useState([]);
    const [notifFilter, setNotifFilter] = useState('all');
    const [loadingNotis, setLoadingNotis] = useState(false);
    const [msgTab, setMsgTab] = useState('inbox'); // 'inbox' | 'requests'
    const [greetedUsers, setGreetedUsers] = useState(new Set());
    const [followedUsers, setFollowedUsers] = useState(new Set());
    const [activeMenuChat, setActiveMenuChat] = useState(null);

    if (!session) return <div className="pt-20"><GuestFallback icon={Mail} title="Posteingang" text="Melde dich an, um mit Scouts und anderen Spielern zu chatten." onLogin={onLoginReq} /></div>;

    const loadNotifications = useCallback(async () => {
        if (!currentUserProfile?.id) return;
        setLoadingNotis(true);
        try {
            const data = await api.fetchNotifications(currentUserProfile.id);
            setNotis(data);
        } catch (e) {
            console.error("Failed to load notifications:", e);
        } finally {
            setLoadingNotis(false);
        }
    }, [currentUserProfile?.id]);

    // Sync local notifications with global live stream
    useEffect(() => {
        if (liveNotifications.length === 0) return;
        setNotis(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newItems = liveNotifications.filter(n => !existingIds.has(n.id));
            if (newItems.length === 0) return prev;
            return [...newItems, ...prev];
        });
    }, [liveNotifications]);

    const fetchChats = useCallback(async () => {
        if (!session?.user?.id) return;
        try {
            const { data } = await supabase.from('direct_messages')
                .select('*')
                .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
                .order('created_at', { ascending: false })
                .limit(100);

            const map = new Map();
            // Track exact unread message counts per partner
            const unreadCountMap = new Map();
            (data || []).forEach(m => {
                const pid = m.sender_id === session.user.id ? m.receiver_id : m.sender_id;
                if (!map.has(pid)) map.set(pid, m);
                // Track if there are unread messages from this partner
                if (m.sender_id !== session.user.id && !m.is_read) {
                    unreadCountMap.set(pid, (unreadCountMap.get(pid) || 0) + 1);
                }
            });

            if (map.size > 0) {
                const { data: users } = await supabase.from('players_master')
                    .select('*')
                    .in('user_id', [...map.keys()])
                    .eq('is_deactivated', false);
                setChats((users || []).map(u => ({
                    ...u,
                    lastMsg: map.get(u.user_id)?.content,
                    time: map.get(u.user_id)?.created_at,
                    unreadCount: unreadCountMap.get(u.user_id) || 0,
                })).sort((a, b) => new Date(b.time) - new Date(a.time)));
            } else {
                setChats([]);
            }
        } catch (e) {
            console.error("Failed to load chats:", e);
        }
    }, [session?.user?.id]);

    useFocusEffect(useCallback(() => {
        if (subTab === 'messages') {
            fetchChats();
        }
    }, [subTab, fetchChats]));

    useEffect(() => {
        if (subTab === 'notifications') {
            loadNotifications();
        }
    }, [subTab, loadNotifications]);

    // Listen for global chat badge clear events
    useEffect(() => {
        const handleClearBadge = (e) => {
            const { chatId } = e.detail;
            setChats(prev => prev.map(chat => chat.user_id === chatId ? { ...chat, unreadCount: 0 } : chat));
        };
        window.addEventListener('clearChatBadge', handleClearBadge);
        return () => window.removeEventListener('clearChatBadge', handleClearBadge);
    }, []);

    // Realtime listener for messages to update Inbox list immediately
    useEffect(() => {
        if (!session?.user?.id) return;
        
        const channel = supabase.channel('inbox-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'direct_messages',
                filter: `receiver_id=eq.${session.user.id}`
            }, () => {
                if (subTab === 'messages') {
                    fetchChats();
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [session?.user?.id, subTab, fetchChats]);

    const handleMarkAllRead = async () => {
        if (!currentUserProfile?.id) return;
        try {
            await api.markNotificationsRead(currentUserProfile.id);
            setNotis(prev => prev.map(n => ({ ...n, is_read: true })));
            resetUnreadCount();
            setLiveNotifications([]);
        } catch (e) {
            addToast('Fehler beim Markieren.', 'error');
        }
    };

    const filteredNotis = notis.filter(n => {
        if (notifFilter === 'all') return true;
        if (notifFilter === 'like') return n.type === 'like' || n.type === 'likes_milestone';
        if (notifFilter === 'scouts') return n.type === 'scout_request' || n.type === 'watchlist_add';
        return n.type === notifFilter;
    });

    const hasUnreadNotis = unreadCount > 0 || notis.some(n => !n.is_read);

    // Gatekeeper: split chats by sender verification status
    const inboxChats = chats.filter(c => c.is_verified);
    const requestChats = chats.filter(c => !c.is_verified);
    const hasUnreadInbox = inboxChats.some(c => c.unreadCount > 0);
    const requestCount = requestChats.length;

    const handleGreetTeamMember = async (actor) => {
        if (!actor || !actor.user_id) return;
        try {
            const firstName = actor.full_name?.split(' ')[0] || 'Neuzugang';
            await api.sendMessage(session.user.id, actor.user_id, `Hey ${firstName}, willkommen im Team! 🚀`);
            setGreetedUsers(prev => new Set(prev).add(actor.user_id));
        } catch (error) {
            console.error("Fehler beim Senden der Willkommensnachricht:", error);
        }
    };

    const handleSayHey = async (actor) => {
        if (!actor || !actor.user_id) return;
        try {
            const firstName = actor.full_name?.split(' ')[0] || 'Hey';
            await api.sendMessage(session.user.id, actor.user_id, `Hey ${firstName} 👋, willkommen bei Cavio!`);
            setGreetedUsers(prev => new Set(prev).add(actor.user_id));
        } catch (error) {
            console.error("Fehler beim Senden der Hey-Nachricht:", error);
        }
    };

    const handleQuickFollow = async (actor) => {
        if (!actor || !actor.id || !session) return;

        // 1. Optimistic UI Update (Sofortiges Feedback)
        setFollowedUsers(prev => new Set(prev).add(actor.user_id));

        try {
            // Resolve current user's players_master.id (FK-consistent)
            const myPlayerId = await api.getPlayerIdFromUserId(session.user.id);
            if (!myPlayerId) throw new Error('Player profile not found');

            // User möchte folgen -> REINER INSERT (both IDs are players_master.id)
            const { error } = await supabase
                .from('follows')
                .insert({ follower_id: myPlayerId, following_id: actor.id });

            if (error) throw error;
        } catch (error) {
            // 2. Rollback bei Fehler (Aus dem Set entfernen)
            console.error("Follow Error:", error);
            addToast("Aktion fehlgeschlagen.", 'error');
            setFollowedUsers(prev => {
                const updated = new Set(prev);
                updated.delete(actor.user_id);
                return updated;
            });
        }
    };

    const handleOpenChat = (c) => {
        if (c.unreadCount > 0) {
            // 1. Optimistic list update
            setChats(prev => prev.map(chat => chat.id === c.id ? { ...chat, unreadCount: 0 } : chat));
            // 2. Optimistic global badge update
            setUnreadMessageUsersCount?.(prev => Math.max(0, prev - 1));
            // 3. Fire-and-forget DB update with RLS logging
            supabase.from('direct_messages')
                .update({ is_read: true })
                .eq('receiver_id', session.user.id)
                .eq('sender_id', c.user_id)
                .eq('is_read', false)
                .select()
                .then(({ data, error }) => {
                    if (error) console.error("Supabase RLS Error in handleOpenChat:", error);
                    else console.log("Optimistic update confirmed by Supabase:", data);
                });
        }
        
        // Broadcast global clear just in case
        window.dispatchEvent(new CustomEvent('clearChatBadge', { detail: { chatId: c.user_id } }));
        onSelectChat(c);
    };

    const handleMarkUnread = async (c) => {
        // Optimistic UI
        setChats(prev => prev.map(chat => chat.id === c.id ? { ...chat, unreadCount: 1 } : chat));
        setUnreadMessageUsersCount?.(prev => prev + 1);

        // Find the most recent message received from this user and mark unread
        const { data } = await supabase.from('direct_messages')
            .select('id')
            .eq('receiver_id', session.user.id)
            .eq('sender_id', c.user_id)
            .order('created_at', { ascending: false })
            .limit(1);
        if (data && data.length > 0) {
            await supabase.from('direct_messages')
                .update({ is_read: false })
                .eq('id', data[0].id);
        }
    };

    const handleDeleteChat = async (c) => {
        if (window.confirm('Wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            try {
                // Hard delete all messages between these two users
                const { error } = await supabase.from('direct_messages')
                    .delete()
                    .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${c.user_id}),and(sender_id.eq.${c.user_id},receiver_id.eq.${session.user.id})`);
                
                if (error) {
                    console.error('Lösch-Fehler:', error);
                    addToast('Chat konnte nicht gelöscht werden.', 'error');
                    return;
                }

                // Successful? Update state locally
                setChats(prev => prev.filter(chat => chat.id !== c.id));
                if (c.unreadCount > 0) {
                    setUnreadMessageUsersCount?.(prev => Math.max(0, prev - 1));
                }
                addToast('Chat wurde gelöscht.', 'info');
            } catch (e) {
                console.error('Catch-Lösch-Fehler:', e);
                addToast('Ein unerwarteter Fehler ist aufgetreten.', 'error');
            }
        }
    };

    const renderNotification = (n) => {
        const config = NOTIF_CONFIG[n.type] || NOTIF_CONFIG.like;
        const Icon = config.icon;
        const isUnread = !n.is_read;

        return (
            <motion.div 
                key={n.id} 
                variants={listItemVariants} 
                onClick={() => {
                    if (isUnread) {
                        setNotis(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
                        api.markNotificationRead(n.id).catch(() => {});
                    }
                    if (n.actor) onUserClick(n.actor);
                }}
                className={`flex items-start gap-4 p-4 cursor-pointer transition-all border-b border-white/5 ${cardStyle} ${isUnread ? 'bg-cyan-500/5' : ''}`}
            >
                {/* Avatar Left */}
                <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-card flex items-center justify-center overflow-hidden border border-border shadow-sm">
                        {n.actor?.avatar_url ? (
                            <img src={n.actor.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center ${config.bg}`}>
                                <Icon size={20} className={config.color} />
                            </div>
                        )}
                    </div>
                    {isUnread && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full border-2 border-background shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                    )}
                </div>

                {/* Content Right */}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-1">
                        <div className="text-[15px] text-foreground leading-tight">
                            {getNotifText(n)}
                        </div>
                        <span className="text-xs text-muted-foreground/60">{timeAgo(n.created_at)}</span>
                    </div>

                    {/* Interactive Actions (GREETER) */}
                    {(n.type === 'team_join' || n.type === 'new_registration') && n.actor && !greetedUsers.has(n.actor.user_id) && (
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); n.type === 'team_join' ? handleGreetTeamMember(n.actor) : handleSayHey(n.actor); }}
                                className="text-[11px] font-bold py-1.5 px-4 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
                            >
                                {n.type === 'team_join' ? 'Begrüßen 👋' : 'Sag Hey 👋'}
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        );
    };

    const renderChatItem = (c) => (
        <motion.div
            key={c.id}
            variants={listItemVariants}
            whileHover={{ scale: 1.01 }}
            onClick={() => handleOpenChat(c)}
            className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-white/5 transition border-b border-white/5 ${cardStyle}`}
        >
            {/* Column 1: Avatar */}
            <div className="relative flex-shrink-0" onClick={(e) => { e.stopPropagation(); onUserClick(c); }}>
                <div className="w-14 h-14 rounded-2xl bg-card flex items-center justify-center overflow-hidden border border-border shadow-sm">
                    <div className="w-full h-full">
                        {c.avatar_url ? (
                            <img src={c.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                            <User size={24} className="text-muted-foreground m-3.5" />
                        )}
                    </div>
                </div>
            </div>

            {/* Column 2: Content (Flex-1) */}
            <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-0.5">
                    <h4 className="text-base font-bold text-foreground truncate flex items-center gap-1.5 leading-tight">
                        <span className="truncate">{c.full_name}</span>
                        {c.verification_status && c.verification_status !== 'unverified' && (
                            <VerificationBadge size={14} status={c.verification_status} verificationStatus={c.verification_status} />
                        )}
                    </h4>
                    <p className={`text-sm truncate leading-tight ${c.unreadCount > 0 ? 'text-blue-400 font-medium' : 'text-muted-foreground/60'}`}>
                        {c.unreadCount > 0 
                            ? `${c.unreadCount > 5 ? '5+' : c.unreadCount} neue Nachricht${c.unreadCount === 1 ? '' : 'en'}` 
                            : 'Tippe, um den Chat zu öffnen'}
                    </p>
                </div>
            </div>

            {/* Column 3: Meta & Actions */}
            <div className="flex flex-col items-end justify-between h-14 py-0.5 flex-shrink-0 min-w-[70px]">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{timeAgo(c.time)}</span>
                
                <div className="flex items-center gap-2 mt-auto">
                    {c.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg animate-in zoom-in ring-2 ring-background">
                            {c.unreadCount > 5 ? '5+' : c.unreadCount}
                        </span>
                    )}
                    
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setActiveMenuChat(c); 
                        }}
                        className="p-2 text-muted-foreground hover:text-foreground transition rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                    >
                        <MoreVertical size={16} />
                    </button>
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="pb-32 max-w-md mx-auto min-h-screen bg-background">
            <div className={`${glassHeader} flex items-center gap-3`}>
                <h2 className="text-2xl font-black text-foreground">Inbox</h2>
            </div>
            <div className="px-4 mt-4">
                <div className="flex bg-card rounded-xl p-1 mb-4 border border-border relative">
                    <button onClick={() => setSubTab('messages')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all z-10 ${subTab === 'messages' ? 'bg-muted text-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground/80'}`}>
                        Nachrichten
                        {hasUnreadInbox && subTab !== 'messages' && <span className="ml-1 w-2 h-2 bg-cyan-400 rounded-full inline-block animate-pulse" />}
                    </button>
                    <button onClick={() => setSubTab('notifications')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all z-10 ${subTab === 'notifications' ? 'bg-muted text-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground/80'}`}>
                        Aktivitäten
                        {hasUnreadNotis && subTab !== 'notifications' && <span className="ml-1 w-2 h-2 bg-cyan-400 rounded-full inline-block animate-pulse" />}
                    </button>
                </div>

                {/* Notification filter tabs + mark read */}
                {subTab === 'notifications' && (
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                            {FILTER_TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setNotifFilter(tab.id)}
                                    className={`text-[11px] font-bold px-3.5 py-2 rounded-lg whitespace-nowrap transition-all ${notifFilter === tab.id
                                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_12px_rgba(34,211,238,0.1)]'
                                        : 'bg-white/5 text-muted-foreground border border-transparent hover:bg-white/10'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        {hasUnreadNotis && (
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
                                title="Keine offiziellen Nachrichten"
                                description="Hier erscheinen ausschließlich Nachrichten von verifizierten Trainern, Scouts und Managern."
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

            {/* Native-like Action Sheet for Chat Options */}
            {activeMenuChat && (
                <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={(e) => { e.stopPropagation(); setActiveMenuChat(null); }}></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 sm:rounded-2xl rounded-t-2xl flex flex-col animate-in slide-in-from-bottom duration-300 shadow-2xl border border-border pb-safe">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-white dark:bg-zinc-900 sm:rounded-t-2xl rounded-t-2xl">
                            <h2 className="text-lg font-bold text-foreground">Chat-Optionen</h2>
                            <button onClick={(e) => { e.stopPropagation(); setActiveMenuChat(null); }} className="p-2 bg-black/5 dark:bg-white/5 rounded-full text-muted-foreground hover:text-foreground transition">
                                <span className="text-xl font-bold leading-none px-1">×</span>
                            </button>
                        </div>
                        <div className="p-2 space-y-1">
                            <button onClick={(e) => { e.stopPropagation(); onUserClick(activeMenuChat); setActiveMenuChat(null); }} className="w-full px-4 py-4 flex items-center gap-3 text-base text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground transition rounded-xl">
                                <User size={20} /> Profil ansehen
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleMarkUnread(activeMenuChat); setActiveMenuChat(null); }} className="w-full px-4 py-4 flex items-center gap-3 text-base text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground transition rounded-xl">
                                <Mail size={20} /> Als ungelesen markieren
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteChat(activeMenuChat); setActiveMenuChat(null); }} className="w-full px-4 py-4 flex items-center gap-3 text-base text-red-400 hover:bg-red-500/10 hover:text-red-300 transition border-t border-border mt-2 rounded-xl font-medium">
                                <Trash2 size={20} /> Chat löschen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
