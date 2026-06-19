"""ML prediction API server.

Loads pre-trained model artifacts from model/artifacts/.
Train locally with: python model/train_models.py
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import joblib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ARTIFACTS_DIR = Path(__file__).parent.parent / "model" / "artifacts"

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_state = {
    "trained": None,
    "scaler": None,
    "feature_cols": None,
    "league_encoder": None,
    "results": None,
    "ready": False,
}


class PredictRequest(BaseModel):
    h: float
    d: float
    a: float
    league: str = ""


NAME_MAP = {
    "去水市场基准": "market",
    "逻辑回归": "lr",
    "随机森林": "rf",
    "LightGBM": "lgb",
    "CatBoost": "cat",
    "KNN距离加权": "knn",
    "集成模型": "ensemble",
}


@app.on_event("startup")
def load_models():
    print(f"Loading model artifacts from {ARTIFACTS_DIR} ...")
    try:
        _state["results"] = joblib.load(ARTIFACTS_DIR / "results.joblib")
        _state["trained"] = joblib.load(ARTIFACTS_DIR / "trained_models.joblib")
        _state["scaler"] = joblib.load(ARTIFACTS_DIR / "scaler.joblib")
        _state["feature_cols"] = joblib.load(ARTIFACTS_DIR / "feature_cols.joblib")
        _state["league_encoder"] = joblib.load(ARTIFACTS_DIR / "league_encoder.joblib")
        _state["ready"] = True
        print("Models loaded successfully.")
    except Exception as e:
        print(f"Failed to load models: {e}")
        import traceback
        traceback.print_exc()


def _predict_single(h, d, a, league):
    inv_h, inv_d, inv_a = 1.0 / h, 1.0 / d, 1.0 / a
    overround = inv_h + inv_d + inv_a
    p_h, p_d, p_a = inv_h / overround, inv_d / overround, inv_a / overround

    scaler = _state["scaler"]
    feature_cols = _state["feature_cols"]
    league_encoder = _state["league_encoder"]
    trained = _state["trained"]
    results = _state["results"]

    try:
        league_code = league_encoder.transform([league])[0]
    except (ValueError, KeyError):
        league_code = 0

    row = {
        "odds_h": h, "odds_d": d, "odds_a": a,
        "prob_h": p_h, "prob_d": p_d, "prob_a": p_a,
        "overround": overround,
        "log_h": np.log(h), "log_d": np.log(d), "log_a": np.log(a),
        "ratio_hd": h / d, "ratio_ha": h / a, "ratio_da": d / a,
        "diff_hd": h - d, "diff_ha": h - a,
        "prob_diff_hd": p_h - p_d, "prob_diff_ha": p_h - p_a,
        "prob_max": max(p_h, p_d, p_a),
        "prob_min": min(p_h, p_d, p_a),
        "prob_range": max(p_h, p_d, p_a) - min(p_h, p_d, p_a),
        "league_code": league_code,
    }
    X = pd.DataFrame([row])[feature_cols]
    X_scaled = scaler.transform(X)

    models_out = {}

    market_ll = results["去水市场基准"]["test_logloss"]
    market_br = results["去水市场基准"]["test_brier"]
    models_out["market"] = {
        "name": "去水市场基准",
        "probs": {"H": p_h, "D": p_d, "A": p_a},
        "ev": {"H": p_h * h - 1, "D": p_d * d - 1, "A": p_a * a - 1},
        "log_loss": market_ll,
        "brier": market_br,
    }

    for name, (model, need_scale) in trained.items():
        key = NAME_MAP.get(name, name)
        Xi = X_scaled if need_scale else X
        probs = model.predict_proba(Xi)[0]
        ev = [float(probs[i] * o - 1) for i, o in enumerate([h, d, a])]
        test_ll = results[name]["test_logloss"]
        test_br = results[name]["test_brier"]
        models_out[key] = {
            "name": name,
            "probs": {"H": float(probs[0]), "D": float(probs[1]), "A": float(probs[2])},
            "ev": {"H": ev[0], "D": ev[1], "A": ev[2]},
            "log_loss": test_ll,
            "brier": test_br,
        }

    if "集成模型" in results:
        top_names = []
        ensemble_candidates = {k: v for k, v in results.items() if k != "KNN距离加权"}
        top_models = sorted(ensemble_candidates.items(), key=lambda x: x[1].get("val_logloss") or 999)
        top_names = [n for n, _ in top_models[:4]]

        weights_raw = np.array([1.0 / results[n]["val_logloss"] for n in top_names if results[n].get("val_logloss")])
        weights = weights_raw / weights_raw.sum()

        ens_probs = np.zeros(3)
        for w, n in zip(weights, top_names):
            key = NAME_MAP.get(n, n)
            if key in models_out:
                m = models_out[key]
                ens_probs += w * np.array([m["probs"]["H"], m["probs"]["D"], m["probs"]["A"]])

        models_out["ensemble"] = {
            "name": "集成模型",
            "probs": {"H": float(ens_probs[0]), "D": float(ens_probs[1]), "A": float(ens_probs[2])},
            "ev": {
                "H": float(ens_probs[0] * h - 1),
                "D": float(ens_probs[1] * d - 1),
                "A": float(ens_probs[2] * a - 1),
            },
            "log_loss": results["集成模型"]["test_logloss"],
            "brier": results["集成模型"]["test_brier"],
        }

    return models_out


@app.post("/predict")
def predict(req: PredictRequest):
    if not _state["ready"]:
        return {"error": "Models not loaded yet", "models": {}}
    models_out = _predict_single(req.h, req.d, req.a, req.league)
    return {"models": models_out}


@app.get("/health")
def health():
    return {"status": "ok", "models_loaded": _state["ready"]}
