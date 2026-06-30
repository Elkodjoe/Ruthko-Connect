#!/usr/bin/env bash
set -e

APP_DIR="/var/www/ruthko-connect"
REPO_URL="https://github.com/Elkodjoe/Ruthko-Connect.git"
BRANCH="main"

sudo apt update
sudo apt install -y git curl nginx certbot python3-certbot-nginx

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi

sudo npm install -g pm2

sudo mkdir -p /var/www
if [ ! -d "$APP_DIR/.git" ]; then
  sudo git clone "$REPO_URL" "$APP_DIR"
else
  cd "$APP_DIR"
  sudo git fetch origin
  sudo git reset --hard "origin/$BRANCH"
fi

cd "$APP_DIR"
sudo npm install --omit=dev

if [ ! -f "$APP_DIR/.env" ]; then
  sudo cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo "Created $APP_DIR/.env. Edit it before production email testing."
fi

sudo cp "$APP_DIR/nginx/ruthko-connect.conf" /etc/nginx/sites-available/ruthko-connect
sudo ln -sf /etc/nginx/sites-available/ruthko-connect /etc/nginx/sites-enabled/ruthko-connect
sudo nginx -t
sudo systemctl reload nginx

sudo pm2 startOrReload "$APP_DIR/ecosystem.config.cjs"
sudo pm2 save
sudo pm2 startup systemd -u root --hp /root || true

echo "Ruthko Connect VPS deploy finished."
echo "Check: curl http://127.0.0.1:3000/health"
echo "After DNS points to this VPS, run: sudo certbot --nginx -d ruthkojobs.com -d www.ruthkojobs.com"
