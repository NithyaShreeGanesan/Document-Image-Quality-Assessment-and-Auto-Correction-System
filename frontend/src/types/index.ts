export type DefectStatus = 'good' | 'warning' | 'critical';
export type QualityClassification = 'Pass' | 'Needs Correction' | 'Fail';

export interface DefectItem {
  metric: string;
  label: string;
  raw_value: number;
  unit: string;
  sub_score: number;
  status: DefectStatus;
  explanation: string;
  extra?: Record<string, any>;
}

export interface RescanGuidanceItem {
  defect: string;
  label?: string;
  severity: DefectStatus;
  title: string;
  tip: string;
  explanation?: string;
}

export interface AssessmentResponse {
  stage: 'before' | 'after';
  overall_score: number;
  classification: QualityClassification;
  blur_score: number;
  blur_raw: number;
  blur_status: DefectStatus;
  skew_score: number;
  skew_angle: number;
  skew_status: DefectStatus;
  brightness_score: number;
  brightness_raw: number;
  brightness_status: DefectStatus;
  contrast_score: number;
  contrast_raw: number;
  contrast_status: DefectStatus;
  noise_score: number;
  noise_raw: number;
  noise_status: DefectStatus;
  resolution_score: number;
  resolution_dpi: number;
  resolution_status: DefectStatus;
  glare_score?: number;
  glare_raw?: number;
  cutoff_score?: number;
  orientation_angle?: number;
  rescan_recommended?: boolean;
  rescan_guidance?: RescanGuidanceItem[];
  defects: DefectItem[];
  improvement_delta?: number;
}

export interface CorrectionItem {
  step_name: string;
  order: number;
  params?: Record<string, any>;
  applied: boolean;
  description?: string;
}

export interface DocumentDetail {
  id: string;
  filename: string;
  file_type: string;
  page_no: number;
  batch_id?: string;
  status: string;
  created_at: string;
  original_url: string;
  corrected_url?: string;
  preset?: string;
  before_assessment?: AssessmentResponse;
  after_assessment?: AssessmentResponse;
  applied_corrections: CorrectionItem[];
  rescan_recommended?: boolean;
  rescan_guidance?: RescanGuidanceItem[];
  ocr_confidence_before?: number;
  ocr_confidence_after?: number;
  ocr_word_count_before?: number;
  ocr_word_count_after?: number;
  ocr_words_recovered?: number;
  ocr_text_before?: string;
  ocr_text_after?: string;
  ocr_engine?: string;
  ocr_message?: string;
  rescan_tips?: string[];
  feedback?: { rating: string; comment?: string };
}


export interface DocumentSummary {
  id: string;
  filename: string;
  file_type: string;
  page_no: number;
  batch_id?: string;
  status: string;
  created_at: string;
  thumbnail_url: string;
  score_before?: number;
  score_after?: number;
  improvement?: number;
  classification?: string;
  top_defects: string[];
}

export interface PaginatedDocuments {
  items: DocumentSummary[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AlertItem {
  id: number;
  document_id?: string;
  message: string;
  severity: 'warning' | 'critical' | 'info';
  read: boolean;
  created_at: string;
  filename?: string;
}

export interface AnalyticsSummary {
  total_documents: number;
  pass_count: number;
  needs_correction_count: number;
  fail_count: number;
  pass_rate: number;
  avg_score_before: number;
  avg_score_after: number;
  avg_improvement: number;
  avg_ocr_confidence_before?: number;
  avg_ocr_confidence_after?: number;
  avg_ocr_confidence_gain?: number;
  total_words_recovered?: number;
  most_common_defects: {
    name: string;
    count: number;
    percentage: number;
  }[];
}

export interface AnalyticsTrendPoint {
  date: string;
  count: number;
  avg_score_before: number;
  avg_score_after: number;
  avg_ocr_confidence_before?: number;
  avg_ocr_confidence_after?: number;
  pass_count: number;
  needs_correction_count: number;
  fail_count: number;
}

export interface SettingsData {
  weights: {
    blur: number;
    skew: number;
    brightness: number;
    contrast: number;
    noise: number;
    resolution: number;
  };
  thresholds: {
    blur: {
      laplacian_good: number;
      laplacian_critical: number;
      tenengrad_good: number;
    };
    skew: {
      angle_good: number;
      angle_critical: number;
      max_angle_limit: number;
    };
    brightness: {
      min_mean: number;
      max_mean: number;
      ideal_mean: number;
      shadow_block_diff_limit: number;
    };
    contrast: {
      std_good: number;
      std_critical: number;
      percentile_range_good: number;
    };
    noise: {
      sigma_good: number;
      sigma_critical: number;
    };
    resolution: {
      min_dpi: number;
      ideal_dpi: number;
      assumed_width_inches: number;
    };
  };
  classification: {
    pass_score: number;
    min_subscore_pass: number;
    fail_score: number;
  };
  corrections: {
    deskew_enabled: boolean;
    illumination_enabled: boolean;
    denoise_enabled: boolean;
    sharpen_enabled: boolean;
    autocrop_enabled: boolean;
    ocr_binarization: boolean;
    denoise_strength_factor: number;
    clahe_clip_limit: number;
    clahe_tile_grid_size: number;
    sharpen_strength_factor: number;
  };
}

export interface PresetItem {
  id: string;
  label: string;
  description: string;
  icon?: string;
  weights: {
    blur: number;
    skew: number;
    brightness: number;
    contrast: number;
    noise: number;
    resolution: number;
  };
  classification: {
    pass_score: number;
    min_subscore_pass: number;
    fail_score: number;
  };
  corrections: {
    deskew_enabled: boolean;
    illumination_enabled: boolean;
    denoise_enabled: boolean;
    sharpen_enabled: boolean;
    autocrop_enabled: boolean;
    ocr_binarization: boolean;
  };
}

export interface ReprocessOptions {
  preset?: string;
  deskew: boolean;
  illumination: boolean;
  denoise: boolean;
  sharpen: boolean;
  autocrop: boolean;
  binarize: boolean;
  clahe_clip_limit?: number;
  force_deskew?: boolean;
  force_illumination?: boolean;
  force_denoise?: boolean;
  force_sharpen?: boolean;
}

