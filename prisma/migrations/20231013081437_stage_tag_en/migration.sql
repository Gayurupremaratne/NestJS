DROP VIEW if exists stage_tag_en;

CREATE VIEW stage_tag_en AS
SELECT
  st.*,
  stt.name,
  (
    SELECT ARRAY_AGG(s.number)
    FROM stage_tag_associations AS sta
    LEFT JOIN stages AS s ON sta.stage_id = s.id
    WHERE sta.stage_tag_id = st.id
  ) AS related_stages
FROM stage_tags AS st
JOIN stage_tag_translations AS stt ON st.id = stt.stage_tag_id AND stt.locale_id = 'en';






