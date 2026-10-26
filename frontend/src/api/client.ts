import axios from 'axios';
import {
  AlertItem,
  AnalyticsSummary,
  AnalyticsTrendPoint,
  DocumentDetail,
  FeedbackItem,
  PaginatedDocuments,
  PresetItem,
  ReprocessOptions,
  SettingSuggestion,
  SettingsData,
  UserSatisfactionData,
} from '../types';
import { User, TokenResponse } from '../types/auth';

const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  // Default to relative /api (works with Vite dev proxy and Netlify _redirects)
  return '/api';
};

export const API_BASE_URL = getBaseUrl();

/**
 * Resolves API/asset URLs so that image and file paths resolve properly
 * whether using direct backend URL or local/Netlify proxy.
 */
export const resolveApiUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) {
    return url.startsWith('/') ? url : `/${url}`;
  }

  const cleanBase = envUrl.trim().replace(/\/+$/, '');
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  if (cleanBase.endsWith('/api') && cleanUrl.startsWith('/api/')) {
    return `${cleanBase.slice(0, -4)}${cleanUrl}`;
  }
  return `${cleanBase}${cleanUrl}`;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

// Attach Authorization header if token exists in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('docuquality_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: on 401 Unauthorized, clear token and redirect to /signin
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('docuquality_token');
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/signin') && !currentPath.startsWith('/signup') && currentPath !== '/') {
        window.location.href = '/signin';
      }
    }
    return Promise.reject(error);
  }
);


export const documentApi = {
  upload: async (
    files: File[],
    preset: string = 'auto',
    onProgress?: (percent: number) => void
  ): Promise<{ batch_id: string; document_ids: string[]; count: number }> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('preset', preset);

    const response = await api.post('/documents/upload', formData, {
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
    return response.data;
  },


  get: async (id: string): Promise<DocumentDetail> => {
    const response = await api.get<DocumentDetail>(`/documents/${id}`);
    return response.data;
  },

  list: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    min_score?: number;
    max_score?: number;
    search?: string;
    batch_id?: string;
  }): Promise<PaginatedDocuments> => {
    const response = await api.get<PaginatedDocuments>('/documents', { params });
    return response.data;
  },

  reprocess: async (id: string, options: ReprocessOptions): Promise<DocumentDetail> => {
    const response = await api.post<DocumentDetail>(`/documents/${id}/reprocess`, options);
    return response.data;
  },

  delete: async (id: string): Promise<{ message: string; id: string }> => {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  },

  getDownloadUrl: (id: string, variant: 'corrected' | 'original' | 'zip' = 'corrected') => {
    return resolveApiUrl(`/api/documents/${id}/download?variant=${variant}`);
  },

  getReportUrl: (id: string) => {
    return resolveApiUrl(`/api/documents/${id}/report`);
  },

  getBatchZipUrl: (batchId: string) => {
    return resolveApiUrl(`/api/documents/batch/${batchId}/zip`);
  },

  getBatchReportUrl: (batchId: string) => {
    return resolveApiUrl(`/api/documents/batch/${batchId}/report`);
  },


  listSamples: async (): Promise<{ filename: string; label: string; size: number }[]> => {
    const response = await api.get('/documents/samples/list');
    return response.data;
  },

  processSample: async (
    filename: string
  ): Promise<{ batch_id: string; document_ids: string[]; count: number }> => {
    const response = await api.post(`/documents/samples/process/${filename}`);
    return response.data;
  },

  submitFeedback: async (
    id: string,
    feedback: { rating: 'thumbs_up' | 'thumbs_down'; comment?: string; disliked_steps?: string[] }
  ): Promise<FeedbackItem> => {
    const response = await api.post<FeedbackItem>(`/documents/${id}/feedback`, feedback);
    return response.data;
  },

  getFeedback: async (id: string): Promise<FeedbackItem | null> => {
    const response = await api.get<FeedbackItem | null>(`/documents/${id}/feedback`);
    return response.data;
  },
};

export const analyticsApi = {
  getSummary: async (): Promise<AnalyticsSummary> => {
    const response = await api.get<AnalyticsSummary>('/analytics/summary');
    return response.data;
  },

  getTrends: async (days: number = 14): Promise<AnalyticsTrendPoint[]> => {
    const response = await api.get<AnalyticsTrendPoint[]>('/analytics/trends', {
      params: { days },
    });
    return response.data;
  },

  getFeedback: async (): Promise<UserSatisfactionData> => {
    const response = await api.get<UserSatisfactionData>('/analytics/feedback');
    return response.data;
  },
};

export const alertsApi = {
  list: async (unreadOnly: boolean = false): Promise<AlertItem[]> => {
    const response = await api.get<AlertItem[]>('/alerts', {
      params: { unread_only: unreadOnly },
    });
    return response.data;
  },

  markRead: async (id: number): Promise<{ message: string }> => {
    const response = await api.put(`/alerts/${id}/read`);
    return response.data;
  },

  markAllRead: async (): Promise<{ message: string }> => {
    const response = await api.put('/alerts/mark-all-read');
    return response.data;
  },
};

export const settingsApi = {
  get: async (): Promise<SettingsData> => {
    const response = await api.get<SettingsData>('/settings');
    return response.data;
  },

  update: async (data: Partial<SettingsData>): Promise<{ message: string; settings: SettingsData }> => {
    const response = await api.put('/settings', data);
    return response.data;
  },

  getPresets: async (): Promise<PresetItem[]> => {
    const response = await api.get<PresetItem[]>('/settings/presets');
    return response.data;
  },

  updatePreset: async (
    presetId: string,
    data: Partial<PresetItem>
  ): Promise<{ message: string; preset: PresetItem }> => {
    const response = await api.put(`/settings/presets/${presetId}`, data);
    return response.data;
  },

  getSuggestions: async (): Promise<SettingSuggestion[]> => {
    const response = await api.get<SettingSuggestion[]>('/settings/suggestions');
    return response.data;
  },

  applySuggestion: async (data: {
    suggestion_id: string;
    parameters: Record<string, any>;
    target_type?: string;
    preset_id?: string;
  }): Promise<{ status: string; message?: string; suggestion_id: string }> => {
    const response = await api.post('/settings/suggestions/apply', data);
    return response.data;
  },
};

export const healthApi = {
  check: async (): Promise<{ status: string; service?: string }> => {
    const response = await api.get<{ status: string; service?: string }>('/health');
    return response.data;
  },
};

export const authApi = {
  login: async (credentials: { email: string; password: string }): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/login', credentials);
    return response.data;
  },

  register: async (data: { full_name: string; email: string; password: string }): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/register', data);
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
};

export default api;
