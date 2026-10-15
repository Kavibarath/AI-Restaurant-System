"""
Generate synthetic training data for Waste Prediction Model
Member B - Inventory Intelligence Module
"""
import pandas as pd
import numpy as np
import os

np.random.seed(42)

# Ingredient categories
INGREDIENT_TYPES = ['vegetable', 'meat', 'dairy', 'grain', 'spice', 'fruit', 'seafood']

def generate_waste_data(n_samples=2000):
    """Generate realistic synthetic waste data"""
    data = []

    for _ in range(n_samples):
        # Random features
        ingredient_type = np.random.choice(INGREDIENT_TYPES)
        stock_level = np.random.uniform(1, 200)  # kg
        expiry_days_remaining = np.random.randint(0, 30)
        sales_rate = np.random.uniform(0.5, 20)  # units/day
        past_waste_quantity = np.random.uniform(0, 30)

        # Calculate risk based on realistic logic
        days_to_use_stock = stock_level / sales_rate if sales_rate > 0 else 100

        # Risk factor calculation
        risk_score = 0

        # Expiry risk
        if expiry_days_remaining < days_to_use_stock:
            risk_score += 3
        if expiry_days_remaining <= 2:
            risk_score += 2
        elif expiry_days_remaining <= 5:
            risk_score += 1

        # Stock vs sales risk
        if days_to_use_stock > expiry_days_remaining * 2:
            risk_score += 2

        # Past waste pattern
        if past_waste_quantity > 10:
            risk_score += 1

        # Type-specific risk (perishables)
        if ingredient_type in ['dairy', 'seafood']:
            risk_score += 1
        elif ingredient_type in ['vegetable', 'fruit']:
            risk_score += 0.5

        # Add noise for realism
        risk_score += np.random.normal(0, 0.5)

        # Convert to risk levels
        if risk_score >= 5:
            risk_level = 'high'
        elif risk_score >= 2:
            risk_level = 'medium'
        else:
            risk_level = 'low'

        data.append({
            'ingredient_type': ingredient_type,
            'stock_level': round(stock_level, 2),
            'expiry_days_remaining': expiry_days_remaining,
            'sales_rate': round(sales_rate, 2),
            'past_waste_quantity': round(past_waste_quantity, 2),
            'risk_level': risk_level
        })

    df = pd.DataFrame(data)

    # Save to datasets folder
    output_path = os.path.join(os.path.dirname(__file__), '..', 'datasets', 'waste_data.csv')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)

    print(f"[OK] Generated {n_samples} waste samples")
    print(f"[FILE] Saved to: {output_path}")
    print(f"\nRisk distribution:")
    print(df['risk_level'].value_counts())
    print(f"\nSample data:")
    print(df.head())

    return df

if __name__ == "__main__":
    generate_waste_data()
