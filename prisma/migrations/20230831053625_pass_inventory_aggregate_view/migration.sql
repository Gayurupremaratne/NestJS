CREATE VIEW pass_inventory_aggregate_view AS (
  SELECT
    pass_inventories.stage_id,
    pass_inventories."date",
    quantity AS inventory_quantity,
    (
      SELECT
        COUNT(*)
      FROM
        passes
      WHERE
        pass_inventories."date" = passes.reserved_for
        AND pass_inventories.stage_id = passes.stage_id
        AND passes.is_cancelled = FALSE
    ) AS reserved_quantity
  FROM
    pass_inventories
)
