# Kailo Taxi: VPS deployment

One domain, one Nginx. Same layout as the "FULL DEPLOYMENT SOP".

```
User -> https://YOUR_DOMAIN -> Nginx (SSL + gzip)
   /            React build   /var/www/kailo-taxi
   /api/        Express API   127.0.0.1:5000   (pm2: kailo-taxi-api)
   /socket.io/  Socket.IO     127.0.0.1:5001   (pm2: kailo-taxi-socket)
   /uploads/    images        /var/www/uploads (Nginx serves them directly)
   MongoDB Atlas + Redis (socket bridge + BullMQ workers)
```

Files here: `nginx/kailo-taxi.conf`, `nginx/kailo-taxi-limits.conf`, `deploy.sh`,
`backend.env.production.example`, `frontend.env.production.example`. PM2 file: `../ecosystem.config.cjs`.

## 1. Server setup (once)

```bash
sudo timedatectl set-timezone Asia/Kolkata
sudo apt update && sudo apt install -y nginx git curl unzip redis-server certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm install -g pm2
sudo systemctl enable --now redis-server      # the socket server and workers need Redis

# images live on the VPS disk
sudo mkdir -p /var/www/uploads /var/www/kailo-taxi
sudo chown -R www-data:www-data /var/www/uploads && sudo chmod -R 755 /var/www/uploads
```

The backend runs as your login user and writes into `/var/www/uploads`, so give that user write access too:
`sudo chown -R $USER:www-data /var/www/uploads && sudo chmod -R 775 /var/www/uploads`

## 2. Code and env

```bash
cd ~ && git clone <repo-url> kailo-taxi && cd kailo-taxi
cp deploy/backend.env.production.example  Backend/.env            # fill the empty values, replace YOUR_DOMAIN
cp deploy/frontend.env.production.example Frontend/.env.production # add the Maps / Razorpay keys
mkdir -p Backend/config   # then upload the Firebase service-account JSON as Backend/config/firebase-service-account.json
```

## 3. Nginx and SSL

```bash
sed -i 's/YOUR_DOMAIN/yourdomain.com/g' deploy/nginx/kailo-taxi.conf
sudo cp deploy/nginx/kailo-taxi-limits.conf /etc/nginx/conf.d/
sudo cp deploy/nginx/kailo-taxi.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/kailo-taxi.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
# DNS first (Hostinger): A @ and A www -> VPS IP, then:
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com     # choose "redirect HTTP to HTTPS"
```

## 4. Deploy (first time and every update)

```bash
chmod +x deploy/deploy.sh && ./deploy/deploy.sh
pm2 startup        # run the command it prints, so everything restarts after a reboot
```

Test: `https://yourdomain.com`, `/health`, `/ready`, `/uploads/<file>`, and `pm2 status` (api, socket, 2 workers online).

## Images (sharp / libvips)

Every upload is resized to max 1280 px and converted to WebP by `sharp`, then saved in `/var/www/uploads`.
`sharp` brings its own libvips for Linux, so `npm ci` is enough. If an image is stored as `.jpg` instead of
`.webp`, sharp did not load: check `cd Backend && node -e "require('sharp')"`.

## Firebase checklist (project kailo-f2084)

Used: **Cloud Messaging** (push) and **Realtime Database** (live ride tracking). Auth and Storage are not used.

1. Realtime Database rules. The app talks to `taxiRides/*` from the browser without a login, so the database must
   allow it. Test-mode rules expire after 30 days and then live tracking stops. Replace with:
   ```json
   { "rules": { ".read": false, ".write": false,
                "taxiRides": { "$rideId": { ".read": true, ".write": true } } } }
   ```
   (Anyone who knows a ride id can read it. A stricter setup needs Firebase Auth tokens: ask before changing.)
2. Cloud Messaging API (V1) must be enabled in Google Cloud for the project, and the Web Push certificate (VAPID key)
   must be the one in `VITE_FIREBASE_VAPID_KEY`.
3. Old push tokens are from the previous Eqosy project and fail with "SenderId mismatch". Users and drivers get a new
   token when they log in again; clear the old `fcmTokens` / `fcmTokenWeb` / `fcmTokenMobile` values in MongoDB if they linger.
4. Rotate the service-account key (Firebase console -> Project settings -> Service accounts) if it was shared anywhere,
   and never commit `Backend/.env` or the JSON file.
5. Google Maps key: add `https://yourdomain.com/*` to its HTTP-referrer restrictions.
