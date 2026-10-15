"""
Train Demand Forecasting Model
Member A - Sales Intelligence Module
Algorithm: Random Forest Regressor (one model for orders, one for sales)

Each model predicts a *demand multiplier* relative to the restaurant's
average over the previous 7 days (e.g. Saturday ~1.35x, holiday ~1.4x).
Multiplying back by the live 7-day average makes the forecast work for a
restaurant of any size, which a plain Random Forest cannot extrapolate to.
"""
import os

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

FEATURES = ["day_of_week", "month", "is_weekend", "is_holiday"]

# target column -> 7-day average it is expressed relative to
TARGETS = {
    "orders": "past_7day_avg_orders",
    "sales": "past_7day_avg_sales",
}


def build_model():
    return RandomForestRegressor(
        n_estimators=200,
        max_depth=12,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )


def train_demand_model():
    data_path = os.path.join(os.path.dirname(__file__), "..", "datasets", "demand_data.csv")
    df = pd.read_csv(data_path)
    print(f"[LOAD] Loaded {len(df)} samples from demand_data.csv")

    train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)
    print(f"\n[INFO] Training set: {len(train_df)} samples")
    print(f"[INFO] Test set: {len(test_df)} samples")

    models = {}
    print("\n" + "=" * 50)
    print("MODEL EVALUATION (on actual orders / sales)")
    print("=" * 50)

    for target, baseline in TARGETS.items():
        model = build_model()
        model.fit(train_df[FEATURES], train_df[target] / train_df[baseline])

        # Convert predicted multipliers back to real values for evaluation
        predicted = model.predict(test_df[FEATURES]) * test_df[baseline]
        r2 = r2_score(test_df[target], predicted)
        mae = mean_absolute_error(test_df[target], predicted)
        # Mean absolute percentage error: typical relative miss on unseen days
        mape = (abs(test_df[target] - predicted) / test_df[target].clip(lower=1)).mean()
        unit = "orders" if target == "orders" else "Rs."
        print(f"[{target.upper():6}] R-squared: {r2:.4f} | MAE: {mae:.2f} {unit} | MAPE: {mape:.1%}")

        models[target] = model
        if target == "orders":
            orders_mape = float(mape)

    print("\n[INFO] Feature importance (orders model):")
    ranked = sorted(zip(FEATURES, models["orders"].feature_importances_), key=lambda x: -x[1])
    for name, importance in ranked:
        print(f"   {name:16} {importance:.4f}")

    print("\n[INFO] Learned weekday multipliers (orders, normal month, no holiday):")
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    sample = pd.DataFrame(
        [[d, 6, int(d >= 5), 0] for d in range(7)], columns=FEATURES
    )
    for day, mult in zip(days, models["orders"].predict(sample)):
        print(f"   {day}: {mult:.2f}x")

    models_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    os.makedirs(models_dir, exist_ok=True)
    model_path = os.path.join(models_dir, "demand_model.pkl")
    joblib.dump(
        {
            "orders_model": models["orders"],
            "sales_model": models["sales"],
            "features": FEATURES,
            "target": "multiplier of past 7-day average",
            "orders_mape": orders_mape,  # used as the baseline uncertainty in the API
        },
        model_path,
    )
    print(f"\n[OK] Model saved to {os.path.abspath(model_path)}")


if __name__ == "__main__":
    train_demand_model()
