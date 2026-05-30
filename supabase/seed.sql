-- PrivacyOS demo seed.
-- Populates a realistic footprint for the FIRST user in auth.users, so a freshly
-- connected project shows live data. Run in the Supabase SQL editor AFTER you
-- have signed up at least one account. Safe to re-run (clears prior demo rows
-- for that user first).

do $$
declare
  uid uuid;
  sid uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then
    raise notice 'No users in auth.users — sign up first, then re-run this seed.';
    return;
  end if;

  -- Reset any previous demo data for this user.
  delete from subjects where user_id = uid;

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

  raise notice 'Seeded PrivacyOS demo data for user %', uid;
end$$;
