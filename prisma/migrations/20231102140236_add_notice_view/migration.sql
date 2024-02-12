CREATE VIEW notice_en AS
SELECT
    n.id AS id,
    n.created_by AS created_by,
    n.category AS category,
    n."type" AS "type",
    n.delivery_group AS delivery_group,
    n.start_date AS start_date,
    n.end_date AS end_date,
    n.created_at AS created_at,
    n.updated_at AS updated_at,
     JSON_AGG(
        JSON_BUILD_OBJECT(
            'id', s.id,
            'number', s.number
        )
    ) AS notice_stage,
    JSON_AGG(
        JSON_BUILD_OBJECT(
            'title', no_tr.title,
            'description', no_tr.description
        )
    ) AS notice_translation
FROM
    notices AS n
LEFT JOIN
    notice_translations AS no_tr ON n.id = no_tr.notice_id 
LEFT JOIN
    stages AS s ON n.category = s.id
WHERE 
	no_tr.locale_id = 'en'
GROUP BY
	n.id,
    n.created_by,
    n.category,
    n."type",
    n.delivery_group,
    n.start_date,
    n.end_date,
    n.created_at,
    n.updated_at;
