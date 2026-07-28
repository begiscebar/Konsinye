# Konsinye Takip

Kolye, bileklik, yüzük, küpe gibi ürünlerinizi mağazalara konsinye (kira veya
kâr yüzdesi karşılığı) bıraktığınızda; ürün, mağaza, anlaşma tipi ve satış
durumunu takip etmenizi sağlayan basit bir web uygulaması.

## Özellikler

- **Ürünler**: Ürün adı, kategori (kolye, bileklik, yüzük, küpe, diğer) ve maliyet takibi.
- **Mağazalar**: Mağaza bilgisi ve anlaşma tipi — sabit kira ya da kâr yüzdesi (komisyon).
- **Konsinyeler**: Hangi üründen, hangi mağazaya, ne zaman, kaç adet bırakıldığı; durumu (mağazada bekliyor / satıldı / iade edildi) ve satış fiyatı.
- **Panel**: Toplam ciro, kâr, satılan ürün adedi, bekleyen stok; durum dağılımı, mağazaya göre ciro, kategoriye göre satış ve aylık ciro grafikleri (Chart.js, projeye gömülü — internet gerektirmez).

Kâr/komisyon hesaplaması: anlaşma tipi "komisyon" olan mağazalarda satış
tutarının belirlenen yüzdesi mağazaya, kalanı size ait sayılır; kâr, size
kalan tutardan ürün maliyetinin düşülmesiyle hesaplanır. "Kira" anlaşmalı
mağazalarda satış tutarının tamamı size ait kabul edilir (kira ayrı bir
sabit gider olarak mağaza kartında görünür).

## Kurulum ve Çalıştırma

```bash
cd app
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# (opsiyonel) örnek verilerle başlamak için
python3 seed.py

python3 app.py
```

Uygulama `http://127.0.0.1:5000` adresinde çalışır. Veriler proje klasöründeki
`konsinye.db` (SQLite) dosyasında tutulur, ekstra bir veritabanı kurulumu
gerekmez.

## Teknoloji

- Python / Flask + Flask-SQLAlchemy (SQLite)
- Jinja2 şablonları + saf CSS
- Chart.js (MIT lisanslı, `static/chart.umd.min.js` içinde gömülü)
