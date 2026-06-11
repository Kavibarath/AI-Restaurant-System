"""
Train Waste Prediction Model
Member B - Inventory Intelligence Module
Algorithm: Random Forest Classifier
"""
import pandas as pd
import numpy as np
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix

def train_waste_model():
    """Train and save the waste prediction model"""

    # Load data
    data_path = os.path.join(os.path.dirname(__file__), '..', 'datasets', 'waste_data.csv')
    df = pd.read_csv(data_path)
    print(f"[LOAD] Loaded {len(df)} samples from waste_data.csv")

    # Encode categorical features
    type_encoder = LabelEncoder()
    df['ingredient_type_encoded'] = type_encoder.fit_transform(df['ingredient_type'])

    risk_encoder = LabelEncoder()
    df['risk_level_encoded'] = risk_encoder.fit_transform(df['risk_level'])

    # Features and target
    feature_columns = [
        'ingredient_type_encoded',
        'stock_level',
        'expiry_days_remaining',
        'sales_rate',
        'past_waste_quantity'
    ]

    X = df[feature_columns]
    y = df['risk_level_encoded']

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"\n[INFO] Training set: {len(X_train)} samples")
    print(f"[INFO] Test set: {len(X_test)} samples")

    # Train Random Forest Classifier
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )

    print("\n[TRAIN] Training Random Forest Classifier...")
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"\n[RESULT] Model Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")
    print("\n[REPORT] Classification Report:")
    print(classification_report(
        y_test, y_pred,
        target_names=risk_encoder.classes_
    ))

    # Feature importance
    print("\n[FEATURES] Feature Importance:")
    importance_df = pd.DataFrame({
        'feature': ['ingredient_type', 'stock_level', 'expiry_days', 'sales_rate', 'past_waste'],
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    print(importance_df)

    # Save model and encoders
    models_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
    os.makedirs(models_dir, exist_ok=True)

    joblib.dump(model, os.path.join(models_dir, 'waste_model.pkl'))
    joblib.dump(type_encoder, os.path.join(models_dir, 'waste_type_encoder.pkl'))
    joblib.dump(risk_encoder, os.path.join(models_dir, 'waste_risk_encoder.pkl'))

    print(f"\n[SAVED] Model saved to: {models_dir}")
    print("  - waste_model.pkl")
    print("  - waste_type_encoder.pkl")
    print("  - waste_risk_encoder.pkl")

    return model, type_encoder, risk_encoder, accuracy

if __name__ == "__main__":
    train_waste_model()
