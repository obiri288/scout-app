import { useEffect } from 'react';

/**
 * Custom hook to trigger a callback when the component mounts
 * or when the global 'chat-read-sync' event is fired (e.g., when closing a chat).
 */
export const useFocusEffect = (callback) => {
    useEffect(() => {
        // Initial fetch on mount
        callback();
        
        // Listen to global sync event (e.g., returning from ChatWindow)
        const handleSync = () => callback();
        window.addEventListener('chat-read-sync', handleSync);
        
        return () => window.removeEventListener('chat-read-sync', handleSync);
    }, [callback]);
};
