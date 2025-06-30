import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// Main WebSocket hook for general connections
export const useWebSocket = () => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;

    useEffect(() => {
        const connectWebSocket = () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('No authentication token found');
                    return;
                }

                const socketInstance = io('http://localhost:5000', {
                    auth: {
                        token
                    },
                    transports: ['websocket', 'polling'], // Try websocket first
                    timeout: 10000,
                    forceNew: true,
                    autoConnect: true
                });

                socketInstance.on('connect', () => {
                    console.log('WebSocket connected');
                    setIsConnected(true);
                    setError(null);
                    reconnectAttemptsRef.current = 0;
                });

                socketInstance.on('disconnect', (reason) => {
                    console.log('WebSocket disconnected:', reason);
                    setIsConnected(false);

                    // Auto-reconnect on certain disconnect reasons
                    if (reason === 'io server disconnect') {
                        // Server initiated disconnect, don't reconnect
                        setError('Disconnected by server');
                    } else {
                        // Client disconnect or network issues, attempt to reconnect
                        attemptReconnect();
                    }
                });

                socketInstance.on('connect_error', (error) => {
                    console.error('WebSocket connection error:', error);
                    setError(`Connection failed: ${error.message}`);
                    setIsConnected(false);
                    attemptReconnect();
                });

                socketInstance.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    setError(`Socket error: ${error}`);
                });

                // Editor-specific events
                socketInstance.on('editor-update', (data) => {
                    // Handle real-time editor updates from other users
                    console.log('Received editor update:', data);
                });

                socketInstance.on('render-progress', (data) => {
                    // Handle render progress updates
                    console.log('Render progress:', data);
                });

                setSocket(socketInstance);

                const attemptReconnect = () => {
                    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

                        reconnectTimeoutRef.current = setTimeout(() => {
                            console.log(`Attempting to reconnect... (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
                            reconnectAttemptsRef.current += 1;
                            socketInstance.connect();
                        }, delay);
                    } else {
                        setError('Max reconnection attempts reached');
                    }
                };

                return socketInstance;
            } catch (error) {
                console.error('Failed to create WebSocket connection:', error);
                setError(`Failed to initialize connection: ${error.message}`);
                return null;
            }
        };

        const socketInstance = connectWebSocket();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            if (socketInstance) {
                try {
                    socketInstance.off('connect');
                    socketInstance.off('disconnect');
                    socketInstance.off('connect_error');
                    socketInstance.off('error');
                    socketInstance.off('editor-update');
                    socketInstance.off('render-progress');
                    socketInstance.disconnect();
                } catch (error) {
                    // Silently ignore cleanup errors
                }
            }
        };
    }, []);

    // Emit events with error handling
    const emit = (event, data, callback) => {
        if (socket && isConnected) {
            socket.emit(event, data, callback);
        } else {
            console.warn(`Cannot emit ${event}: WebSocket not connected`);
            if (callback) {
                callback({ error: 'WebSocket not connected' });
            }
        }
    };

    // Join editor room
    const joinEditor = (compositionId) => {
        emit('join-editor', { compositionId });
    };

    // Leave editor room
    const leaveEditor = (compositionId) => {
        emit('leave-editor', { compositionId });
    };

    // Send editor update
    const sendEditorUpdate = (compositionId, update) => {
        emit('editor-update', { compositionId, update });
    };

    // Subscribe to render progress
    const subscribeToRenderProgress = (jobId) => {
        emit('subscribe-render-progress', { jobId });
    };

    // Unsubscribe from render progress
    const unsubscribeFromRenderProgress = (jobId) => {
        emit('unsubscribe-render-progress', { jobId });
    };

    return {
        socket,
        isConnected,
        error,
        emit,
        joinEditor,
        leaveEditor,
        sendEditorUpdate,
        subscribeToRenderProgress,
        unsubscribeFromRenderProgress
    };
};

// WebSocket hook specifically for real-time editor collaboration
export const useEditorWebSocket = (compositionId) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectedUsers, setConnectedUsers] = useState([]);
    const [lastUpdate, setLastUpdate] = useState(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

    useEffect(() => {
        if (!compositionId) return;

        // Create socket connection
        const socketUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

        const newSocket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            timeout: 20000,
            reconnection: true,
            reconnectionAttempts: maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
        });

        // Connection event handlers
        newSocket.on('connect', () => {
            console.log('🔌 Editor WebSocket connected:', newSocket.id);
            setIsConnected(true);
            reconnectAttempts.current = 0;

            // Join the editor room for this composition
            newSocket.emit('join-editor', compositionId);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('🔌 Editor WebSocket disconnected:', reason);
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('🔌 Editor WebSocket connection error:', error);
            setIsConnected(false);
            reconnectAttempts.current++;

            if (reconnectAttempts.current >= maxReconnectAttempts) {
                console.error('🔌 Max reconnection attempts reached');
                newSocket.disconnect();
            }
        });

        // Real-time collaboration events
        newSocket.on('user-joined', (data) => {
            console.log('👥 User joined editor:', data.userId);
            setConnectedUsers(prev => [...prev, data.userId]);
        });

        newSocket.on('caption-updated', (data) => {
            console.log('📝 Caption updated by another user:', data);
            setLastUpdate({
                type: 'caption-update',
                data,
                timestamp: Date.now()
            });
        });

        newSocket.on('timeline-position-updated', (data) => {
            console.log('⏱️ Timeline position updated by another user:', data);
            setLastUpdate({
                type: 'timeline-seek',
                data,
                timestamp: Date.now()
            });
        });

        newSocket.on('style-updated', (data) => {
            console.log('🎨 Style updated by another user:', data);
            setLastUpdate({
                type: 'style-update',
                data,
                timestamp: Date.now()
            });
        });

        setSocket(newSocket);

        // Cleanup
        return () => {
            console.log('🔌 Cleaning up Editor WebSocket connection');
            try {
                if (newSocket) {
                    newSocket.off();
                    newSocket.disconnect();
                }
            } catch (error) {
                // Silently ignore cleanup errors
            }
        };
    }, [compositionId]);

    // WebSocket action methods
    const actions = {
        // Send caption updates to other users
        updateCaption: (captionId, changes) => {
            if (socket && isConnected) {
                socket.emit('caption-update', {
                    compositionId,
                    captionId,
                    changes
                });
            }
        },

        // Send timeline position updates
        seekTimeline: (currentFrame) => {
            if (socket && isConnected) {
                socket.emit('timeline-seek', {
                    compositionId,
                    currentFrame
                });
            }
        },

        // Send style updates
        updateStyle: (styleChanges) => {
            if (socket && isConnected) {
                socket.emit('style-update', {
                    compositionId,
                    styleChanges
                });
            }
        }
    };

    return {
        socket,
        isConnected,
        connectedUsers,
        lastUpdate,
        actions
    };
};
