# Consignment Tracker

A simple web app for tracking jewelry (necklaces, bracelets, rings,
earrings, etc.) that you place with stores on consignment, either for a
fixed rent or a commission on each sale.

## Features

- **Products**: name, category (necklace, bracelet, ring, earring, other) and cost.
- **Stores**: contact info and agreement type — fixed rent or commission (% of sale).
- **Consignments**: which product went to which store, when, how many units, current status (in store / sold / returned), and sale price.
- **Dashboard**: total revenue, profit, items sold, stock still in stores; status breakdown, revenue by store, items sold by category, and monthly revenue charts (Chart.js, bundled locally — no internet required).

Profit calculation: for stores on a commission agreement, the agreed
percentage of the sale goes to the store and the rest is yours; profit is
what's left after subtracting the product's cost. For stores on a fixed
rent agreement, the full sale amount is yours (rent is tracked separately
as a fixed expense on the store's record).

## Setup & Run

```bash
cd app
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# (optional) load sample data
python3 seed.py

python3 app.py
```

The app runs at `http://127.0.0.1:5000`. Data is stored in `konsinye.db`
(SQLite) inside the project folder — no separate database setup needed.

## Using it as a mobile app

The app is a installable PWA (Progressive Web App): open it in your phone's
browser and use "Add to Home Screen" (Safari) or "Install app" (Chrome) — it
then launches full-screen with its own icon, just like a native app. No App
Store / Play Store submission needed.

### Option A — same Wi-Fi as your computer (quickest, no hosting)

1. Run `python3 app.py` on your computer (it already listens on all network
   interfaces).
2. Find your computer's local IP (e.g. `192.168.1.23`) and open
   `http://<that-ip>:5000` from your phone's browser, while both devices are
   on the same Wi-Fi.
3. Add it to your home screen from the browser menu.

This only works while your computer is on and both devices share the same
network.

### Option B — always-on, reachable from anywhere: deploy to PythonAnywhere (free)

[PythonAnywhere](https://www.pythonanywhere.com) has a free tier for Flask
apps with **persistent storage**, so your SQLite data survives restarts
(unlike the free tiers of Render/Railway/Heroku-likes, whose disks are wiped
on every redeploy — avoid those for this app unless you upgrade to a paid
plan with a persistent disk).

1. Create a free account at pythonanywhere.com.
2. Open a **Bash console** from the dashboard and clone your repo:
   ```bash
   git clone https://github.com/<your-username>/Konsinye.git
   cd Konsinye/app
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python3 seed.py   # optional, only for sample data
   ```
3. Go to the **Web** tab → **Add a new web app** → choose **Manual
   configuration** (Flask) → pick the same Python version as your venv.
4. Set the **virtualenv** path to `/home/<you>/Konsinye/app/venv`.
5. Edit the generated **WSGI configuration file** so it imports your app:
   ```python
   import sys
   path = "/home/<you>/Konsinye/app"
   if path not in sys.path:
       sys.path.insert(0, path)
   from app import app as application
   ```
6. Click **Reload** on the Web tab. Your app is now live at
   `https://<you>.pythonanywhere.com` — open that URL on your phone and add
   it to your home screen.

To publish future changes, `git pull` in the Bash console and click
**Reload** again.

## Tech Stack

- Python / Flask + Flask-SQLAlchemy (SQLite)
- Jinja2 templates + plain CSS
- Chart.js (MIT licensed, bundled in `static/chart.umd.min.js`)
- Installable as a PWA (`static/manifest.json`, `static/sw.js`)
- `Procfile` + `gunicorn` included for platforms that use process files (Render, Railway, etc.) — remember their free tiers may not persist the SQLite file across deploys
