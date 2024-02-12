CREATE VIEW badge_en AS
SELECT 
    b.id,
    b.badge_key AS badge_key, 
    b.type::text, 
    b.stage_id AS stage_id,
    b.created_at AS created_at,
    b.updated_at AS updated_at,
    bt.name, 
    bt.description
FROM badges AS b
JOIN badge_translations AS bt ON b.id = bt.badge_id AND bt.locale_id = 'en';