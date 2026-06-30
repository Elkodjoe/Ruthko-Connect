Phase 17: Ruthko AI Assistant and Frontend Inquiry Help

This phase adds two assistant layers:

1. Admin AI Studio Assistant
- Daily admin brief prompt
- CRM follow-up prompt
- Social media plan prompt
- Event update prompt
- Public assistant rules generator

2. Public Ask Ruthko Assistant
- ask-ruthko.html public help page
- Floating Ask Ruthko widget on public pages
- Public Q&A for staffing, jobs, events, sponsors, vendors, partners, payments, and contacts
- Private admin topics are blocked from public guidance

New files:
- ask-ruthko.html
- js/ruthko-knowledge-base.js
- js/public-ruthko-assistant.js
- js/ai-studio-assistant.js
- netlify/functions/ask-ruthko.js

Updated files:
- ai-studio.html
- server.js
- public pages now include the Ask Ruthko widget

Public users should see:
- Staffing help
- Event organizing help
- Sponsor information
- Vendor booth direction
- Partnership path
- Payment path
- Ruthko contact details

Public users should not see:
- CRM records
- pipeline value
- internal admin tasks
- reports
- campaigns dashboard
- automation settings
- admin assistant controls

VPS endpoint:
/api/ask-ruthko

Netlify-compatible endpoint:
/.netlify/functions/ask-ruthko
