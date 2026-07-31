-- ==========================================
-- Seed Blog Articles
-- ==========================================
-- Inserts 3 professional auto repair blog articles.
-- Uses INSERT OR IGNORE to prevent duplicate slug conflicts on re-runs.
-- NOTE: The Articles table has NO 'content' column. Article body text
-- is stored as a meta_data entry with label "Content" and type "rich-text".

INSERT OR IGNORE INTO Articles (id, category_id, title, slug, excerpt, preview_image_url, reading_time_minutes, author_id, published_at, meta_data, seo_data, is_active, sort_order, created_by)
VALUES (
    'art-00000-0001-0000-000000000001',
    NULL,
    'The Ultimate Guide to Engine Longevity: Why Regular Oil Changes Matter',
    'importance-of-regular-oil-changes',
    'Discover how a simple, regular oil and filter change can save your engine from premature wear and costly repairs down the road.',
    NULL,
    3,
    NULL,
    CURRENT_TIMESTAMP,
    '[{"label":"Author","type":"text-info","data":"Maintenance Team"},{"label":"Read Time","type":"text-info","data":"3 Mins"},{"label":"Category","type":"badge","data":"Routine Maintenance"},{"label":"Tags","type":"list","data":["Oil Change","Engine Health","Filters"]},{"label":"Featured Image","type":"image","data":"oil-change-article-cover.jpg"},{"label":"Content","type":"rich-text","data":"Your vehicle''s engine is a complex machine with hundreds of moving parts. To keep these parts moving smoothly and prevent friction, high-quality engine oil is essential. Over time, however, engine oil breaks down and becomes contaminated with dust, dirt, and debris from the engine as well as the environment. When this happens, oil can''t do its job properly. Regular oil and filter changes are the most cost-effective way to ensure your engine runs efficiently. Not only does fresh oil reduce wear and tear, but it also helps regulate engine temperature and improves gas mileage. Don''t wait for the ''check oil'' light to come on; stick to your manufacturer''s recommended schedule to keep your car performing at its best."}]',
    '{}',
    1,
    1,
    NULL
);

INSERT OR IGNORE INTO Articles (id, category_id, title, slug, excerpt, preview_image_url, reading_time_minutes, author_id, published_at, meta_data, seo_data, is_active, sort_order, created_by)
VALUES (
    'art-00000-0002-0000-000000000002',
    NULL,
    '5 Warning Signs Your Car Needs Immediate Brake Service',
    'signs-you-need-brake-service',
    'Never compromise on safety. Learn to identify the top 5 warning signs that indicate your vehicle''s brakes need immediate professional attention.',
    NULL,
    4,
    NULL,
    CURRENT_TIMESTAMP,
    '[{"label":"Author","type":"text-info","data":"Safety Expert"},{"label":"Read Time","type":"text-info","data":"4 Mins"},{"label":"Category","type":"badge","data":"Safety & Repair"},{"label":"Tags","type":"list","data":["Brakes","Safety","Car Repair"]},{"label":"Featured Image","type":"image","data":"brake-service-cover.jpg"},{"label":"Content","type":"rich-text","data":"Brakes are arguably the most critical safety feature of your vehicle. Ignoring the warning signs of failing brakes can put you, your passengers, and other drivers at serious risk. But how do you know when it''s time for a brake service? First, listen carefully: a high-pitched squealing or grinding noise when you apply the brakes is a clear indicator that your brake pads are worn out. Second, pay attention to the brake pedal. If it feels ''spongy'' or presses closer to the floor than usual, you might have air in the hydraulic lines or a fluid leak. Third, if your car pulls to one side when braking, it could signal uneven pad wear or a stuck caliper. Finally, any vibration in the steering wheel during braking means your rotors may need resurfacing. If you notice any of these signs, book a comprehensive brake inspection immediately."}]',
    '{}',
    1,
    2,
    NULL
);

INSERT OR IGNORE INTO Articles (id, category_id, title, slug, excerpt, preview_image_url, reading_time_minutes, author_id, published_at, meta_data, seo_data, is_active, sort_order, created_by)
VALUES (
    'art-00000-0003-0000-000000000003',
    NULL,
    'Decoding Your Dashboard: The Benefits of Advanced Computer Diagnostics',
    'benefits-of-computer-diagnostics',
    'When the Check Engine light comes on, it''s time for answers. Understand how advanced computer diagnostics pinpoint vehicle issues accurately.',
    NULL,
    3,
    NULL,
    CURRENT_TIMESTAMP,
    '[{"label":"Author","type":"text-info","data":"Lead Technician"},{"label":"Read Time","type":"text-info","data":"3 Mins"},{"label":"Category","type":"badge","data":"Technology & Diagnostics"},{"label":"Tags","type":"list","data":["Computer Diagnostics","Check Engine","Technology"]},{"label":"Featured Image","type":"image","data":"diagnostics-cover.jpg"},{"label":"Content","type":"rich-text","data":"Modern vehicles are highly advanced pieces of machinery, controlled by a network of complex computer systems. While this technology makes cars safer and more efficient, it also means that diagnosing problems requires more than just a quick look under the hood. When your check engine light illuminates, it''s your car''s way of telling you that its internal monitoring system has detected an error. This is where advanced computer diagnostics come in. By connecting specialized scanners to your car''s OBD-II (On-Board Diagnostics) port, technicians can read specific error codes generated by the vehicle. This process takes the guesswork out of auto repair. It allows mechanics to quickly and accurately identify issues with the engine, transmission, exhaust system, and more, saving you time and money on unnecessary repairs."}]',
    '{}',
    1,
    3,
    NULL
);
