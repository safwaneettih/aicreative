import axios from 'axios';
import { getApiUrl } from '../utils/urlHelpers';

const API_BASE_URL = getApiUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Workspace {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  product_category?: string;
  target_market?: string;
  created_at: string;
  updated_at: string;
}

export interface RawVideo {
  id: number;
  workspace_id: number;
  filename: string;
  original_name: string;
  file_path: string;
  file_size: number;
  duration?: number;
  format?: string;
  resolution?: string;
  processed: boolean;
  created_at: string;
}

export interface VideoClip {
  id: number;
  raw_video_id: number;
  name: string;
  category: 'Hook' | 'Body' | 'cat';
  start_time: number;
  end_time: number;
  file_path: string;
  duration: number;
  created_at: string;
}

export interface Script {
  id: number;
  workspace_id: number;
  title: string;
  content: string;
  style?: string;
  tone?: string;
  target_audience?: string;
  created_at: string;
  updated_at: string;
  voiceover_count?: number;
}

export interface Voice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  style: string;
  description?: string;
}

export interface Voiceover {
  id: number;
  script_id: number;
  voice_name: string;
  voice_id: string;
  file_path: string;
  duration?: number;
  created_at: string;
  voice_info?: Voice;
  script_title?: string;
}

export interface VideoComposition {
  id: number;
  workspace_id: number;
  name: string;
  hook_clip_id?: number;
  body_clip_ids: number[];
  cat_clip_id?: number;
  voiceover_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_path?: string;
  duration?: number;
  logo_overlay_path?: string;
  logo_position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  logo_opacity?: number;
  logo_size?: 'small' | 'medium' | 'large';
  enable_captions?: boolean;
  caption_style?: 'default' | 'modern' | 'bold' | 'minimal';
  created_at: string;
  updated_at: string;
}

export interface CompositionJob {
  id: string;
  compositions: VideoComposition[];
  total_count: number;
  completed_count: number;
  failed_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface CaptionStyle {
  style_id: string;
  name: string;
  description: string;
}

export interface CompositionRequest {
  name: string;
  combinations: {
    hook_clip_id?: number;
    body_clip_ids: number[];
    cat_clip_id?: number;
    voiceover_id: number;
    logo_overlay_path?: string;
    logo_position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    logo_opacity?: number;
    logo_size?: 'small' | 'medium' | 'large';
    enable_captions?: boolean;
    caption_style?: 'default' | 'modern' | 'bold' | 'minimal';
    tiktok_captions_enabled?: boolean;
    tiktok_caption_style?: string;
  }[];
}

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),

  getProfile: () =>
    api.get('/auth/me'),

  logout: () =>
    api.post('/auth/logout'),
};

// Workspaces API
export const workspacesAPI = {
  getAll: () =>
    api.get<Workspace[]>('/workspaces'),

  getById: (id: number) =>
    api.get<Workspace>(`/workspaces/${id}`),

  create: (data: Partial<Workspace>) =>
    api.post<Workspace>('/workspaces', data),

  update: (id: number, data: Partial<Workspace>) =>
    api.put<Workspace>(`/workspaces/${id}`, data),

  delete: (id: number) =>
    api.delete(`/workspaces/${id}`),

  getAnalytics: (id: number) =>
    api.get(`/workspaces/${id}/analytics`),
};

// Videos API
export const videosAPI = {
  upload: (workspaceId: number, file: File) => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('workspaceId', workspaceId.toString());

    return api.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  process: (videoId: number) =>
    api.post(`/videos/${videoId}/process`),

  getByWorkspace: (workspaceId: number) =>
    api.get<RawVideo[]>(`/videos/workspace/${workspaceId}`),

  getClips: (videoId: number) =>
    api.get<VideoClip[]>(`/videos/${videoId}/clips`),

  delete: (videoId: number) =>
    api.delete(`/videos/${videoId}`),
};

// Scripts API
export const scriptsAPI = {
  generate: (data: {
    workspaceId: number;
    title: string;
    style?: string;
    tone?: string;
    target_audience?: string;
    prompt?: string;
  }) =>
    api.post<Script>('/scripts/generate', data),

  getByWorkspace: (workspaceId: number) =>
    api.get<Script[]>(`/scripts/workspace/${workspaceId}`),

  getById: (id: number) =>
    api.get<Script>(`/scripts/${id}`),

  update: (id: number, data: Partial<Script>) =>
    api.put<Script>(`/scripts/${id}`, data),

  delete: (id: number) =>
    api.delete(`/scripts/${id}`),

  duplicate: (id: number) =>
    api.post<Script>(`/scripts/${id}/duplicate`),
};

// Voices API
export const voicesAPI = {
  getAvailable: () =>
    api.get<Voice[]>('/voices/available'),

  generate: (scriptId: number, voiceId: string) =>
    api.post<Voiceover>('/voices/generate', { scriptId, voiceId }),

  getByScript: (scriptId: number) =>
    api.get<Voiceover[]>(`/voices/script/${scriptId}`),

  getByWorkspace: (workspaceId: number) =>
    api.get<Voiceover[]>(`/voices/workspace/${workspaceId}`),

  getById: (id: number) =>
    api.get<Voiceover>(`/voices/${id}`),

  delete: (id: number) =>
    api.delete(`/voices/${id}`),

  fixDurations: (workspaceId: number) =>
    api.post(`/voices/fix-durations/${workspaceId}`)
};

// Video Compositions API
export const compositionsAPI = {
  uploadLogo: (workspaceId: number, logoFile: File) => {
    const formData = new FormData();
    formData.append('logo', logoFile);
    return api.post(`/compositions/upload-logo/${workspaceId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  create: (workspaceId: number, data: CompositionRequest) =>
    api.post<CompositionJob>(`/compositions/workspace/${workspaceId}`, data),

  getByWorkspace: (workspaceId: number) =>
    api.get<VideoComposition[]>(`/compositions/workspace/${workspaceId}`),

  getJob: (jobId: string) =>
    api.get<CompositionJob>(`/compositions/job/${jobId}`),

  getById: (id: number) =>
    api.get<VideoComposition>(`/compositions/${id}`),

  delete: (id: number) =>
    api.delete(`/compositions/${id}`),

  bulkDelete: (workspaceId: number, compositionIds: number[]) =>
    api.delete(`/compositions/bulk/${workspaceId}`, {
      data: { compositionIds }
    }),

  generateCombinations: (workspaceId: number, data: {
    hook_clip_ids: number[];
    body_clip_ids: number[];
    cat_clip_ids: number[];
    voiceover_ids: number[];
    max_combinations?: number;
  }) =>
    api.post(`/compositions/workspace/${workspaceId}/generate-combinations`, data),

  getCaptionStyles: () =>
    api.get<{ success: boolean; styles: CaptionStyle[] }>('/compositions/caption-styles'),
};

export default api;
