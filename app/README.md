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

## Tech Stack

- Python / Flask + Flask-SQLAlchemy (SQLite)
- Jinja2 templates + plain CSS
- Chart.js (MIT licensed, bundled in `static/chart.umd.min.js`)
