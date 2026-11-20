"""Temporary USDA identity repair; remove this module and its app registration afterward."""

import os

import click
from flask.cli import with_appcontext

from models import Food, db
from usda_fdc_importer import USDA_SOURCE, USDAFdcImporter, _truncate


@click.command("backfill-usda-foundation-ids")
@click.option("--apply", is_flag=True, help="Save matches; otherwise only preview them.")
@with_appcontext
def backfill_usda_foundation_ids(apply: bool) -> None:
    """Repair missing IDs using exact USDA Foundation vendor and derived name matches."""
    foods = list(db.session.scalars(db.select(Food).where(
        Food.fdc_id.is_(None), Food.vendor == "USDA Foundation",
    ).order_by(Food.id)))
    # MySQL string comparisons can ignore case; enforce the requested exact vendor.
    foods = [food for food in foods if food.vendor == "USDA Foundation"]
    if not foods:
        click.echo("No USDA Foundation foods with missing FDC IDs.")
        return

    importer = USDAFdcImporter(api_key=os.environ.get("USDA_FDC_API_KEY", ""))
    candidates: dict[str, set[int]] = {}
    occupied = {
        (food.user_id, food.fdc_id)
        for food in db.session.scalars(db.select(Food).where(Food.source == USDA_SOURCE))
    }
    matched = 0
    for food in foods:
        if food.name not in candidates:
            ids: set[int] = set()
            page = 1
            # Search this database food's name; paginate only its matching search results.
            # The importer's truncation ellipsis is not part of the USDA description.
            query = food.name.removesuffix("...")
            if not query.strip():
                click.echo(f"SKIP food {food.id}: empty search name")
                continue
            while True:
                result = importer.search_foods(
                    query=query, page_number=page, page_size=200, data_types=["Foundation"],
                )
                for item in result["foods"]:
                    if item.get("dataType") != "Foundation":
                        continue
                    vendor = _truncate(str(item.get("brandOwner") or "").strip() or "USDA Foundation", 50)
                    name = _truncate(str(item.get("description") or "Unnamed USDA food"), 50)
                    if vendor == "USDA Foundation" and name == food.name:
                        ids.add(int(item["fdcId"]))
                if page >= result["totalPages"]:
                    break
                page += 1
            candidates[food.name] = ids
        ids = candidates[food.name]
        if len(ids) != 1:
            click.echo(f"SKIP food {food.id}: {food.name!r} ({len(ids)} matching USDA IDs)")
            continue
        fdc_id = next(iter(ids))
        if (food.user_id, fdc_id) in occupied:
            click.echo(f"SKIP food {food.id}: FDC {fdc_id} already belongs to another food for this owner")
            continue
        click.echo(f"MATCH food {food.id}: {food.name!r} -> FDC {fdc_id}")
        occupied.add((food.user_id, fdc_id))
        matched += 1
        if apply:
            food.source = USDA_SOURCE
            food.fdc_id = fdc_id
            food.fdc_data_type = "Foundation"

    if apply:
        db.session.commit()
    else:
        db.session.rollback()
    click.echo(f"{'Patched' if apply else 'Would patch'} {matched} of {len(foods)} foods.")
