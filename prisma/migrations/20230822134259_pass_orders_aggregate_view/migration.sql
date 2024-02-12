-- This is an empty migration.
CREATE VIEW pass_orders_aggregate_view AS (SELECT
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
			AND p2.reserved_for = p1.reserved_for) AS pass_count
	FROM
		passes AS p1
	WHERE
		is_cancelled = FALSE
	GROUP BY
		p1.order_id,
		p1.user_id,
		p1.stage_id,
		p1.reserved_for);
