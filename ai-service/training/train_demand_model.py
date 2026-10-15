"""
Train Demand Forecasting Model
Member A - Sales Intelligence Module
Algorithm: Random Forest Regressor (multi-output: orders + sales)
"""
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

FEATURES = [
    "day_of_week",
    "month",
    "is_weekend",
    "is_holiday",
    "past_7day_avg_orders",
    "past_7day_avg_sales",
]
TARGETS = ["orders", "sales"]


def train_demand_model():
    data_path = os.path.join(os.path.dirname(__file__), "..", "datasets", "demand_data.csv")
    df = pd.read_csv(data_path)
    print(f"[LOAD] Loaded {len(df)} samples from demand_data.csv")

    X = df[FEATURES]
    y = df[TARGETS]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"\n[INFO] Training set: {len(X_train)} samples")
    print(f"[INFO] Test set: {len(X_test)} samples")

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )

    print("\n[TRAIN] Training Random Forest Regressor (orders + sales)...")
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print("\n" + "=" * 50)
    print("MODEL EVALUATION")
    print("=" * 50)
    for i, target in enumerate(TARGETS):
        r2 = r2_score(y_test[target], y_pred[:, i])
        mae = mean_absolute_error(y_test[target], y_pred[:, i])
        unit = "orders" if target == "orders" else "Rs."
        print(f"[{target.upper():6}] R-squared: {r2:.4f} | MAE: {mae:.2f} {unit}")

    print("\n[INFO] Feature importance:")
    ranked = sorted(zip(FEATURES, model.feature_importances_), key=lambda x: -x[1])
    for name, importance in ranked:
        print(f"   {name:24} {importance:.4f}")

    models_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    os.makedirs(models_dir, exist_ok=True)
    model_path = os.path.join(models_dir, "demand_model.pkl")
    joblib.dump({"model": model, "features": FEATURES, "targets": TARGETS}, model_path)
    print(f"\n[OK] Model saved to {os.path.abspath(model_path)}")


if __name__ == "__main__":
    train_demand_model()
