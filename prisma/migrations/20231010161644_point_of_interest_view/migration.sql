CREATE VIEW point_of_interest_en AS
SELECT
    pi.id AS id,
    pi.latitude AS latitude,
    pi.longitude AS longitude,
    pi.created_at AS created_at,
    pi.updated_at AS updated_at,
    pit_en.title AS title,
    pit_en.description AS description,
    pi.media_key AS media_key,
    (
        SELECT JSON_AGG(JSON_BUILD_OBJECT(
            'localeId', pit_all.locale_id,
            'title', pit_all.title,
            'description', pit_all.description,
            'createdAt', pit_all.created_at,
            'updatedAt', pit_all.updated_at,
            'pointOfInterestId', pit_all.poi_id
        ))
        FROM point_of_interest_translations AS pit_all
        WHERE pit_all.poi_id = pi.id
    ) AS point_of_interest_translation,
    JSON_AGG(
        JSON_BUILD_OBJECT(
            'id', pis.stage_id,
            'distance', s.distance,
            'estimatedDuration', s.estimated_duration,
            'openTime', s.open_time,
            'closeTime', s.close_time,
            'elevationGain', s.elevation_gain,
            'open', s.open,
            'number', s.number,
            'cumulativeReviews', s.cumulative_reviews,
            'reviewsCount', s.reviews_count,
            'difficultyType', s.difficulty_type,
            'peopleInteraction', s.people_interaction,
            'familyFriendly', s.family_friendly_status,
            'createdAt', s.created_at,
            'updatedAt', s.updated_at
        )
    ) AS point_of_interest_stage
FROM
    point_of_interest AS pi
LEFT JOIN
    point_of_interest_translations AS pit_en ON pi.id = pit_en.poi_id AND pit_en.locale_id = 'en'
LEFT JOIN
    point_of_interest_stage AS pis ON pi.id = pis.point_of_interest_id
LEFT JOIN
    stages AS s ON pis.stage_id = s.id
GROUP BY
    pi.id, pi.latitude, pi.longitude, pi.created_at, pi.updated_at, pit_en.title, pit_en.description, pi.media_key;