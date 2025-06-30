class EditorApiService {
    constructor() {
        this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        this.apiUrl = `${this.baseUrl}/api/editor`;
    }

    // Get auth headers
    getAuthHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    // Handle API responses
    async handleResponse(response) {
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Network error' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        return response.json();
    }

    // Editor Session Management
    async getEditorSession(compositionId) {
        const response = await fetch(`${this.apiUrl}/session/${compositionId}`, {
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    }

    async saveEditorSession(compositionId, sessionData) {
        const response = await fetch(`${this.apiUrl}/session/${compositionId}`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ sessionData })
        });
        return this.handleResponse(response);
    }

    async deleteEditorSession(compositionId) {
        const response = await fetch(`${this.apiUrl}/session/${compositionId}`, {
            method: 'DELETE',
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    }

    // Preview Generation
    async generatePreview(compositionId, inputProps, frame = 0) {
        const response = await fetch(`${this.apiUrl}/preview`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({
                compositionId,
                inputProps,
                frame
            })
        });
        return this.handleResponse(response);
    }

    // Caption Management
    async getCaptions(compositionId) {
        const response = await fetch(`${this.apiUrl}/captions/${compositionId}`, {
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    }

    async updateCaptions(compositionId, tracks) {
        const response = await fetch(`${this.apiUrl}/captions/${compositionId}`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ tracks })
        });
        return this.handleResponse(response);
    }

    async addCaptionTrack(compositionId, trackData) {
        const response = await fetch(`${this.apiUrl}/captions/track`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({
                compositionId,
                ...trackData
            })
        });
        return this.handleResponse(response);
    }

    async deleteCaptionTrack(trackId) {
        const response = await fetch(`${this.apiUrl}/captions/track/${trackId}`, {
            method: 'DELETE',
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    }

    // Rendering and Export
    async startRender(compositionId, settings) {
        const response = await fetch(`${this.apiUrl}/render`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({
                compositionId,
                settings
            })
        });
        return this.handleResponse(response);
    }

    async getRenderStatus(jobId) {
        const response = await fetch(`${this.apiUrl}/render/${jobId}`, {
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    }

    async cancelRender(jobId) {
        const response = await fetch(`${this.apiUrl}/render/${jobId}`, {
            method: 'DELETE',
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    }

    // Queue Management
    async getQueueStats() {
        const response = await fetch(`${this.apiUrl}/queue/stats`, {
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    }

    // Timeline Management
    async getTimeline(compositionId) {
        const response = await fetch(`${this.apiUrl}/timeline/${compositionId}`, {
            headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
    }

    async updateTimeline(compositionId, timelineData) {
        const response = await fetch(`${this.apiUrl}/timeline/${compositionId}`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(timelineData)
        });
        return this.handleResponse(response);
    }

    // Utility methods
    async uploadAsset(file, type = 'media') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        const response = await fetch(`${this.apiUrl}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
                // Don't set Content-Type for FormData, browser will set it with boundary
            },
            body: formData
        });
        return this.handleResponse(response);
    }

    async getAssetUrl(assetPath) {
        return `${this.baseUrl}/uploads/${assetPath}`;
    }

    // Export presets
    getExportPresets() {
        return {
            'tiktok-hd': {
                name: 'TikTok HD',
                width: 1080,
                height: 1920,
                fps: 30,
                codec: 'h264',
                crf: 23,
                format: 'mp4'
            },
            'tiktok-sd': {
                name: 'TikTok SD',
                width: 720,
                height: 1280,
                fps: 30,
                codec: 'h264',
                crf: 28,
                format: 'mp4'
            },
            'instagram-story': {
                name: 'Instagram Story',
                width: 1080,
                height: 1920,
                fps: 30,
                codec: 'h264',
                crf: 23,
                format: 'mp4'
            },
            'youtube-shorts': {
                name: 'YouTube Shorts',
                width: 1080,
                height: 1920,
                fps: 30,
                codec: 'h264',
                crf: 18,
                format: 'mp4'
            },
            'high-quality': {
                name: 'High Quality',
                width: 1080,
                height: 1920,
                fps: 60,
                codec: 'h264',
                crf: 18,
                format: 'mp4'
            }
        };
    }

    // Real-time collaboration helpers
    generateCollaborationUrl(compositionId) {
        return `${window.location.origin}/editor/${compositionId}`;
    }

    // Error handling utilities
    isNetworkError(error) {
        return !navigator.onLine || error.message.includes('NetworkError') || error.message.includes('Failed to fetch');
    }

    isAuthError(error) {
        return error.message.includes('401') || error.message.includes('Unauthorized');
    }

    isRateLimitError(error) {
        return error.message.includes('429') || error.message.includes('Too Many Requests');
    }
}

export default new EditorApiService();
