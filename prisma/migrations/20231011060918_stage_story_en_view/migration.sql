CREATE VIEW stage_story_en AS
SELECT s.*, st.title, st.description, stg.number AS stage_number
FROM stage_stories AS s
JOIN stage_story_translations AS st ON s.id = st.stage_story_id AND st.locale_id = 'en'
JOIN stages AS stg ON s.stage_id = stg.id;