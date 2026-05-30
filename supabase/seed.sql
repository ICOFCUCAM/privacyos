-- PrivacyOS demo seed.
-- Populates a realistic footprint for the FIRST user in auth.users, so a freshly
-- connected project shows live data. Run in the Supabase SQL editor AFTER you
-- have signed up at least one account. Safe to re-run (clears prior demo rows
-- for that user first).

do $$
declare
  uid uuid;
  sid uuid;
  oid uuid;
  did_primary uuid;
  did_secondary uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then
    raise notice 'No users in auth.users — sign up first, then re-run this seed.';
    return;
  end if;

  -- Reset any previous data for this user (cascades to all child rows).
  delete from subjects where user_id = uid;
  delete from organizations where user_id = uid;
  delete from notifications where user_id = uid;

  insert into subjects (user_id, type, display_name, emails, phones, usernames, organization)
  values (uid, 'executive', 'Jordan Vance',
          array['jordan@vancecapital.com','j.vance@gmail.com'],
          array['+1 (415) 555-0142'],
          array['jvance','jordanvance'],
          'Vance Capital')
  returning id into sid;

  insert into exposures (user_id, subject_id, category, source, source_name, url, snippet, risk_level, risk_score, status, discovered_at, last_seen_at) values
    (uid, sid, 'address',    'data_broker', 'Spokeo',           'https://spokeo.com/jordan-vance', 'Jordan Vance, 41 — 88 Marina Blvd, San Francisco, CA', 'high',     38, 'removal_requested', now() - interval '40 days', now() - interval '3 days'),
    (uid, sid, 'credential', 'dark_web',    'BreachForums dump', null, 'j.vance@gmail.com : ********  (LinkedIn 2021 breach)',                     'critical', 60, 'discovered',        now() - interval '2 days',  now() - interval '1 day'),
    (uid, sid, 'phone',      'data_broker', 'WhitePages',        null, 'Jordan Vance — mobile (415) 555-0142',                                    'medium',   20, 'in_progress',       now() - interval '35 days', now() - interval '5 days'),
    (uid, sid, 'family',     'social_media','Facebook',          null, 'Tagged photo with spouse and two children, location enabled',             'high',     36, 'triaged',           now() - interval '18 days', now() - interval '2 days'),
    (uid, sid, 'employer',   'news',        'TechCrunch',        'https://techcrunch.com/vance-capital', 'Vance Capital faces investor lawsuit over...',           'high',     34, 'monitoring',        now() - interval '60 days', now() - interval '7 days'),
    (uid, sid, 'photo',      'ai_generated','Telegram channel',  null, 'Synthetic image of subject — detector confidence 0.92',                   'critical', 55, 'discovered',        now() - interval '1 day',   now()),
    (uid, sid, 'email',      'data_broker', 'BeenVerified',      null, 'jordan@vancecapital.com associated with 3 profiles',                      'medium',   22, 'removed',           now() - interval '50 days', now() - interval '20 days');

  insert into threats (user_id, subject_id, kind, title, detail, risk_level, source, detected_at, acknowledged) values
    (uid, sid, 'credential_leak', 'Credential pair leaked on dark web', 'j.vance@gmail.com exposed in a fresh combolist.',                   'critical', 'dark_web',     now() - interval '1 day',  false),
    (uid, sid, 'deepfake',        'Synthetic image detected',           'AI-generated photo impersonating subject on a Telegram channel.',  'critical', 'ai_generated', now(),                     false),
    (uid, sid, 'doxxing',         'Home address reposted',              'Address surfaced on a forum thread referencing the lawsuit.',      'high',     'forum',        now() - interval '2 days', false),
    (uid, sid, 'negative_press',  'Negative article gaining visibility','TechCrunch piece now ranks #2 for the subject''s name.',           'high',     'news',         now() - interval '4 days', true);

  insert into cases (user_id, subject_id, type, title, summary, status, risk_level, assigned_agent) values
    (uid, sid, 'breach_response',     'Dark-web credential leak response', 'Rotate credentials, enforce MFA, monitor reuse.',            'in_progress',       'critical', 'security'),
    (uid, sid, 'data_broker_removal', 'Spokeo address removal',            'Opt-out filed; 30/60/90-day re-checks scheduled.',           'awaiting_response', 'high',     'privacy'),
    (uid, sid, 'deepfake_incident',   'Synthetic image takedown',          'Evidence package assembled for platform takedown.',          'open',              'critical', 'deepfake'),
    (uid, sid, 'reputation_recovery', 'Search suppression — lawsuit',      'Positive-content + SEO plan to displace negative result.',   'open',              'high',     'reputation');

  insert into recommendations (user_id, subject_id, agent, title, rationale, risk_level, impact, action_label) values
    (uid, sid, 'security',   'Rotate exposed credentials now',      'A critical credential pair is live on the dark web — rotate and enforce MFA.',     'critical', 18, 'Start breach response'),
    (uid, sid, 'executive',  'Escalate physical-security exposure', 'Home address + family photos are exposed for a VIP subject.',                      'critical', 22, 'Escalate'),
    (uid, sid, 'deepfake',   'Open deepfake incident & takedown',   'Synthetic image detected with 0.92 confidence. Evidence package ready.',           'critical', 14, 'Open incident'),
    (uid, sid, 'reputation', 'Launch reputation recovery plan',     'A negative article now ranks #2 for the subject''s name.',                         'high',     12, 'Build plan');

  -- ── Suite modules (0002) ────────────────────────────────────────────────
  insert into executive_profiles (user_id, subject_id, title, protection_tier, threat_level)
    values (uid, sid, 'Managing Partner', 'executive', 'high');

  insert into family_profiles (user_id, subject_id, display_name, relation, is_minor, risk_level, exposures_count) values
    (uid, sid, 'Alex Vance',     'Spouse',       false, 'high',     4),
    (uid, sid, 'Mia Vance',      'Child (14)',   true,  'critical', 2),
    (uid, sid, 'Theo Vance',     'Child (11)',   true,  'medium',   1),
    (uid, sid, 'Eleanor Vance',  'Parent (72)',  false, 'high',     3);

  insert into mentions (user_id, subject_id, channel, source_name, url, title, excerpt, sentiment, sentiment_score, search_rank, is_defamatory, detected_at) values
    (uid, sid, 'news',   'TechCrunch',       'https://techcrunch.com/vance-capital', 'Vance Capital faces investor lawsuit', 'The firm is named in a complaint...', 'negative', -0.720, 2, false, now() - interval '4 days'),
    (uid, sid, 'forum',  'Reddit r/finance', null, 'Anyone dealt with Jordan Vance?', 'Heard some shady things...', 'negative', -0.550, 7, true,  now() - interval '3 days'),
    (uid, sid, 'news',   'Bloomberg',        null, 'Vance Capital closes $200M fund', 'A strong vote of confidence...', 'positive', 0.680, 4, false, now() - interval '10 days'),
    (uid, sid, 'review', 'Glassdoor',        null, 'Mixed reviews on leadership', 'Great vision, tough culture...', 'mixed', 0.050, null, false, now() - interval '14 days'),
    (uid, sid, 'social', 'X (Twitter)',      null, 'Thread criticizing recent decision', 'A viral thread...', 'negative', -0.610, 9, false, now() - interval '2 days'),
    (uid, sid, 'blog',   'Industry blog',    null, 'Profile: the rise of Vance Capital', 'A flattering long-read...', 'positive', 0.810, 6, false, now() - interval '21 days');

  insert into sentiment_records (user_id, subject_id, recorded_on, positive, neutral, negative, net_score)
    select uid, sid, (current_date - g), 2 + (g % 4), 4 + (g % 6), 3 + (g % 5),
           round((((2 + (g % 4)) - (3 + (g % 5)))::numeric / nullif((2 + (g % 4)) + (4 + (g % 6)) + (3 + (g % 5)), 0)), 3)
    from generate_series(0, 13) as g;

  insert into incidents (user_id, subject_id, kind, title, detail, risk_level, status, evidence, detected_at) values
    (uid, sid, 'deepfake',          'Synthetic image on Telegram',  'AI-generated photo, detector confidence 0.92.',          'critical', 'evidence_gathered',  '["hash","provenance","detector","screenshot"]', now() - interval '1 day'),
    (uid, sid, 'doxxing',           'Home address reposted',        'Address surfaced in a lawsuit thread.',                  'high',     'investigating',      '["thread","archive"]', now() - interval '2 days'),
    (uid, sid, 'impersonation',     'Fake LinkedIn profile',        'Profile impersonating subject contacting associates.',   'high',     'takedown_requested', '["profile","messages","screenshots","report","whois"]', now() - interval '6 days'),
    (uid, sid, 'location_exposure', 'Geotagged family photo',       'Public photo with location metadata.',                   'medium',   'open',               '["exif"]', now() - interval '9 days'),
    (uid, sid, 'deepfake',          'Voice clone in scam call',     'Reported voice-cloning targeting finance staff.',        'critical', 'resolved',           '["recording","transcript","report"]', now() - interval '30 days');

  insert into travel_alerts (user_id, subject_id, destination, travel_date, risk_level, advisory) values
    (uid, sid, 'London, UK',      current_date + 14, 'low',    'Low risk. Standard precautions; no active threats near itinerary.'),
    (uid, sid, 'Mexico City, MX', current_date + 30, 'medium', 'Elevated risk. Recent doxxing exposure; recommend private transport and varied routes.');

  insert into organizations (user_id, name, primary_domain, employee_count)
    values (uid, 'Vance Capital', 'vancecapital.com', 48) returning id into oid;

  insert into domains (user_id, org_id, domain, is_primary) values
    (uid, oid, 'vancecapital.com', true)  returning id into did_primary;
  insert into domains (user_id, org_id, domain, is_primary) values
    (uid, oid, 'vance.fund', false) returning id into did_secondary;

  insert into domain_risks (user_id, domain_id, kind, detail, risk_level, resolved, detected_at) values
    (uid, did_primary,   'typosquat',    'Lookalike vancecapltal.com registered 6 days ago; parked page.', 'high',   false, now() - interval '6 days'),
    (uid, did_primary,   'spoof_mx',     'SPF/DMARC not enforced — domain spoofable for phishing.',        'medium', false, now() - interval '12 days'),
    (uid, did_secondary, 'expired_cert', 'TLS certificate expires in 9 days.',                             'medium', false, now() - interval '1 day');

  insert into employee_exposures (user_id, org_id, employee_email, employee_name, exposure_type, risk_level, source, detected_at) values
    (uid, oid, 'm.chen@vancecapital.com',  'M. Chen',  'Credential leak',         'critical', 'dark_web',      now() - interval '2 days'),
    (uid, oid, 's.patel@vancecapital.com', 'S. Patel', 'Credential leak',         'high',     'breach_db',     now() - interval '5 days'),
    (uid, oid, 'ops@vancecapital.com',     null,       'Exposed shared inbox',    'high',     'search_engine', now() - interval '8 days'),
    (uid, oid, 'j.kim@vancecapital.com',   'J. Kim',   'Personal data on broker', 'medium',   'data_broker',   now() - interval '11 days');

  insert into credential_leaks (user_id, org_id, subject_id, account, breach_name, data_classes, pwn_count, risk_level, leaked_at) values
    (uid, oid, sid,  'j.vance@gmail.com',         'LinkedIn 2021', array['Email addresses','Passwords'], 700000000, 'critical', current_date - 120),
    (uid, oid, null, 'm.chen@vancecapital.com',   'Collection #1', array['Email addresses','Passwords'], 770000000, 'critical', current_date - 400),
    (uid, oid, null, 's.patel@vancecapital.com',  'Canva',         array['Email addresses','Names'],     137000000, 'high',     current_date - 900);

  insert into third_party_risks (user_id, org_id, vendor_name, category, risk_score, risk_level, findings, assessed_at) values
    (uid, oid, 'CloudPayroll Inc.', 'Payroll SaaS',      72, 'high',   'Recent breach disclosure; employee PII may be affected.', now() - interval '7 days'),
    (uid, oid, 'MailReach',         'Email vendor',      41, 'medium', 'Weak DMARC posture; subdomain takeover risk.',            now() - interval '15 days'),
    (uid, oid, 'DocStore',          'Document storage',  23, 'low',    'No issues found in latest assessment.',                   now() - interval '20 days');

  insert into legal_requests (user_id, subject_id, type, recipient, status, created_at, updated_at) values
    (uid, sid, 'broker_optout',        'Spokeo',                   'submitted', now() - interval '3 days',  now() - interval '1 day'),
    (uid, sid, 'gdpr_erasure',         'BeenVerified',             'completed', now() - interval '40 days', now() - interval '15 days'),
    (uid, sid, 'defamation_complaint', 'Reddit Legal',             'draft',     now() - interval '1 day',  now() - interval '1 day'),
    (uid, sid, 'platform_abuse',       'Telegram Trust & Safety',  'escalated', now() - interval '1 day',  now());

  insert into notifications (user_id, kind, title, body, risk_level, read, created_at) values
    (uid, 'alert',          'Critical credential leak detected', 'j.vance@gmail.com appeared in a fresh dark-web combolist.', 'critical', false, now()),
    (uid, 'incident',       'Deepfake incident escalated',       'Synthetic image takedown moved to evidence-gathered.',     'critical', false, now()),
    (uid, 'removal_update', 'Spokeo opt-out submitted',          'Re-checks scheduled at 30/60/90 days.',                    'high',     true,  now() - interval '1 day'),
    (uid, 'report_ready',   'Weekly executive report ready',     'Your weekly protection summary is available.',             null,       true,  now() - interval '2 days'),
    (uid, 'recommendation', '5 new AI recommendations',          'Prioritized actions are ready for review.',                null,       true,  now() - interval '2 days');

  insert into agent_actions (user_id, subject_id, agent, kind, summary, status, created_at) values
    (uid, sid, 'discovery',  'scan',        'Swept 6 discovery layers; 248 results indexed.',     'completed', now()),
    (uid, sid, 'security',   'escalate',    'Escalated critical credential leak to breach response.', 'completed', now()),
    (uid, sid, 'privacy',    'remove',      'Filed opt-out at Spokeo; scheduled re-checks.',      'completed', now() - interval '1 day'),
    (uid, sid, 'legal',      'draft_legal', 'Drafted GDPR erasure packet for 3 brokers.',         'completed', now() - interval '1 day'),
    (uid, sid, 'deepfake',   'monitor',     'Assembled evidence package for synthetic image.',    'completed', now() - interval '1 day'),
    (uid, sid, 'reputation', 'analyze',     'Sentiment sweep across 6 channels; net trend -0.18.', 'completed', now() - interval '2 days');

  insert into removal_requests (user_id, subject_id, broker_name, status, submitted_at, next_check_at, history) values
    (uid, sid, 'Spokeo',       'monitoring',        now() - interval '40 days', now() - interval '-20 days',
      '[{"at":"t0","status":"removal_requested","note":"Opt-out filed with Spokeo."},{"at":"t1","status":"removed","note":"Listing removed."},{"at":"t2","status":"monitoring","note":"Re-check passed. Next in 60 days."}]'::jsonb),
    (uid, sid, 'WhitePages',   'in_progress',       now() - interval '5 days',  null,
      '[{"at":"t0","status":"removal_requested","note":"Opt-out filed with WhitePages."},{"at":"t1","status":"in_progress","note":"Broker acknowledged the request."}]'::jsonb),
    (uid, sid, 'MyLife',       'reappeared',        now() - interval '70 days', now(),
      '[{"at":"t0","status":"removal_requested","note":"Opt-out filed."},{"at":"t1","status":"removed","note":"Listing removed."},{"at":"t2","status":"reappeared","note":"Listing reappeared — re-filing opt-out."}]'::jsonb),
    (uid, sid, 'BeenVerified', 'removed',           now() - interval '50 days', now() + interval '10 days',
      '[{"at":"t0","status":"removal_requested","note":"Opt-out filed with BeenVerified."},{"at":"t1","status":"removed","note":"Listing removed. First reappearance re-check in 30 days."}]'::jsonb);

  raise notice 'Seeded PrivacyOS demo + suite data for user %', uid;
end$$;
