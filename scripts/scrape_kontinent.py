import json
import re
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://kontinent-rm.ru"
CATEGORY_PATHS = [
    "/shop/",
    "/shop/all",
    "/shop/akcii",
    "/shop/brjuki",
    "/shop/futbolki-i-polo",
    "/shop/kostjumy",
    "/shop/kurtki",
    "/shop/shapki-i-balaklavy",
    "/shop/termobeljo",
]

OUT_DATA = Path("data")
OUT_ASSETS = Path("assets") / "products"
OUT_DATA.mkdir(parents=True, exist_ok=True)
OUT_ASSETS.mkdir(parents=True, exist_ok=True)

session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0"})


def fetch(path: str) -> str:
    url = urljoin(BASE_URL, path)
    response = session.get(url, timeout=45)
    response.raise_for_status()
    response.encoding = "utf-8"
    return response.text


def normalize_space(text: str) -> str:
    return " ".join(text.replace("\xa0", " ").split())


def parse_price(price_text: str) -> int:
    digits = re.findall(r"\d+", price_text)
    return int("".join(digits)) if digits else 0


def parse_images_from_gallery(page_html: str):
    images = re.findall(r'"(/_sh/[^"]+?\.(?:webp|jpg|jpeg|png))"', page_html, flags=re.I)
    # keep order and unique
    seen = set()
    ordered = []
    for img in images:
        if img not in seen:
            seen.add(img)
            ordered.append(img)
    # prioritize medium and base images
    preferred = [i for i in ordered if "m." in i or "m_" in i]
    fallback = [i for i in ordered if i not in preferred]
    merged = preferred + fallback
    return merged[:8]


def download_image(remote_path: str) -> str:
    filename = remote_path.split("/")[-1].split("?")[0]
    local_path = OUT_ASSETS / filename
    if not local_path.exists():
        url = urljoin(BASE_URL, remote_path)
        response = session.get(url, timeout=45)
        response.raise_for_status()
        local_path.write_bytes(response.content)
    return f"assets/products/{filename}"


def collect_product_links() -> set[str]:
    links = set()
    for category_path in CATEGORY_PATHS:
        html = fetch(category_path)
        category_links = re.findall(r'href=["\'](/shop/\d+/desc/[^"\']+)', html)
        links.update(category_links)
    return links


def parse_product(path: str):
    html = fetch(path)
    soup = BeautifulSoup(html, "html.parser")

    product_id_match = re.search(r"/shop/(\d+)/", path)
    product_id = int(product_id_match.group(1)) if product_id_match else 0

    title_el = soup.select_one("h1.product-header-title") or soup.find("h1")
    title = normalize_space(title_el.get_text(" ", strip=True)) if title_el else f"Товар {product_id}"

    price_el = soup.select_one(".price-box-curr") or soup.select_one(f".id-good-{product_id}-price")
    price_text = normalize_space(price_el.get_text(" ", strip=True)) if price_el else ""
    price = parse_price(price_text)

    old_price_el = soup.select_one(".price-box-old")
    old_price = parse_price(old_price_el.get_text(" ", strip=True)) if old_price_el else 0

    desc_el = soup.select_one(".product-page-desc")
    description_html = ""
    description_text = ""
    if desc_el:
        description_html = "\n".join(str(child) for child in desc_el.contents).strip()
        description_text = normalize_space(desc_el.get_text(" ", strip=True))

    props = []
    for li in soup.select(".props-list li"):
        label_el = li.select_one(".prop-label")
        val_el = li.select_one(".prop-val")
        label = normalize_space(label_el.get_text(" ", strip=True).rstrip(":")) if label_el else ""
        value = normalize_space(val_el.get_text(" ", strip=True)) if val_el else ""
        if label and value:
            props.append({"label": label, "value": value})

    sizes = []
    for uv in soup.select(".product-variations .uv-item"):
        size_name = normalize_space(uv.get_text(" ", strip=True))
        if size_name and size_name not in sizes:
            sizes.append(size_name)

    breadcrumb_names = []
    for crumb in soup.select(".breadcrumbs [itemprop='name']"):
        crumb_name = normalize_space(crumb.get_text(" ", strip=True))
        if crumb_name:
            breadcrumb_names.append(crumb_name)

    category = "Каталог"
    if len(breadcrumb_names) >= 2:
        category = breadcrumb_names[1]

    image_remote_paths = parse_images_from_gallery(html)
    image_local_paths = [download_image(img) for img in image_remote_paths]

    if not image_local_paths:
        # fallback placeholder from listing
        fallback_img = re.search(r'src=["\'](/_sh/[^"\']+?\.(?:webp|jpg|jpeg|png))["\']', html, flags=re.I)
        if fallback_img:
            image_local_paths = [download_image(fallback_img.group(1))]

    slug = path.strip("/").replace("/", "-")

    return {
        "id": product_id,
        "slug": slug,
        "url": path,
        "title": title,
        "category": category,
        "price": price,
        "oldPrice": old_price,
        "priceText": f"{price} руб." if price else "",
        "description": description_text,
        "descriptionHtml": description_html,
        "specs": props,
        "sizes": sizes,
        "images": image_local_paths,
    }


def parse_about_page():
    html = fetch("/index/0-2")
    soup = BeautifulSoup(html, "html.parser")
    content = soup.select_one(".tpl-content") or soup.select_one(".eText") or soup.body
    text = normalize_space(content.get_text(" ", strip=True)) if content else ""
    email_match = re.search(r"[\w\.-]+@[\w\.-]+", text)
    return {
        "title": "О нас",
        "text": text,
        "email": email_match.group(0) if email_match else "",
    }


def main():
    product_links = sorted(collect_product_links(), key=lambda x: int(x.split("/")[2]))
    products = [parse_product(link) for link in product_links]
    products = [p for p in products if p["id"] != 0]

    categories = sorted({p["category"] for p in products})
    about = parse_about_page()

    site_data = {
        "brand": "Континент",
        "source": BASE_URL,
        "currency": "RUB",
        "catalogTitle": "Каталог товаров",
        "about": about,
        "categories": categories,
        "productsCount": len(products),
    }

    (OUT_DATA / "products.json").write_text(
        json.dumps(products, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (OUT_DATA / "site.json").write_text(
        json.dumps(site_data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # logo
    logo_response = session.get(urljoin(BASE_URL, "/logo_j23.png"), timeout=45)
    if logo_response.ok:
        (Path("assets") / "logo.png").write_bytes(logo_response.content)

    print(f"Saved {len(products)} products")


if __name__ == "__main__":
    main()
