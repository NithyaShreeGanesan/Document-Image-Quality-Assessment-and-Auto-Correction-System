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

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});


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
      headers: { 'Content-Type': 'multipart/form-data' },
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
    return `/api/documents/${id}/download?variant=${variant}`;
  },

  getReportUrl: (id: string) => {
    return `/api/documents/${id}/report`;
  },

  getBatchZipUrl: (batchId: string) => {
    return `/api/documents/batch/${batchId}/zip`;
  },

  getBatchReportUrl: (batchId: string) => {
    return `/api/documents/batch/${batchId}/report`;
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


export default api;
