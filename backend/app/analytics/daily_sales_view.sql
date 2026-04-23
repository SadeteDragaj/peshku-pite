-- Materialized view: daily_sales_summary
-- Aggregates orders by day with revenue, order count, avg order value, top items.
-- Refresh with: REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary;

CREATE MATERIALIZED VIEW IF NOT EXISTS daily_sales_summary AS
SELECT
    DATE(o.created_at AT TIME ZONE 'UTC') AS sale_date,
    COUNT(DISTINCT o.id)                  AS order_count,
    COALESCE(SUM(oi.subtotal), 0)         AS total_revenue,
    COALESCE(AVG(order_totals.order_total), 0) AS avg_order_value,
    COUNT(DISTINCT o.table_id)            AS tables_served,
    COALESCE(SUM(oi.quantity), 0)         AS items_sold
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN (
    SELECT order_id, SUM(subtotal) AS order_total
    FROM order_items
    GROUP BY order_id
) order_totals ON order_totals.order_id = o.id
WHERE o.status NOT IN ('voided')
GROUP BY DATE(o.created_at AT TIME ZONE 'UTC')
ORDER BY sale_date DESC;

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_sales_date ON daily_sales_summary (sale_date);
