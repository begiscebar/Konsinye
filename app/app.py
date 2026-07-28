import os
from collections import OrderedDict
from datetime import date

from flask import Flask, redirect, render_template, request, url_for

from models import (
    AGREEMENT_TYPES,
    CATEGORIES,
    STATUS_LABELS,
    STATUSES,
    Consignment,
    Product,
    Store,
    db,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(
        BASE_DIR, "konsinye.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    db.init_app(app)

    with app.app_context():
        db.create_all()

    register_routes(app)
    return app


def register_routes(app):
    @app.route("/")
    def dashboard():
        consignments = Consignment.query.all()
        sold = [c for c in consignments if c.status == "sold"]

        total_revenue = sum(c.revenue for c in sold)
        total_profit = sum(c.profit for c in sold)
        total_items_sold = sum(c.quantity for c in sold)
        active_stock = sum(
            c.quantity for c in consignments if c.status == "pending"
        )

        status_counts = OrderedDict((s, 0) for s in STATUSES)
        for c in consignments:
            status_counts[c.status] += c.quantity

        revenue_by_store = OrderedDict()
        for c in sold:
            revenue_by_store[c.store.name] = (
                revenue_by_store.get(c.store.name, 0) + c.revenue
            )

        sold_by_category = OrderedDict((cat, 0) for cat in CATEGORIES)
        for c in sold:
            sold_by_category[c.product.category] = (
                sold_by_category.get(c.product.category, 0) + c.quantity
            )

        revenue_by_month = OrderedDict()
        for c in sorted(sold, key=lambda c: c.date_resolved or c.date_sent):
            d = c.date_resolved or c.date_sent
            key = d.strftime("%Y-%m")
            revenue_by_month[key] = revenue_by_month.get(key, 0) + c.revenue

        return render_template(
            "dashboard.html",
            total_revenue=total_revenue,
            total_profit=total_profit,
            total_items_sold=total_items_sold,
            active_stock=active_stock,
            status_labels=[STATUS_LABELS[s] for s in status_counts],
            status_values=list(status_counts.values()),
            store_labels=list(revenue_by_store.keys()),
            store_values=list(revenue_by_store.values()),
            category_labels=list(sold_by_category.keys()),
            category_values=list(sold_by_category.values()),
            month_labels=list(revenue_by_month.keys()),
            month_values=list(revenue_by_month.values()),
            recent=sorted(consignments, key=lambda c: c.id, reverse=True)[:8],
        )

    @app.route("/products")
    def products():
        items = Product.query.order_by(Product.name).all()
        return render_template("products.html", products=items, categories=CATEGORIES)

    @app.route("/products/add", methods=["POST"])
    def add_product():
        product = Product(
            name=request.form["name"].strip(),
            category=request.form["category"],
            cost_price=float(request.form["cost_price"] or 0),
        )
        db.session.add(product)
        db.session.commit()
        return redirect(url_for("products"))

    @app.route("/products/<int:product_id>/delete", methods=["POST"])
    def delete_product(product_id):
        product = Product.query.get_or_404(product_id)
        db.session.delete(product)
        db.session.commit()
        return redirect(url_for("products"))

    @app.route("/stores")
    def stores():
        items = Store.query.order_by(Store.name).all()
        return render_template(
            "stores.html", stores=items, agreement_types=AGREEMENT_TYPES
        )

    @app.route("/stores/add", methods=["POST"])
    def add_store():
        store = Store(
            name=request.form["name"].strip(),
            contact=request.form.get("contact", "").strip(),
            agreement_type=request.form["agreement_type"],
            agreement_value=float(request.form["agreement_value"] or 0),
        )
        db.session.add(store)
        db.session.commit()
        return redirect(url_for("stores"))

    @app.route("/stores/<int:store_id>/delete", methods=["POST"])
    def delete_store(store_id):
        store = Store.query.get_or_404(store_id)
        db.session.delete(store)
        db.session.commit()
        return redirect(url_for("stores"))

    @app.route("/consignments")
    def consignments():
        status_filter = request.args.get("status", "")
        query = Consignment.query
        if status_filter in STATUSES:
            query = query.filter_by(status=status_filter)
        items = query.order_by(Consignment.date_sent.desc()).all()
        return render_template(
            "consignments.html",
            consignments=items,
            products=Product.query.order_by(Product.name).all(),
            stores=Store.query.order_by(Store.name).all(),
            statuses=STATUSES,
            status_labels=STATUS_LABELS,
            status_filter=status_filter,
        )

    @app.route("/consignments/add", methods=["POST"])
    def add_consignment():
        item = Consignment(
            product_id=int(request.form["product_id"]),
            store_id=int(request.form["store_id"]),
            quantity=int(request.form["quantity"] or 1),
            unit_sale_price=float(request.form["unit_sale_price"] or 0),
            date_sent=date.fromisoformat(request.form["date_sent"]),
        )
        db.session.add(item)
        db.session.commit()
        return redirect(url_for("consignments"))

    @app.route("/consignments/<int:item_id>/status", methods=["POST"])
    def update_status(item_id):
        item = Consignment.query.get_or_404(item_id)
        item.status = request.form["status"]
        if item.status in ("sold", "returned"):
            item.date_resolved = date.today()
            if item.status == "sold":
                actual_price = request.form.get("actual_sale_price")
                item.actual_sale_price = (
                    float(actual_price) if actual_price else item.unit_sale_price
                )
        else:
            item.date_resolved = None
            item.actual_sale_price = None
        db.session.commit()
        return redirect(url_for("consignments"))

    @app.route("/consignments/<int:item_id>/delete", methods=["POST"])
    def delete_consignment(item_id):
        item = Consignment.query.get_or_404(item_id)
        db.session.delete(item)
        db.session.commit()
        return redirect(url_for("consignments"))


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
