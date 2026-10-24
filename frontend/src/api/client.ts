import axios from 'axios';
import {
  AlertItem,
  AnalyticsSummary,
  AnalyticsTrendPoint,
  DocumentDetail,
  PaginatedDocuments,
  ReprocessOptions,
  SettingsData,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

export const documentApi = {
  upload: async (
    files: File[],
    onProgress?: (percent: number) => void
  ): Promise<{ batch_id: string; document_ids: string[]; count: number }> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

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

  getBatchZipUrl: (batchId: string) => {
    return `/api/documents/batch/${batchId}/zip`;
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
};

export default api;
