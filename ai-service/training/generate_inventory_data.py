"""
Generate synthetic training data for Inventory Forecasting Model
Member B - Inventory Intelligence Module
"""
import pandas as pd
import numpy as np
import os

np.random.seed(42)

INGREDIENT_TYPES = ['vegetable', 'meat', 'dairy', 'grain', 'spice', 'fruit', 'seafood']

def generate_inventory_data(n_samples=2000):
    """Generate realistic synthetic inventory forecasting data"""
    data = []

    for _ in range(n_samples):
        ingredient_type = np.random.choice(INGREDIENT_TYPES)
        current_stock = np.random.uniform(0, 100)  # kg
        predicted_demand = np.random.uniform(10, 200)  # units expected
        past_usage = np.random.uniform(5, 50)  # daily average
        menu_item_sales = np.random.uniform(10, 100)  # sales count

        day_of_week = np.random.randint(0, 7)  # 0=Mon, 6=Sun
        is_weekend = 1 if day_of_week >= 5 else 0
        is_holiday = np.random.choice([0, 1], p=[0.95, 0.05])

        # Calculate required quantity using realistic logic
        # Base requirement: enough for predicted demand minus current stock
        base_requirement = predicted_demand - current_stock

        # Adjust for past usage trend
        usage_adjustment = past_usage * 1.2

        # Weekend bump
        weekend_factor = 1.3 if is_weekend else 1.0

        # Holiday bump
        holiday_factor = 1.5 if is_holiday else 1.0

        # Type-specific adjustments
        type_factors = {
            'vegetable': 1.1, 'fruit': 1.1,  # Perishable - order more often
            'dairy': 1.05, 'seafood': 1.0,
            'meat': 1.2, 'grain': 0.9, 'spice': 0.7
        }

        type_factor = type_factors.get(ingredient_type, 1.0)

        required_quantity = max(
            0,
            (base_requirement + usage_adjustment) * weekend_factor * holiday_factor * type_factor
        )

        # Add noise
        required_quantity += np.random.normal(0, required_quantity * 0.1)
        required_quantity = max(0, round(required_quantity, 2))

        data.append({
            'ingredient_type': ingredient_type,
            'current_stock': round(current_stock, 2),
            'predicted_demand': round(predicted_demand, 2),
            'past_usage': round(past_usage, 2),
            'menu_item_sales': round(menu_item_sales, 2),
            'day_of_week': day_of_week,
            'is_weekend': is_weekend,
            'is_holiday': is_holiday,
            'required_quantity': required_quantity
        })

    df = pd.DataFrame(data)

    output_path = os.path.join(os.path.dirname(__file__), '..', 'datasets', 'inventory_data.csv')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)

    print(f"[OK] Generated {n_samples} inventory samples")
    print(f"[FILE] Saved to: {output_path}")
    print(f"\nStatistics:")
    print(df['required_quantity'].describe())
    print(f"\nSample data:")
    print(df.head())

    return df

if __name__ == "__main__":
    generate_inventory_data()
