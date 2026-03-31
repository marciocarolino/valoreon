-- Recalculate total_cost, profit, and margin for all existing productions.
-- Previously, total_cost stored only material_cost + energy_cost.
-- Shipping cost was deducted from profit but not included in total_cost.
-- Fee was never deducted at all.
-- After this migration: total_cost = material + energy + shipping + fee.

UPDATE productions
SET
    total_cost = ROUND(
        COALESCE(material_cost, 0)
        + COALESCE(energy_cost, 0)
        + COALESCE(shipping_cost, 0)
        + (sale_price * quantity * COALESCE(fee_percentage, 0) / 100),
        4
    ),
    profit = ROUND(
        (sale_price * quantity)
        - COALESCE(material_cost, 0)
        - COALESCE(energy_cost, 0)
        - COALESCE(shipping_cost, 0)
        - (sale_price * quantity * COALESCE(fee_percentage, 0) / 100),
        4
    ),
    margin = CASE
        WHEN sale_price * quantity > 0 THEN ROUND(
            (
                (sale_price * quantity)
                - COALESCE(material_cost, 0)
                - COALESCE(energy_cost, 0)
                - COALESCE(shipping_cost, 0)
                - (sale_price * quantity * COALESCE(fee_percentage, 0) / 100)
            ) / (sale_price * quantity) * 100,
            4
        )
        ELSE 0
    END
WHERE material_cost IS NOT NULL
  AND energy_cost IS NOT NULL;
