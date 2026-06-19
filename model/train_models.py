#!/usr/bin/env python3
"""
足球竞彩赔率 → 赛果概率预测：多模型训练与评估
"""

import sqlite3
import warnings
import numpy as np
import pandas as pd
from pathlib import Path

import threadpoolctl
_orig_make = threadpoolctl._ThreadpoolInfo._make_module_from_path
def _safe_make(self, filepath):
    try:
        return _orig_make(self, filepath)
    except AttributeError:
        return
threadpoolctl._ThreadpoolInfo._make_module_from_path = _safe_make

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import log_loss, brier_score_loss
import lightgbm as lgb
from catboost import CatBoostClassifier

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

plt.rcParams["font.sans-serif"] = ["Arial Unicode MS", "PingFang SC", "Heiti SC", "SimHei"]
plt.rcParams["axes.unicode_minus"] = False

warnings.filterwarnings("ignore")

DB_PATH = Path(__file__).parent.parent / "data" / "lottery.db"

# ── 1. 数据读取 ─────────────────────────────────────────────

def load_data():
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query("""
        SELECT match_date, league_name_abbr, h, d, a, win_flag
        FROM matches
        WHERE h IS NOT NULL AND d IS NOT NULL AND a IS NOT NULL
          AND win_flag IN ('H','D','A')
        ORDER BY match_date
    """, conn)
    conn.close()
    return df


# ── 2. 特征工程 ─────────────────────────────────────────────

def build_features(df):
    h, d, a = df["h"], df["d"], df["a"]

    inv_h, inv_d, inv_a = 1.0 / h, 1.0 / d, 1.0 / a
    overround = inv_h + inv_d + inv_a

    # 去水概率
    p_h = inv_h / overround
    p_d = inv_d / overround
    p_a = inv_a / overround

    features = pd.DataFrame({
        # 原始赔率
        "odds_h": h, "odds_d": d, "odds_a": a,
        # 去水概率
        "prob_h": p_h, "prob_d": p_d, "prob_a": p_a,
        # overround
        "overround": overround,
        # 赔率对数
        "log_h": np.log(h), "log_d": np.log(d), "log_a": np.log(a),
        # 赔率比值
        "ratio_hd": h / d, "ratio_ha": h / a, "ratio_da": d / a,
        # 赔率差值
        "diff_hd": h - d, "diff_ha": h - a,
        # 概率差值
        "prob_diff_hd": p_h - p_d, "prob_diff_ha": p_h - p_a,
        # 最大/最小概率
        "prob_max": np.maximum(p_h, np.maximum(p_d, p_a)),
        "prob_min": np.minimum(p_h, np.minimum(p_d, p_a)),
        "prob_range": np.maximum(p_h, np.maximum(p_d, p_a)) - np.minimum(p_h, np.minimum(p_d, p_a)),
    })

    le = LabelEncoder()
    features["league_code"] = le.fit_transform(df["league_name_abbr"])

    return features, le


# ── 3. 时间切分 ─────────────────────────────────────────────

def time_split(df, train_end="2022-12-31", val_end="2024-06-30"):
    train_mask = df["match_date"] <= train_end
    val_mask = (df["match_date"] > train_end) & (df["match_date"] <= val_end)
    test_mask = df["match_date"] > val_end
    return train_mask, val_mask, test_mask


# ── 4. 去水市场基准 ─────────────────────────────────────────

def market_baseline(df):
    inv_h, inv_d, inv_a = 1.0 / df["h"], 1.0 / df["d"], 1.0 / df["a"]
    overround = inv_h + inv_d + inv_a
    probs = np.column_stack([inv_h / overround, inv_d / overround, inv_a / overround])
    return probs


# ── 5. 模型定义 ─────────────────────────────────────────────

def get_models():
    return {
        "逻辑回归": LogisticRegression(
            multi_class="multinomial", solver="lbfgs",
            max_iter=2000, C=1.0
        ),
        "随机森林": RandomForestClassifier(
            n_estimators=300, max_depth=12, min_samples_leaf=50,
            n_jobs=-1, random_state=42
        ),
        "KNN距离加权": KNeighborsClassifier(
            n_neighbors=200, weights="distance", metric="euclidean",
            n_jobs=1
        ),
        "LightGBM": lgb.LGBMClassifier(
            n_estimators=500, max_depth=6, learning_rate=0.05,
            num_leaves=31, min_child_samples=50,
            subsample=0.8, colsample_bytree=0.8,
            random_state=42, verbose=-1, n_jobs=-1
        ),
        "CatBoost": CatBoostClassifier(
            iterations=500, depth=6, learning_rate=0.05,
            l2_leaf_reg=3, random_seed=42, verbose=0,
            cat_features=["league_code"]
        ),
    }


# ── 6. 评估指标 ─────────────────────────────────────────────

LABEL_MAP = {"H": 0, "D": 1, "A": 2}
LABEL_NAMES = ["主胜", "平局", "客胜"]


def encode_labels(y):
    return np.array([LABEL_MAP[v] for v in y])


def calc_metrics(y_true_enc, probs, n_classes=3):
    ll = log_loss(y_true_enc, probs, labels=[0, 1, 2])

    bs = 0.0
    for c in range(n_classes):
        y_bin = (y_true_enc == c).astype(float)
        bs += brier_score_loss(y_bin, probs[:, c])
    bs /= n_classes

    return ll, bs


def calibration_by_bin(y_true_enc, probs, n_bins=10):
    """返回每个类别的校准数据: (mean_pred, mean_actual) per bin"""
    result = {}
    for c, name in enumerate(LABEL_NAMES):
        y_bin = (y_true_enc == c).astype(float)
        p = probs[:, c]
        bin_edges = np.linspace(0, 1, n_bins + 1)
        mean_pred, mean_actual, counts = [], [], []
        for i in range(n_bins):
            mask = (p >= bin_edges[i]) & (p < bin_edges[i + 1])
            if i == n_bins - 1:
                mask = (p >= bin_edges[i]) & (p <= bin_edges[i + 1])
            if mask.sum() > 0:
                mean_pred.append(p[mask].mean())
                mean_actual.append(y_bin[mask].mean())
                counts.append(mask.sum())
        result[name] = (np.array(mean_pred), np.array(mean_actual), np.array(counts))
    return result


# ── 7. 训练与评估流程 ───────────────────────────────────────

def train_and_evaluate():
    print("=" * 60)
    print("足球竞彩赔率预测模型 — 训练与评估")
    print("=" * 60)

    # 加载数据
    df = load_data()
    print(f"\n总数据量: {len(df)} 场")
    print(f"时间范围: {df['match_date'].min()} ~ {df['match_date'].max()}")

    # 特征工程
    features, league_encoder = build_features(df)
    y = df["win_flag"].values
    y_enc = encode_labels(y)

    # 时间切分
    train_mask, val_mask, test_mask = time_split(df)
    print(f"\n训练集: {train_mask.sum()} 场 (≤ 2022-12-31)")
    print(f"验证集: {val_mask.sum()} 场 (2023-01-01 ~ 2024-06-30)")
    print(f"测试集: {test_mask.sum()} 场 (> 2024-06-30)")

    X_train = features[train_mask]
    X_val = features[val_mask]
    X_test = features[test_mask]
    y_train, y_val, y_test = y_enc[train_mask], y_enc[val_mask], y_enc[test_mask]

    # 标准化（给逻辑回归和KNN用）
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    # ── 去水市场基准 ──
    print("\n" + "─" * 60)
    print("模型训练与评估")
    print("─" * 60)

    results = {}

    market_probs_val = market_baseline(df[val_mask])
    market_probs_test = market_baseline(df[test_mask])
    ll_val, bs_val = calc_metrics(y_val, market_probs_val)
    ll_test, bs_test = calc_metrics(y_test, market_probs_test)
    results["去水市场基准"] = {
        "val_logloss": ll_val, "val_brier": bs_val,
        "test_logloss": ll_test, "test_brier": bs_test,
        "test_probs": market_probs_test,
    }
    print(f"\n{'去水市场基准':　<12} | 验证 LogLoss: {ll_val:.5f}  Brier: {bs_val:.5f}"
          f" | 测试 LogLoss: {ll_test:.5f}  Brier: {bs_test:.5f}")

    # ── 训练各模型 ──
    models = get_models()
    trained = {}

    for name, model in models.items():
        print(f"\n训练 {name} ...")
        need_scale = name in ("逻辑回归", "KNN距离加权")
        Xtr = X_train_scaled if need_scale else X_train
        Xva = X_val_scaled if need_scale else X_val
        Xte = X_test_scaled if need_scale else X_test

        model.fit(Xtr, y_train)

        # 概率校准（用验证集，sigmoid 比 isotonic 更稳健）
        if name not in ("CatBoost", "KNN距离加权"):
            cal_model = CalibratedClassifierCV(model, method="sigmoid", cv="prefit")
            cal_model.fit(Xva, y_val)
        else:
            cal_model = model

        probs_val = cal_model.predict_proba(Xva)
        probs_test = cal_model.predict_proba(Xte)

        ll_val, bs_val = calc_metrics(y_val, probs_val)
        ll_test, bs_test = calc_metrics(y_test, probs_test)

        results[name] = {
            "val_logloss": ll_val, "val_brier": bs_val,
            "test_logloss": ll_test, "test_brier": bs_test,
            "test_probs": probs_test,
        }
        trained[name] = (cal_model, need_scale)

        print(f"{'':　<12}{name:　<12} | 验证 LogLoss: {ll_val:.5f}  Brier: {bs_val:.5f}"
              f" | 测试 LogLoss: {ll_test:.5f}  Brier: {bs_test:.5f}")

    # ── 模型集成 ──
    print(f"\n构建模型集成 ...")
    ensemble_candidates = {k: v for k, v in results.items() if k != "KNN距离加权"}
    top_models = sorted(ensemble_candidates.items(), key=lambda x: x[1]["val_logloss"])
    top3_names = [name for name, _ in top_models[:4]]
    print(f"  选取验证集 LogLoss 最低的模型: {top3_names}")

    weights_raw = np.array([1.0 / results[n]["val_logloss"] for n in top3_names])
    weights = weights_raw / weights_raw.sum()
    print(f"  权重: {dict(zip(top3_names, [f'{w:.3f}' for w in weights]))}")

    ensemble_probs_test = sum(
        w * results[n]["test_probs"] for w, n in zip(weights, top3_names)
    )
    ll_test, bs_test = calc_metrics(y_test, ensemble_probs_test)
    results["集成模型"] = {
        "val_logloss": None, "val_brier": None,
        "test_logloss": ll_test, "test_brier": bs_test,
        "test_probs": ensemble_probs_test,
    }
    print(f"  集成模型 | 测试 LogLoss: {ll_test:.5f}  Brier: {bs_test:.5f}")

    # ── 结果汇总 ──
    print("\n" + "=" * 60)
    print("测试集结果汇总 (按 LogLoss 排序)")
    print("=" * 60)
    print(f"{'模型':<14} {'LogLoss':>10} {'Brier':>10}")
    print("─" * 36)
    sorted_results = sorted(results.items(), key=lambda x: x[1]["test_logloss"])
    for name, m in sorted_results:
        print(f"{name:<14} {m['test_logloss']:>10.5f} {m['test_brier']:>10.5f}")

    best_name = sorted_results[0][0]
    print(f"\n最佳模型: {best_name}")

    # ── 校准曲线 ──
    plot_calibration(y_test, results, sorted_results)

    # ── 保存预测函数所需的对象 ──
    return results, trained, scaler, features.columns.tolist(), league_encoder, best_name


# ── 8. 校准曲线绘图 ─────────────────────────────────────────

def plot_calibration(y_test, results, sorted_results):
    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    colors = plt.cm.Set2(np.linspace(0, 1, len(sorted_results)))

    for c, (ax, label) in enumerate(zip(axes, LABEL_NAMES)):
        ax.plot([0, 1], [0, 1], "k--", alpha=0.5, label="完美校准")
        for i, (name, m) in enumerate(sorted_results):
            cal = calibration_by_bin(y_test, m["test_probs"])
            mp, ma, _ = cal[label]
            if len(mp) > 0:
                ax.plot(mp, ma, "o-", color=colors[i], label=name, markersize=4)
        ax.set_xlabel("预测概率")
        ax.set_ylabel("实际频率")
        ax.set_title(f"{label} 校准曲线")
        ax.legend(fontsize=7, loc="upper left")
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.set_aspect("equal")

    plt.tight_layout()
    out_path = Path(__file__).parent / "calibration_curves.png"
    plt.savefig(out_path, dpi=150)
    plt.close()
    print(f"\n校准曲线已保存: {out_path}")


# ── 9. 预测函数 ─────────────────────────────────────────────

def predict_match(odds_h, odds_d, odds_a, league="英超",
                  trained_models=None, scaler=None, feature_cols=None,
                  league_encoder=None, results=None):
    """给定一组赔率，输出各模型的预测概率和EV"""

    inv_h, inv_d, inv_a = 1.0 / odds_h, 1.0 / odds_d, 1.0 / odds_a
    overround = inv_h + inv_d + inv_a
    p_h, p_d, p_a = inv_h / overround, inv_d / overround, inv_a / overround

    try:
        league_code = league_encoder.transform([league])[0]
    except ValueError:
        league_code = 0

    row = {
        "odds_h": odds_h, "odds_d": odds_d, "odds_a": odds_a,
        "prob_h": p_h, "prob_d": p_d, "prob_a": p_a,
        "overround": overround,
        "log_h": np.log(odds_h), "log_d": np.log(odds_d), "log_a": np.log(odds_a),
        "ratio_hd": odds_h / odds_d, "ratio_ha": odds_h / odds_a, "ratio_da": odds_d / odds_a,
        "diff_hd": odds_h - odds_d, "diff_ha": odds_h - odds_a,
        "prob_diff_hd": p_h - p_d, "prob_diff_ha": p_h - p_a,
        "prob_max": max(p_h, p_d, p_a),
        "prob_min": min(p_h, p_d, p_a),
        "prob_range": max(p_h, p_d, p_a) - min(p_h, p_d, p_a),
        "league_code": league_code,
    }
    X = pd.DataFrame([row])[feature_cols]

    X_scaled = scaler.transform(X)

    print(f"\n{'='*60}")
    print(f"赔率: 主胜 {odds_h}  平局 {odds_d}  客胜 {odds_a}  联赛: {league}")
    print(f"去水概率: 主胜 {p_h:.1%}  平局 {p_d:.1%}  客胜 {p_a:.1%}")
    print(f"{'='*60}")
    print(f"{'模型':<14} {'主胜%':>7} {'平局%':>7} {'客胜%':>7} | {'EV主胜':>8} {'EV平局':>8} {'EV客胜':>8} | 建议")
    print("─" * 80)

    # 去水基准
    ev = [p * o - 1 for p, o in zip([p_h, p_d, p_a], [odds_h, odds_d, odds_a])]
    best_ev = max(ev)
    suggestion = ["主胜", "平局", "客胜"][ev.index(best_ev)] if best_ev > 0 else "不下注"
    print(f"{'去水市场基准':<14} {p_h:>6.1%} {p_d:>6.1%} {p_a:>6.1%}"
          f" | {ev[0]:>+7.1%} {ev[1]:>+7.1%} {ev[2]:>+7.1%} | {suggestion}")

    # 各训练模型
    for name, (model, need_scale) in trained_models.items():
        Xi = X_scaled if need_scale else X
        probs = model.predict_proba(Xi)[0]
        ev = [probs[i] * o - 1 for i, o in enumerate([odds_h, odds_d, odds_a])]
        best_ev = max(ev)
        suggestion = ["主胜", "平局", "客胜"][ev.index(best_ev)] if best_ev > 0 else "不下注"
        print(f"{name:<14} {probs[0]:>6.1%} {probs[1]:>6.1%} {probs[2]:>6.1%}"
              f" | {ev[0]:>+7.1%} {ev[1]:>+7.1%} {ev[2]:>+7.1%} | {suggestion}")


# ── 10. 模型导出与加载 ────────────────────────────────────────

import joblib

EXPORT_DIR = Path(__file__).parent / "artifacts"


def export_models(results, trained, scaler, feature_cols, league_encoder):
    """训练完成后导出所有模型到 model/artifacts/ 目录。"""
    EXPORT_DIR.mkdir(exist_ok=True)
    joblib.dump(trained, EXPORT_DIR / "trained_models.joblib")
    joblib.dump(scaler, EXPORT_DIR / "scaler.joblib")
    joblib.dump(feature_cols, EXPORT_DIR / "feature_cols.joblib")
    joblib.dump(league_encoder, EXPORT_DIR / "league_encoder.joblib")
    joblib.dump({k: {"val_logloss": v.get("val_logloss"), "test_logloss": v["test_logloss"], "test_brier": v["test_brier"]} for k, v in results.items()}, EXPORT_DIR / "results.joblib")
    print(f"\n模型已导出到: {EXPORT_DIR}")


def load_exported_models():
    """从 model/artifacts/ 加载已训练的模型。"""
    return (
        joblib.load(EXPORT_DIR / "results.joblib"),
        joblib.load(EXPORT_DIR / "trained_models.joblib"),
        joblib.load(EXPORT_DIR / "scaler.joblib"),
        joblib.load(EXPORT_DIR / "feature_cols.joblib"),
        joblib.load(EXPORT_DIR / "league_encoder.joblib"),
    )


# ── 11. 主入口 ──────────────────────────────────────────────

if __name__ == "__main__":
    results, trained, scaler, feature_cols, league_encoder, best_name = train_and_evaluate()
    export_models(results, trained, scaler, feature_cols, league_encoder)

    print("\n\n" + "=" * 60)
    print("示例预测")
    print("=" * 60)

    predict_match(1.59, 3.55, 4.58, league="英超",
                  trained_models=trained, scaler=scaler,
                  feature_cols=feature_cols, league_encoder=league_encoder,
                  results=results)

    predict_match(2.15, 3.20, 3.10, league="德甲",
                  trained_models=trained, scaler=scaler,
                  feature_cols=feature_cols, league_encoder=league_encoder,
                  results=results)

    predict_match(1.22, 5.80, 9.50, league="西甲",
                  trained_models=trained, scaler=scaler,
                  feature_cols=feature_cols, league_encoder=league_encoder,
                  results=results)
