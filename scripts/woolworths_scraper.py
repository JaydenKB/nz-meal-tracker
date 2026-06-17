#!/usr/bin/env python3
"""
Scrape Woolworths NZ browse pages for product names, descriptions, and prices.

Outputs JSON suitable for seeding nz-meal-tracker ingredients / store products.
Uses Playwright because woolworths.co.nz is a JS app with bot protection.

Usage:
  pip install -r scripts/requirements-scraper.txt
  playwright install chromium
  python scripts/woolworths_scraper.py --max-products 20
  python scripts/woolworths_scraper.py --category pantry --fetch-details
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from bs4 import BeautifulSoup
from playwright.sync_api import Page, TimeoutError as PlaywrightTimeout, sync_playwright

BASE_URL = "https://www.woolworths.co.nz"
BROWSE_URL = f"{BASE_URL}/shop/browse"
DEFAULT_OUTPUT = Path(__file__).resolve().parent / "output" / "woolworths_products.json"

SIZE_RE = re.compile(
    r"(tray\s\d+)|(\d+(?:\.\d+)?(?:-\d+\.\d+)?\s?(?:g|kg|l|ml|pack|each|punnet|bunch))\b",
    re.IGNORECASE,
)


@dataclass
class WoolworthsProduct:
    stockcode: str
    name: str
    product_name: str
    description: str = ""
    category_slug: str = ""
    category_label: str = ""
    package_size: float | None = None
    package_unit: str = "g"
    price_nzd: float | None = None
    unit_price: str = ""
    url: str = ""
    image_url: str = ""
    in_stock: bool | None = None

    def to_app_item(self) -> dict[str, Any]:
        """Shape close to nz-meal-tracker import / store product fields."""
        grams = package_size_to_grams(self.package_size, self.package_unit)
        return {
            "name": self.name,
            "productName": self.product_name,
            "description": self.description,
            "stockcode": self.stockcode,
            "category": self.category_label or self.category_slug,
            "packageSize": grams if grams is not None else (self.package_size or 1),
            "packageUnit": "g" if grams is not None else self.package_unit,
            "priceNzd": self.price_nzd,
            "unitPrice": self.unit_price,
            "url": self.url,
            "barcode": None,
            "calories": 0,
            "proteinG": 0,
            "fatG": 0,
            "carbsG": 0,
            "isProcessed": False,
            "selected": True,
        }


@dataclass
class ScrapeState:
    scraped_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    store: str = "Woolworths NZ"
    source_url: str = BROWSE_URL
    product_count: int = 0
    products: list[dict[str, Any]] = field(default_factory=list)


def package_size_to_grams(size: float | None, unit: str) -> float | None:
    if size is None:
        return None
    u = unit.lower().strip()
    if u in {"kg", "kilogram"}:
        return round(size * 1000)
    if u in {"l", "litre", "liter", "lt"}:
        return round(size * 1000)
    if u in {"g", "gram", "grams", "ml"}:
        return round(size)
    return None


def title_case(text: str) -> str:
    return " ".join(word.capitalize() for word in text.split())


def clean_product_title(raw: str) -> str:
    cleaned = raw.lower().replace("\u00a0", " ")
    for prefix in ("fresh fruit", "fresh vegetable", "fresh "):
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix) :]
    return cleaned.strip()


def split_name_and_size(raw: str) -> tuple[str, str, float | None, str]:
    cleaned = clean_product_title(raw)
    match = SIZE_RE.search(cleaned)
    if not match:
        return title_case(cleaned), "", None, "each"

    idx = cleaned.index(match.group(0))
    name = title_case(cleaned[:idx].strip())
    size_text = cleaned[idx:].strip()

    size_match = re.search(r"(\d+(?:\.\d+)?)", size_text)
    size_value = float(size_match.group(1)) if size_match else None

    unit = "each"
    lower = size_text.lower()
    if "kg" in lower:
        unit = "kg"
    elif re.search(r"\bml\b", lower):
        unit = "ml"
    elif re.search(r"\bl\b", lower) and "ml" not in lower:
        unit = "l"
    elif "g" in lower:
        unit = "g"
    elif "pack" in lower:
        unit = "pack"
    elif "punnet" in lower:
        unit = "punnet"
    elif "bunch" in lower:
        unit = "bunch"
    elif "tray" in lower:
        unit = "each"

    return name, size_text, size_value, unit


def parse_price(entry: BeautifulSoup) -> float | None:
    dollars = entry.select_one("product-price div h3 em")
    cents = entry.select_one("product-price div h3 span")
    if not dollars:
        return None

    dollar_text = dollars.get_text(strip=True)
    cent_text = cents.get_text(strip=True) if cents else "00"
    cent_digits = re.sub(r"\D", "", cent_text) or "00"
    try:
        value = float(f"{dollar_text}.{cent_digits[:2]}")
    except ValueError:
        return None
    if value <= 0 or value > 999:
        return None
    return value


def parse_listing_product(entry_html: str, category_slug: str, category_label: str) -> WoolworthsProduct | None:
    soup = BeautifulSoup(entry_html, "html.parser")
    entry = soup.select_one("div.product-entry") or soup

    title_el = None
    for h3 in entry.select("h3"):
        h3_id = h3.get("id") or ""
        if "-title" in h3_id:
            title_el = h3
            break
    if not title_el:
        return None

    stockcode = re.sub(r"\D", "", title_el.get("id", ""))
    if len(stockcode) < 2:
        return None

    raw_title = title_el.get_text(" ", strip=True)
    name, size_text, package_size, package_unit = split_name_and_size(raw_title)

    if "kg" in (entry.select_one("product-price div h3 span") or BeautifulSoup("", "html.parser")).get_text(" ", strip=True).lower():
        size_text = size_text or "per kg"
        package_unit = "kg"

    price = parse_price(entry)
    if price is None:
        return None

    unit_price_el = entry.select_one("span.cupPrice")
    unit_price = unit_price_el.get_text(" ", strip=True) if unit_price_el else ""

    link = entry.select_one('a[href*="productdetails"]')
    href = link.get("href", "") if link else ""
    if href.startswith("/"):
        href = f"{BASE_URL}{href}"
    if not href:
        href = f"{BASE_URL}/shop/productdetails?stockcode={stockcode}"

    img = entry.select_one("img")
    image_url = img.get("src", "") if img else ""

    product_name = name if not size_text else f"{name} {size_text}".strip()
    if len(name) < 3 or len(name) > 120:
        return None

    return WoolworthsProduct(
        stockcode=stockcode,
        name=name,
        product_name=product_name,
        category_slug=category_slug,
        category_label=category_label,
        package_size=package_size,
        package_unit=package_unit,
        price_nzd=price,
        unit_price=unit_price,
        url=href,
        image_url=image_url,
    )


def set_page_param(url: str, page: int, size: int = 48) -> str:
    parsed = urlparse(url)
    query = parse_qs(parsed.query, keep_blank_values=True)
    query["page"] = [str(page)]
    query["size"] = [str(size)]
    query.setdefault("sort", ["BrowseRelevance"])
    query.setdefault("inStockProductsOnly", ["false"])
    new_query = urlencode({k: v[0] for k, v in query.items()})
    return urlunparse(parsed._replace(query=new_query))


def goto_page(page: Page, url: str) -> None:
    last_error: Exception | None = None
    for wait_until in ("domcontentloaded", "load"):
        try:
            page.goto(url, wait_until=wait_until, timeout=90_000)
            return
        except Exception as exc:  # noqa: BLE001 — retry with alternate wait strategy
            last_error = exc
    if last_error:
        raise last_error


def discover_categories(page: Page) -> list[tuple[str, str, str]]:
    goto_page(page, BROWSE_URL)
    page.wait_for_selector('a[href*="/shop/browse/"]', timeout=30_000)

    categories: list[tuple[str, str, str]] = []
    seen: set[str] = set()

    for link in page.locator('a[href*="/shop/browse/"]').all():
        href = link.get_attribute("href") or ""
        label = (link.inner_text() or "").strip()
        if not href or href.rstrip("/") == "/shop/browse":
            continue
        if "page=" not in href:
            continue
        full_url = href if href.startswith("http") else f"{BASE_URL}{href}"
        slug_match = re.search(r"/shop/browse/([^?]+)", full_url)
        slug = slug_match.group(1).split("/")[0] if slug_match else ""
        if not slug or slug in seen:
            continue
        seen.add(slug)
        clean_label = re.sub(r"\s*\(\d+\)\s*$", "", label).strip()
        categories.append((slug, clean_label, full_url))

    return categories


def scroll_to_load_products(page: Page) -> None:
    for _ in range(5):
        page.keyboard.press("PageDown")
        page.wait_for_timeout(400)


def count_pages(page: Page) -> int:
    try:
        html = page.inner_html("ul.pagination")
    except PlaywrightTimeout:
        return 1
    soup = BeautifulSoup(html, "html.parser")
    items = soup.select("li")
    if len(items) <= 2:
        return 1
    return max(1, len(items) - 2)


def scrape_category_page(
    page: Page,
    url: str,
    category_slug: str,
    category_label: str,
) -> list[WoolworthsProduct]:
    goto_page(page, url)
    try:
        page.wait_for_selector("product-price h3", timeout=20_000)
    except PlaywrightTimeout:
        return []

    scroll_to_load_products(page)

    try:
        grid_html = page.inner_html("product-grid")
    except PlaywrightTimeout:
        return []

    soup = BeautifulSoup(grid_html, "html.parser")
    entries = soup.select("cdx-card product-stamp-grid div.product-entry")
    if not entries:
        entries = soup.select("div.product-entry")

    ad_hrefs = {
        a.get("href")
        for a in soup.select("div.carousel-track div cdx-card product-stamp-grid div.product-entry a")
        if a.get("href")
    }

    products: list[WoolworthsProduct] = []
    for entry in entries:
        entry_link = entry.select_one("a")
        href = entry_link.get("href") if entry_link else None
        if href and href in ad_hrefs:
            continue
        parsed = parse_listing_product(str(entry), category_slug, category_label)
        if parsed:
            products.append(parsed)
    return products


def fetch_product_details(page: Page, product: WoolworthsProduct, delay_s: float) -> None:
    goto_page(page, product.url)
    try:
        page.wait_for_selector("h1", timeout=20_000)
    except PlaywrightTimeout:
        return

    desc = page.locator("p.product-description").first.inner_text(timeout=3_000).strip()
    if desc:
        product.description = desc
        return

    body_text = page.locator("body").inner_text(timeout=5_000)
    origin_match = re.search(
        r"Country of origin\s*\n(.+?)(?:\n\nInformation provided|\Z)",
        body_text,
        re.DOTALL,
    )
    if origin_match:
        product.description = f"Country of origin: {origin_match.group(1).strip()}"
        return

    unavailable = "unavailable" in body_text.lower()
    product.in_stock = not unavailable
    time.sleep(delay_s)


def load_existing(output_path: Path) -> ScrapeState:
    if not output_path.exists():
        return ScrapeState()
    data = json.loads(output_path.read_text(encoding="utf-8"))
    state = ScrapeState(
        scraped_at=data.get("scrapedAt", datetime.now(timezone.utc).isoformat()),
        store=data.get("store", "Woolworths NZ"),
        source_url=data.get("sourceUrl", BROWSE_URL),
        product_count=data.get("productCount", 0),
        products=data.get("products", []),
    )
    return state


def save_state(state: ScrapeState, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "scrapedAt": state.scraped_at,
        "store": state.store,
        "sourceUrl": state.source_url,
        "productCount": len(state.products),
        "products": state.products,
        "importHint": (
            "Each product includes fields aligned with nz-meal-tracker store products. "
            "Nutrition macros are zero — enrich via barcode scan or manual entry before import."
        ),
    }
    output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scrape Woolworths NZ browse catalogue.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="JSON output path")
    parser.add_argument(
        "--category",
        action="append",
        default=[],
        help="Limit to category slug(s), e.g. pantry or fruit-veg (repeatable)",
    )
    parser.add_argument("--max-pages", type=int, default=0, help="Max pages per category (0 = all)")
    parser.add_argument("--max-products", type=int, default=0, help="Stop after N products (0 = no limit)")
    parser.add_argument(
        "--fetch-details",
        action="store_true",
        help="Visit each product page for descriptions (much slower)",
    )
    parser.add_argument("--delay", type=float, default=1.5, help="Seconds between page loads")
    parser.add_argument(
        "--browser",
        choices=("firefox", "chromium"),
        default="firefox",
        help="Browser engine (firefox works headless; chromium may need --headed)",
    )
    parser.add_argument("--headed", action="store_true", help="Show the browser window")
    parser.add_argument("--resume", action="store_true", help="Skip stockcodes already in output file")
    return parser.parse_args()


def launch_browser(playwright: Any, args: argparse.Namespace):
    headless = not args.headed
    if args.browser == "firefox":
        return playwright.firefox.launch(headless=headless)

    return playwright.chromium.launch(
        headless=headless,
        args=["--disable-http2", "--disable-blink-features=AutomationControlled"],
    )


def main() -> int:
    args = parse_args()
    existing = load_existing(args.output) if args.resume else ScrapeState()
    seen_codes = {p.get("stockcode") for p in existing.products if p.get("stockcode")}

    collected: list[dict[str, Any]] = list(existing.products)
    state = existing if args.resume else ScrapeState()

    with sync_playwright() as playwright:
        browser = launch_browser(playwright, args)
        context = browser.new_context(
            locale="en-NZ",
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            extra_http_headers={"Accept-Language": "en-NZ,en;q=0.9"},
        )
        context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });"
        )
        page = context.new_page()

        print(f"Opening {BROWSE_URL} …")
        categories = discover_categories(page)
        if args.category:
            wanted = {c.lower() for c in args.category}
            categories = [c for c in categories if c[0].lower() in wanted]
        if not categories:
            print("No categories found.", file=sys.stderr)
            browser.close()
            return 1

        print(f"Found {len(categories)} top-level categories.")

        for slug, label, base_url in categories:
            if args.max_products and len(collected) >= args.max_products:
                break

            print(f"\n[{slug}] {label}")
            goto_page(page, base_url)
            try:
                page.wait_for_selector("product-price h3", timeout=20_000)
            except PlaywrightTimeout:
                print("  Skipping — no products loaded.")
                continue

            total_pages = count_pages(page)
            pages_to_scrape = total_pages if args.max_pages <= 0 else min(total_pages, args.max_pages)
            print(f"  Pages: {pages_to_scrape}/{total_pages}")

            for page_num in range(1, pages_to_scrape + 1):
                if args.max_products and len(collected) >= args.max_products:
                    break

                page_url = set_page_param(base_url, page_num)
                products = scrape_category_page(page, page_url, slug, label)
                new_count = 0
                for product in products:
                    if product.stockcode in seen_codes:
                        continue
                    if args.fetch_details:
                        fetch_product_details(page, product, args.delay)
                    item = product.to_app_item()
                    collected.append(item)
                    seen_codes.add(product.stockcode)
                    new_count += 1
                    if args.max_products and len(collected) >= args.max_products:
                        break

                print(f"  page {page_num}: +{new_count} products (total {len(collected)})")
                state.products = collected
                state.product_count = len(collected)
                save_state(state, args.output)

                if page_num < pages_to_scrape:
                    time.sleep(args.delay)

            time.sleep(args.delay)

        browser.close()

    state.products = collected
    state.product_count = len(collected)
    state.scraped_at = datetime.now(timezone.utc).isoformat()
    save_state(state, args.output)
    print(f"\nSaved {len(collected)} products to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
