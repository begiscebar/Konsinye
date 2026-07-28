from datetime import date, timedelta

from app import create_app
from models import Consignment, Product, Store, db

app = create_app()

with app.app_context():
    db.drop_all()
    db.create_all()

    stores = [
        Store(name="Downtown Boutique", contact="555-011-2233", agreement_type="commission", agreement_value=30),
        Store(name="Marina Gift Shop", contact="555-044-5566", agreement_type="rent", agreement_value=150),
        Store(name="Elegant Accessories", contact="555-033-2211", agreement_type="commission", agreement_value=25),
    ]
    db.session.add_all(stores)

    products = [
        Product(name="Pearl Necklace", category="Necklace", cost_price=12),
        Product(name="Silver Bracelet", category="Bracelet", cost_price=8),
        Product(name="Stone Ring", category="Ring", cost_price=6),
        Product(name="Gold-Plated Earrings", category="Earring", cost_price=9),
        Product(name="Chain Necklace", category="Necklace", cost_price=15),
    ]
    db.session.add_all(products)
    db.session.commit()

    today = date.today()
    samples = [
        (products[0], stores[0], 1, 32, 40, "sold", 30),
        (products[1], stores[1], 2, 20, 35, "sold", 20),
        (products[2], stores[2], 1, 18, 20, "pending", None),
        (products[3], stores[0], 1, 26, 25, "sold", 26),
        (products[4], stores[1], 1, 38, 15, "pending", None),
        (products[0], stores[2], 1, 32, 60, "returned", None),
        (products[1], stores[0], 3, 21, 10, "sold", 21),
        (products[2], stores[1], 2, 19, 5, "pending", None),
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
        if status in ("sold", "returned"):
            item.date_resolved = sent + timedelta(days=5)
            if status == "sold":
                item.actual_sale_price = actual
        db.session.add(item)

    db.session.commit()
    print("Sample data added.")
