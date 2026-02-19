import React from 'react';

// Feed skeleton with pulsing placeholders
export const FeedSkeleton = () => (
    <div className="max-w-md mx-auto space-y-6 pt-4">
        {[1, 2, 3].map(i => (
            <div key={i} className="bg-black border-b border-zinc-900/50 pb-6">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 bg-zinc-800 rounded w-24 animate-pulse" />
                        <div className="h-2 bg-zinc-800/60 rounded w-16 animate-pulse" />
                    </div>
                </div>
                {/* Video placeholder */}
                <div className="aspect-[4/5] bg-zinc-900 animate-pulse" />
                {/* Actions */}
                <div className="px-4 pt-4 flex gap-6">
                    <div className="h-7 w-14 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-7 w-14 bg-zinc-800 rounded animate-pulse" />
                </div>
            </div>
        ))}
    </div>
);

// Profile skeleton
export const ProfileSkeleton = () => (
    <div className="animate-in fade-in">
        <div className="relative bg-zinc-900 pb-6 rounded-b-[2rem] overflow-hidden">
            <div className="absolute inset-0 h-40 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-black" />
            <div className="flex flex-col items-center pt-16 relative z-10 px-6">
                {/* Avatar */}
                <div className="w-32 h-32 rounded-full bg-zinc-800 animate-pulse mb-4" />
                {/* Name */}
                <div className="h-6 bg-zinc-800 rounded w-40 animate-pulse mb-2" />
                {/* Club */}
                <div className="h-4 bg-zinc-800/60 rounded w-28 animate-pulse mb-4" />
                {/* Status pill */}
                <div className="h-6 bg-zinc-800/40 rounded-full w-24 animate-pulse mb-6" />
                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3 w-full mb-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center">
                            <div className="h-5 w-8 bg-zinc-800 rounded animate-pulse mb-2" />
                            <div className="h-2 w-12 bg-zinc-800/60 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
                {/* Action buttons */}
                <div className="w-full flex gap-3">
                    <div className="flex-1 h-12 bg-zinc-800 rounded-xl animate-pulse" />
                    <div className="w-12 h-12 bg-zinc-800 rounded-xl animate-pulse" />
                </div>
            </div>
        </div>
        {/* Video grid skeleton */}
        <div className="grid grid-cols-3 gap-0.5 mt-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="aspect-[3/4] bg-zinc-900 animate-pulse" />
            ))}
        </div>
    </div>
);

// Search results skeleton
export const SearchSkeleton = () => (
    <div className="space-y-3 pt-4">
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-4 p-3 bg-zinc-900/40 rounded-2xl border border-white/5">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 animate-pulse" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-800 rounded w-28 animate-pulse" />
                    <div className="h-3 bg-zinc-800/60 rounded w-20 animate-pulse" />
                </div>
                <div className="w-4 h-4 bg-zinc-800/40 rounded animate-pulse" />
            </div>
        ))}
    </div>
);
