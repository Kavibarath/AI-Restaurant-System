"""
Train Inventory Forecasting Model
Member B - Inventory Intelligence Module
Algorithm: Random Forest Regressor
"""
import pandas as pd
import numpy as np
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def train_inventory_model():
    """Train and save the inventory forecasting model"""

    # Load data
    data_path = os.path.join(os.path.dirname(__file__), '..', 'datasets', 'inventory_data.csv')
    df = pd.read_csv(data_path)
    print(f"[LOAD] Loaded {len(df)} samples from inventory_data.csv")

    # Encode categorical features
    type_encoder = LabelEncoder()
    df['ingredient_type_encoded'] = type_encoder.fit_transform(df['ingredient_type'])

    # Features and target
    feature_columns = [
        'ingredient_type_encoded',
        'current_stock',
        'predicted_demand',
        'past_usage',
        'menu_item_sales',
        'day_of_week',
        'is_weekend',
        'is_holiday'
    ]

    X = df[feature_columns]
    y = df['required_quantity']

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print(f"\n[INFO] Training set: {len(X_train)} samples")
    print(f"[INFO] Test set: {len(X_test)} samples")

    # Train Random Forest Regressor
    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=20,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )

    print("\n[TRAIN] Training Random Forest Regressor...")
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    print(f"\n[RESULT] Model Performance:")
    print(f"  MAE (Mean Absolute Error):   {mae:.2f} kg")
    print(f"  RMSE (Root Mean Sq Error):   {rmse:.2f} kg")
    print(f"  R^2 Score:                   {r2:.4f}")

    # Feature importance
    print("\n[FEATURES] Feature Importance:")
    importance_df = pd.DataFrame({
        'feature': ['ingredient_type', 'current_stock', 'predicted_demand',
                    'past_usage', 'menu_item_sales', 'day_of_week',
                    'is_weekend', 'is_holiday'],
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    print(importance_df.to_string(index=False))

    # Save model and encoder
    models_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
    os.makedirs(models_dir, exist_ok=True)

    joblib.dump(model, os.path.join(models_dir, 'inventory_model.pkl'))
    joblib.dump(type_encoder, os.path.join(models_dir, 'inventory_type_encoder.pkl'))

    print(f"\n[SAVED] Model saved to: {models_dir}")
    print("  - inventory_model.pkl")
    print("  - inventory_type_encoder.pkl")

    return model, type_encoder, r2

if __name__ == "__main__":
    train_inventory_model()
