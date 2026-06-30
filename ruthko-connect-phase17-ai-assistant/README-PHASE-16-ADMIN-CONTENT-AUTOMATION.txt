RUTHKO CONNECT PHASE 16: ADMIN CONTENT MANAGER AND AUTOMATION CONTROLS

Purpose
This phase adds a protected Quick Change Center so Ruthko can update public-facing content without editing code.

New admin page
content-manager.html

What the admin can change
1. Public contacts
- Main email
- Phone or WhatsApp number
- Second phone number
- Website link
- Footer message

2. Event banner and flyer
- Featured event headline
- Event subtitle
- CTA link
- Banner image path or URL
- Local image preview upload

3. Flyers library
- Add event flyers
- Preview flyer images
- Copy flyer links
- Delete saved local flyers

4. CRM email automations
- Employer auto-reply template
- Candidate auto-reply template
- Sponsor auto-reply template
- Vendor auto-reply template
- Event RSVP auto-reply template

5. Social media publications
- Generate captions for Facebook, Instagram, LinkedIn, TikTok, and YouTube Community
- Save planned publications
- Copy captions
- Export social plan CSV

6. Administrative assistant
- Event update prompt
- CRM follow-up prompt
- Weekly social media plan prompt
- Export settings JSON

New files
content-manager.html
js/content-manager.js
js/site-settings.js
supabase/phase16-admin-content-automation-extension.sql
README-PHASE-16-ADMIN-CONTENT-AUTOMATION.txt
ADMIN-CONTENT-AUTOMATION-FLOW-MAP.txt
NEXT-STEP-PHASE-17-LIVE-SOCIAL-PUBLISHING.txt

How it works locally
The page saves changes to browser localStorage in sample mode.

How it works in production
After Supabase is connected and sampleMode is false, settings can save to the site_settings table. Public pages load the latest settings through js/site-settings.js.

Supabase setup
Run this after earlier SQL files:
supabase/phase16-admin-content-automation-extension.sql

Important production note
For event banners and flyers, use one of these production paths:
- Put images inside the images folder and paste the path, for example images/cultural-handshake-flyer.jpg
- Use Supabase Storage and paste the public image URL
- Use your Hostinger VPS uploads folder later when Phase 17 adds server-side upload handling
