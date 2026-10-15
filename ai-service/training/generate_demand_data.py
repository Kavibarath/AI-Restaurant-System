"""
Generate Synthetic Demand Training Data
Member A - Sales Intelligence Module

Simulates 2 years of daily orders/sales for several restaurants of
different sizes, so the model learns demand *relative* to recent volume
(past 7-day averages) and generalises to any restaurant scale.
"""
import os
from datetime import date, timedelta

import numpy as np
import pandas as pd

RNG = np.random.default_rng(42)

# Public holidays (MM-DD) - must match HOLIDAYS in backend salesController.ts
HOLIDAYS = {"01-01", "02-04", "04-13", "04-14", "05-01", "12-25"}

# Monday=0 ... Sunday=6 (weekends are busiest)
DOW_FACTOR = [0.85, 0.85, 0.90, 0.95, 1.20, 1.35, 1.25]

# Seasonality: April (New Year) and December (festive season) peak
MONTH_FACTOR = {1: 1.00, 2: 0.90, 3: 0.95, 4: 1.15, 5: 1.00, 6: 0.95,
                7: 1.05, 8: 1.05, 9: 0.95, 10: 1.00, 11: 1.05, 12: 1.20}

HOLIDAY_FACTOR = 1.40

# (base daily orders, average order value in Rs.)
RESTAURANTS = [(5, 2200), (10, 2500), (20, 2400), (35, 2700), (50, 2300), (80, 2600)]

DAYS = 730


def simulate_restaurant(base_orders: float, avg_order_value: float) -> pd.DataFrame:
    start = date.today() - timedelta(days=DAYS)
    rows = []
    for i in range(DAYS):
        d = start + timedelta(days=i)
        dow = d.weekday()
        holiday = d.strftime("%m-%d") in HOLIDAYS
        trend = 1 + 0.10 * (i / DAYS)  # ~10% growth over the period

        expected = (base_orders * DOW_FACTOR[dow] * MONTH_FACTOR[d.month]
                    * (HOLIDAY_FACTOR if holiday else 1.0) * trend)
        orders = max(0, int(round(expected * RNG.normal(1.0, 0.08))))

        # Weekend / holiday tickets are slightly larger (groups, desserts)
        ticket = avg_order_value * (1.08 if dow >= 5 or holiday else 1.0)
        sales = round(orders * ticket * RNG.normal(1.0, 0.06), 2)

        rows.append({
            "date": d.isoformat(),
            "day_of_week": dow,
            "month": d.month,
            "is_weekend": int(dow >= 5),
            "is_holiday": int(holiday),
            "orders": orders,
            "sales": max(0.0, sales),
        })

    df = pd.DataFrame(rows)
    # Lag features: average of the previous 7 days (no leakage of the current day)
    df["past_7day_avg_orders"] = df["orders"].shift(1).rolling(7).mean()
    df["past_7day_avg_sales"] = df["sales"].shift(1).rolling(7).mean()
    return df.dropna().reset_index(drop=True)


def main():
    frames = []
    for idx, (base, aov) in enumerate(RESTAURANTS):
        df = simulate_restaurant(base, aov)
        df.insert(0, "restaurant_id", idx)
        frames.append(df)

    data = pd.concat(frames, ignore_index=True)

    out_dir = os.path.join(os.path.dirname(__file__), "..", "datasets")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "demand_data.csv")
    data.to_csv(out_path, index=False)

    print(f"[OK] Generated {len(data)} daily records for {len(RESTAURANTS)} restaurants")
    print(f"[FILE] Saved to {os.path.abspath(out_path)}")
    print("\n[INFO] Sample:")
    print(data.head().to_string(index=False))
    print("\n[INFO] Orders per day - mean: %.1f, min: %d, max: %d"
          % (data["orders"].mean(), data["orders"].min(), data["orders"].max()))


if __name__ == "__main__":
    main()
