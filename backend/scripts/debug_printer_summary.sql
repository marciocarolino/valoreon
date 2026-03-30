-- Manual checks for printer financial summary (replace :printer_id and :user_id)
-- 1) Rows for this printer only
SELECT id, printer_id, user_id, sale_price, quantity, total_cost, profit
FROM productions
WHERE printer_id = :printer_id;

-- 2) Same rows with user filter (must match app query)
SELECT id, printer_id, user_id, sale_price, quantity, total_cost, profit
FROM productions
WHERE printer_id = :printer_id AND user_id = :user_id;

-- 3) Aggregates (matches PrinterService.getPrinterSummary sums)
SELECT
  COALESCE(SUM(sale_price * quantity), 0) AS revenue,
  COALESCE(SUM(total_cost), 0)         AS cost,
  COALESCE(SUM(profit), 0)             AS profit,
  COUNT(id)                            AS total_productions
FROM productions
WHERE printer_id = :printer_id AND user_id = :user_id;
