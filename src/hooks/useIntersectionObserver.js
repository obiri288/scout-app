import { useEffect, useState, useRef } from 'react';

/**
 * Custom hook for Intersection Observer.
 * Returns whether the referenced element is visible in the viewport.
 */
export const useIntersectionObserver = (options = {}) => {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(([entry]) => {
            setIsIntersecting(entry.isIntersecting);
        }, {
            threshold: options.threshold ?? 0.5,
            rootMargin: options.rootMargin ?? '0px',
            ...options,
        });

        observer.observe(element);

        return () => {
            observer.unobserve(element);
            observer.disconnect();
        };
    }, [options.threshold, options.rootMargin]);

    return { ref, isIntersecting };
};
