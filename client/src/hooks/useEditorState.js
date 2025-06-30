import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../utils/urlHelpers';

// Enhanced error handling for API calls
const fetchWithErrorHandling = async (url, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new Error('Request timeout - please try again');
        }

        throw error;
    }
};

export const useEditorState = (compositionId) => {
    const [editorState, setEditorState] = useState({
        videoSrc: '',
        audioSrc: '',
        captionTracks: [],
        styles: {
            fontSize: 40,
            fontFamily: 'Arial Black',
            color: '#FFFFFF',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            textAlign: 'center',
            fontWeight: 'bold',
        },
        animations: {
            entrance: 'fadeIn',
            emphasis: 'bounce',
            exit: 'fadeOut'
        },
        duration: 300,
        compositionName: ''
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isDirty, setIsDirty] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);

    // Load editor session with proper cleanup
    useEffect(() => {
        let isMounted = true;
        const abortController = new AbortController();

        const loadSession = async () => {
            try {
                if (!isMounted) return;
                setIsLoading(true);

                const sessionUrl = `${getApiUrl()}/editor/session/${compositionId}`;
                console.log('📊 Loading editor session from:', sessionUrl);

                const response = await fetchWithErrorHandling(sessionUrl, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to load editor session: ${response.status}`);
                }

                const session = await response.json();
                if (!isMounted) return;

                console.log('📊 Loaded editor session:', session);

                if (session.session_data && Object.keys(session.session_data).length > 0) {
                    console.log('📊 Setting editor state with session data:', session.session_data);
                    setEditorState(prevState => ({
                        ...prevState,
                        ...session.session_data,
                        // Use the same source for audio as video since videos contain audio tracks
                        audioSrc: session.session_data.videoSrc,
                        // Ensure duration is properly set
                        duration: session.session_data.duration || 300
                    }));
                }

                // Also load caption tracks
                const captionsUrl = `${getApiUrl()}/editor/captions/${compositionId}`;
                console.log('📝 Loading captions from:', captionsUrl);

                const captionsResponse = await fetch(captionsUrl, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    signal: abortController.signal
                });

                if (captionsResponse.ok && isMounted) {
                    const tracks = await captionsResponse.json();
                    console.log('📝 Loaded caption tracks:', tracks);
                    setEditorState(prevState => ({
                        ...prevState,
                        captionTracks: tracks
                    }));
                }

                if (isMounted) {
                    setLastSaved(new Date());
                    setIsLoading(false);
                }
            } catch (error) {
                if (isMounted && error.name !== 'AbortError') {
                    console.error('Failed to load editor session:', error);
                    setIsLoading(false);
                }
                // Silently ignore AbortError - this is expected during cleanup
            }
        };

        if (compositionId) {
            loadSession();
        }

        return () => {
            isMounted = false;
            try {
                abortController.abort();
            } catch (error) {
                // Silently ignore abort errors during cleanup
            }
        };
    }, [compositionId]);

    // Update captions
    const updateCaptions = useCallback((tracks) => {
        setEditorState(prevState => ({
            ...prevState,
            captionTracks: tracks
        }));
        setIsDirty(true);
    }, []);

    // Update styles
    const updateStyles = useCallback((styles) => {
        setEditorState(prevState => ({
            ...prevState,
            styles: {
                ...prevState.styles,
                ...styles
            }
        }));
        setIsDirty(true);
    }, []);

    // Update animations
    const updateAnimations = useCallback((animations) => {
        setEditorState(prevState => ({
            ...prevState,
            animations: {
                ...prevState.animations,
                ...animations
            }
        }));
        setIsDirty(true);
    }, []);

    // Save session with proper error handling
    const saveSession = useCallback(async () => {
        let saveAbortController = new AbortController();

        try {
            // Save editor session
            const sessionResponse = await fetch(`${getApiUrl()}/editor/session/${compositionId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                signal: saveAbortController.signal,
                body: JSON.stringify({
                    sessionData: {
                        videoSrc: editorState.videoSrc,
                        styles: editorState.styles,
                        animations: editorState.animations,
                        duration: editorState.duration
                    }
                })
            });

            if (!sessionResponse.ok) {
                throw new Error('Failed to save editor session');
            }

            // Save caption tracks
            if (editorState.captionTracks.length > 0) {
                const captionsResponse = await fetch(`${getApiUrl()}/editor/captions/${compositionId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    signal: saveAbortController.signal,
                    body: JSON.stringify({
                        tracks: editorState.captionTracks
                    })
                });

                if (!captionsResponse.ok) {
                    throw new Error('Failed to save captions');
                }
            }

            setIsDirty(false);
            setLastSaved(new Date());
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Failed to save editor session:', error);
                throw error;
            }
            // Silently ignore AbortError
        } finally {
            saveAbortController = null;
        }
    }, [compositionId, editorState]);

    // Auto-save on changes
    useEffect(() => {
        if (isDirty && !isLoading) {
            const timer = setTimeout(() => {
                saveSession().catch(console.error);
            }, 5000); // Auto-save after 5 seconds of inactivity

            return () => clearTimeout(timer);
        }
    }, [isDirty, isLoading, saveSession]);

    return {
        editorState,
        setEditorState,
        updateCaptions,
        updateStyles,
        updateAnimations,
        saveSession,
        isLoading,
        isDirty,
        lastSaved
    };
};
