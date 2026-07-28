from datetime import date

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

CATEGORIES = ["Kolye", "Bileklik", "Yüzük", "Küpe", "Diğer"]
AGREEMENT_TYPES = ["komisyon", "kira"]
STATUSES = ["beklemede", "satildi", "iade"]

STATUS_LABELS = {
    "beklemede": "Mağazada Bekliyor",
    "satildi": "Satıldı",
    "iade": "İade Edildi",
}


class Store(db.Model):
    __tablename__ = "stores"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    contact = db.Column(db.String(200))
    agreement_type = db.Column(db.String(20), nullable=False, default="komisyon")
    agreement_value = db.Column(db.Float, nullable=False, default=0)
    created_at = db.Column(db.Date, default=date.today)

    consignments = db.relationship(
        "Consignment", backref="store", cascade="all, delete-orphan"
    )

    @property
    def agreement_label(self):
        if self.agreement_type == "kira":
            return f"Sabit Kira: {self.agreement_value:.2f} TL"
        return f"Komisyon: %{self.agreement_value:.0f}"


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(50), nullable=False, default="Diğer")
    cost_price = db.Column(db.Float, nullable=False, default=0)
    created_at = db.Column(db.Date, default=date.today)

    consignments = db.relationship(
        "Consignment", backref="product", cascade="all, delete-orphan"
    )


class Consignment(db.Model):
    __tablename__ = "consignments"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    store_id = db.Column(db.Integer, db.ForeignKey("stores.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    unit_sale_price = db.Column(db.Float, nullable=False, default=0)
    date_sent = db.Column(db.Date, default=date.today)
    status = db.Column(db.String(20), nullable=False, default="beklemede")
    date_resolved = db.Column(db.Date)
    actual_sale_price = db.Column(db.Float)

    @property
    def status_label(self):
        return STATUS_LABELS.get(self.status, self.status)

    @property
    def revenue(self):
        if self.status != "satildi":
            return 0.0
        price = self.actual_sale_price or self.unit_sale_price
        return price * self.quantity

    @property
    def store_share(self):
        if self.status != "satildi":
            return 0.0
        if self.store.agreement_type == "komisyon":
            return self.revenue * (self.store.agreement_value / 100)
        return 0.0

    @property
    def owner_share(self):
        return self.revenue - self.store_share

    @property
    def profit(self):
        if self.status != "satildi":
            return 0.0
        return self.owner_share - (self.product.cost_price * self.quantity)
