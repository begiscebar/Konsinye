from datetime import date, timedelta

from app import create_app
from models import Consignment, Product, Store, db

app = create_app()

with app.app_context():
    db.drop_all()
    db.create_all()

    stores = [
        Store(name="Vitrin Aksesuar", contact="0212 555 11 22", agreement_type="komisyon", agreement_value=30),
        Store(name="Marina Butik", contact="0532 444 55 66", agreement_type="kira", agreement_value=1500),
        Store(name="Şık Takı", contact="0216 333 22 11", agreement_type="komisyon", agreement_value=25),
    ]
    db.session.add_all(stores)

    products = [
        Product(name="İnci Kolye", category="Kolye", cost_price=120),
        Product(name="Gümüş Bileklik", category="Bileklik", cost_price=80),
        Product(name="Taşlı Yüzük", category="Yüzük", cost_price=60),
        Product(name="Altın Kaplama Küpe", category="Küpe", cost_price=90),
        Product(name="Zincir Kolye", category="Kolye", cost_price=150),
    ]
    db.session.add_all(products)
    db.session.commit()

    today = date.today()
    samples = [
        (products[0], stores[0], 1, 320, 40, "satildi", 300),
        (products[1], stores[1], 2, 200, 35, "satildi", 200),
        (products[2], stores[2], 1, 180, 20, "beklemede", None),
        (products[3], stores[0], 1, 260, 25, "satildi", 260),
        (products[4], stores[1], 1, 380, 15, "beklemede", None),
        (products[0], stores[2], 1, 320, 60, "iade", None),
        (products[1], stores[0], 3, 210, 10, "satildi", 210),
        (products[2], stores[1], 2, 190, 5, "beklemede", None),
    ]

    for product, store, qty, price, days_ago, status, actual in samples:
        sent = today - timedelta(days=days_ago)
        item = Consignment(
            product=product,
            store=store,
            quantity=qty,
            unit_sale_price=price,
            date_sent=sent,
            status=status,
        )
        if status in ("satildi", "iade"):
            item.date_resolved = sent + timedelta(days=5)
            if status == "satildi":
                item.actual_sale_price = actual
        db.session.add(item)

    db.session.commit()
    print("Örnek veriler eklendi.")
