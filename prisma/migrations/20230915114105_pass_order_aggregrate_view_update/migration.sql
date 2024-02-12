-- This is an empty migration.
CREATE
OR REPLACE VIEW pass_orders_aggregate_view AS (
    SELECT
        p1.order_id,
        p1.user_id,
        p1.stage_id,
        p1.reserved_for,
        (
            SELECT
                COUNT(*)
            FROM
                passes AS p2
            WHERE
                p2.order_id = p1.order_id
                AND p2.user_id = p1.user_id
                AND p2.stage_id = p1.stage_id
                AND p2.reserved_for = p1.reserved_for
                AND p2.expired_at = p1.expired_at
        ) AS pass_count,
        COALESCE(p1.expired_at, p1.reserved_for) AS expired_at
    FROM
        passes AS p1
    WHERE
        is_cancelled = FALSE
    GROUP BY
        p1.order_id,
        p1.user_id,
        p1.stage_id,
        p1.reserved_for,
        p1.expired_at
);