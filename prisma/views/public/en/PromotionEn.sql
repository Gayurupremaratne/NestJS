CREATE VIEW promotion_en AS
SELECT p.*, pt.title, pt.description, pt.cta_text
FROM promotions AS p
JOIN promotion_translations AS pt ON p.id = pt.promotion_id AND pt.locale_id = 'en';
