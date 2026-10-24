import os
from pathlib import Path
from typing import Any, Dict
import yaml

DEFAULT_CONFIG_PATH = Path(__file__).resolve().parent.parent / "config.yaml"

DEFAULT_CONFIG: Dict[str, Any] = {
    "weights": {
        "blur": 0.25,
        "skew": 0.15,
        "brightness": 0.15,
        "contrast": 0.15,
        "noise": 0.15,
        "resolution": 0.15,
    },
    "thresholds": {
        "blur": {
            "laplacian_good": 120.0,
            "laplacian_critical": 40.0,
            "tenengrad_good": 600.0,
        },
        "skew": {
            "angle_good": 1.0,
            "angle_critical": 5.0,
            "max_angle_limit": 45.0,
        },
        "brightness": {
            "min_mean": 85.0,
            "max_mean": 215.0,
            "ideal_mean": 150.0,
            "shadow_block_diff_limit": 35.0,
        },
        "contrast": {
            "std_good": 45.0,
            "std_critical": 20.0,
            "percentile_range_good": 140.0,
        },
        "noise": {
            "sigma_good": 5.0,
            "sigma_critical": 18.0,
        },
        "resolution": {
            "min_dpi": 150.0,
            "ideal_dpi": 300.0,
            "assumed_width_inches": 8.27,
        },
    },
    "classification": {
        "pass_score": 75.0,
        "min_subscore_pass": 50.0,
        "fail_score": 45.0,
    },
    "corrections": {
        "deskew_enabled": True,
        "illumination_enabled": True,
        "denoise_enabled": True,
        "sharpen_enabled": True,
        "autocrop_enabled": True,
        "ocr_binarization": False,
        "denoise_strength_factor": 1.2,
        "clahe_clip_limit": 2.0,
        "clahe_tile_grid_size": 8,
        "sharpen_strength_factor": 1.5,
    },
}


def load_config() -> Dict[str, Any]:
    config_path = os.getenv("CONFIG_FILE", str(DEFAULT_CONFIG_PATH))
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                loaded = yaml.safe_load(f)
                if loaded and isinstance(loaded, dict):
                    cfg = DEFAULT_CONFIG.copy()
                    for k, v in loaded.items():
                        if isinstance(v, dict) and k in cfg:
                            cfg[k] = {**cfg[k], **v}
                        else:
                            cfg[k] = v
                    return cfg
        except Exception as e:
            print(f"Warning: Failed to load {config_path}: {e}")
    return DEFAULT_CONFIG.copy()


def save_config(config: Dict[str, Any]) -> None:
    config_path = os.getenv("CONFIG_FILE", str(DEFAULT_CONFIG_PATH))
    with open(config_path, "w", encoding="utf-8") as f:
        yaml.safe_dump(config, f, default_flow_style=False)
