RUTHKO CONNECT NEXT STEP

Local folder destination:
C:\Users\kodjo\ruthko-connect

How to run locally:
1. Open the folder.
2. Double-click start-local-server.bat.
3. Open http://localhost:5500 in your browser.

GitHub setup:
1. Open Command Prompt.
2. Run:

cd C:\Users\kodjo\ruthko-connect
git init
git add .
git commit -m "Initial Ruthko Connect dashboard"
git branch -M main
git remote add origin https://github.com/Elkodjoe/ruthko-connect.git
git push -u origin main

Create the GitHub repository first if it does not exist.

Netlify setup:
1. Go to Netlify.
2. Add new site.
3. Import from GitHub.
4. Select ruthko-connect.
5. Build command: leave empty.
6. Publish directory: .
7. Deploy.

Important files:
index.html: main app
images/logo.png: your logo
netlify.toml: Netlify deployment settings
_redirects: fixes page routing
start-local-server.bat: Windows local server starter

Next business build:
1. Replace fake dashboard numbers with real Ruthko numbers.
2. Replace sample employers, jobs, sponsors, and events.
3. Add Stripe payment links to sponsor buttons.
4. Add Jotform or Formspree links for employer, sponsor, vendor, and candidate forms.
5. Deploy to Netlify.
