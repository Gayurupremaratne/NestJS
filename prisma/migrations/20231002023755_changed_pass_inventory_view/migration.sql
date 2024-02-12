CREATE OR REPLACE VIEW pass_inventory_aggregate_view AS (
  SELECT
    pi.stage_id,
    pi."date",
    pi.quantity AS inventory_quantity,
    SUM(CASE WHEN p.is_cancelled = FALSE THEN 1 ELSE 0 END) AS reserved_quantity,
    SUM(CASE WHEN p.is_cancelled = TRUE THEN 1 ELSE 0 END) AS cancelled_quantity
  FROM
    pass_inventories AS pi
  LEFT JOIN
    passes AS p
  ON
    pi."date" = p.reserved_for
    AND pi.stage_id = p.stage_id
  GROUP BY
    pi.stage_id, pi."date", pi.quantity
);
