"""Backfill structured serving fields from existing oz/g and serving_size_description data

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-31 02:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
import re

# revision identifiers, used by Alembic.
revision = "b2c3d4e5f6a7"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


# ---------------------------------------------------------------------------
# Unit parsing helpers
# ---------------------------------------------------------------------------

# Canonical volume units (recognized abbreviations mapped to canonical form)
_VOLUME_UNITS = {
    "tbsp": ("tbsp", "volume"),
    "tablespoon": ("tbsp", "volume"),
    "tablespoons": ("tbsp", "volume"),
    "tsp": ("tsp", "volume"),
    "teaspoon": ("tsp", "volume"),
    "teaspoons": ("tsp", "volume"),
    "cup": ("cup", "volume"),
    "cups": ("cup", "volume"),
    "c": ("cup", "volume"),
    "ml": ("ml", "volume"),
    "milliliter": ("ml", "volume"),
    "milliliters": ("ml", "volume"),
    "fl oz": ("fl oz", "volume"),
    "fluid ounce": ("fl oz", "volume"),
    "fluid ounces": ("fl oz", "volume"),
    "qt": ("qt", "volume"),
    "quart": ("qt", "volume"),
    "quarts": ("qt", "volume"),
    "pt": ("pt", "volume"),
    "pint": ("pt", "volume"),
    "pints": ("pt", "volume"),
    "gal": ("gal", "volume"),
    "gallon": ("gal", "volume"),
    "gallons": ("gal", "volume"),
}

# Canonical mass units
_MASS_UNITS = {
    "oz": ("oz", "mass"),
    "ounce": ("oz", "mass"),
    "ounces": ("oz", "mass"),
    "g": ("g", "mass"),
    "gram": ("g", "mass"),
    "grams": ("g", "mass"),
    "kg": ("kg", "mass"),
    "kilogram": ("kg", "mass"),
    "kilograms": ("kg", "mass"),
    "lb": ("lb", "mass"),
    "pound": ("lb", "mass"),
    "pounds": ("lb", "mass"),
}

# Combine into one lookup
_ALL_UNITS = {}
_ALL_UNITS.update(_VOLUME_UNITS)
_ALL_UNITS.update(_MASS_UNITS)


def _parse_serving_description(desc: str) -> tuple[float | None, str | None, str | None]:
    """
    Parse a serving_size_description like '1 tbsp', '1/2 cup', '1 slice', '0.4 breasts'.

    Returns (value, unit, unit_kind) where unit_kind is one of
    'mass', 'volume', 'household', or None if unparseable.
    """
    if not desc:
        return None, None, None

    desc = desc.strip().lower()

    # Try to match patterns like "1 tbsp", "1/2 cup", "0.4 breasts", "2 slices cooked"
    # Pattern: optional number/fraction, then word(s) for the unit
    # First, strip trailing descriptors like "chopped", "raw", "drained", "cooked", "dry", "shredded", "shelled", etc.
    # These are preparation notes, not part of the unit
    _TRAILING_DESCRIPTORS = [
        "chopped raw", "chopped", "raw", "drained", "cooked", "dry",
        "shredded", "shelled", "pitted", "cleaned", "trimmed",
    ]

    # Remove trailing descriptors
    for td in _TRAILING_DESCRIPTORS:
        if desc.endswith(" " + td):
            desc = desc[: -len(td) - 1]
            break

    # Pattern: optional number (integer, decimal, or fraction) followed by unit word(s)
    # Fraction pattern: \d+/\d+
    # Decimal pattern: \d+\.\d+
    # Integer pattern: \d+
    m = re.match(
        r"^\s*"
        r"(?:(\d+)\s*/\s*(\d+)|(\d+\.\d+)|(\d+))?\s*"  # value: fraction OR decimal OR integer
        r"([a-zA-Z].*?)"                                   # unit text
        r"\s*$",
        desc,
    )
    if not m:
        return None, None, None

    frac_num, frac_den, decimal_val, int_val, unit_text = m.groups()

    # Compute numeric value
    value: float | None = None
    if frac_num and frac_den:
        value = float(frac_num) / float(frac_den)
    elif decimal_val:
        value = float(decimal_val)
    elif int_val:
        value = float(int_val)
    else:
        value = 1.0  # implicit "1" (e.g. "apple" → "1 apple")

    unit_text = unit_text.strip().rstrip(".")

    # Look up the unit in our known lists
    if unit_text in _ALL_UNITS:
        canonical_unit, kind = _ALL_UNITS[unit_text]
        return value, canonical_unit, kind

    # Check for plural forms that might not be in the dict (e.g. "breasts", "slices")
    # If it's not a known canonical unit, treat it as household
    # But first check if it's a known household item
    _HOUSEHOLD_UNITS = {
        "slice", "slices", "breast", "breasts", "fillet", "fillet", "fillets",
        "container", "containers", "packet", "packets", "package", "packages",
        "bun", "buns", "apple", "apples", "thigh", "thighs", "wing", "wings",
        "medallion", "medallions", "tomato", "tomatoes", "can", "cans",
        "spray", "avocado", "avocados", "plantain", "plantains", "roll", "rolls",
        "burger", "burgers", "piece", "pieces", "roast", "roasts", "egg", "eggs",
        "rib", "ribs", "pepper", "peppers", "sandwich", "sandwiches",
        "bowl", "bowls", "pizza", "taco", "tacos", "bagel", "bagels",
        "nugget", "nuggets", "fry", "fries", "fruit", "fruits",
        "chop", "chops", "link", "links", "patty", "patties",
        "ear", "ears", "head", "heads", "stalk", "stalks",
        "serving", "servings", "portion", "portions",
    }

    if unit_text in _HOUSEHOLD_UNITS:
        return value, unit_text, "household"

    # If the unit text contains a known unit as a prefix (e.g. "sec spray" → spray)
    # or is otherwise unrecognized, return as household
    return value, unit_text, "household"


def _backfill_nutrition(bind: sa.Connection) -> None:
    """Backfill serving_value, serving_unit, serving_unit_kind on nutrition rows."""
    nutrition_table = sa.table(
        "nutrition",
        sa.column("id", sa.Integer),
        sa.column("serving_size_description", sa.String),
        sa.column("serving_size_oz", sa.Float),
        sa.column("serving_size_g", sa.Integer),
        sa.column("serving_value", sa.Float),
        sa.column("serving_unit", sa.String),
        sa.column("serving_unit_kind", sa.Enum),
    )

    rows = bind.execute(
        sa.select(
            nutrition_table.c.id,
            nutrition_table.c.serving_size_description,
            nutrition_table.c.serving_size_oz,
            nutrition_table.c.serving_size_g,
        )
    ).fetchall()

    updated = 0
    for row in rows:
        row_id, desc, oz, g = row

        # First try to parse the serving_size_description
        value, unit, kind = _parse_serving_description(desc)

        # Fallback: if parsing didn't yield a useful result, use oz/g values
        if value is None or unit is None:
            if oz and oz > 0:
                value = oz
                unit = "oz"
                kind = "mass"
            elif g and g > 0:
                value = float(g)
                unit = "g"
                kind = "mass"
            else:
                # Nothing to backfill
                continue

        bind.execute(
            nutrition_table.update()
            .where(nutrition_table.c.id == row_id)
            .values(
                serving_value=value,
                serving_unit=unit,
                serving_unit_kind=kind,
            )
        )
        updated += 1

    print(f"  Backfilled {updated} nutrition rows")


def _backfill_food_sizes(bind: sa.Connection) -> None:
    """Backfill size_value, size_unit, size_unit_kind on food rows."""
    food_table = sa.table(
        "food",
        sa.column("id", sa.Integer),
        sa.column("size_oz", sa.Float),
        sa.column("size_g", sa.Integer),
        sa.column("size_value", sa.Float),
        sa.column("size_unit", sa.String),
        sa.column("size_unit_kind", sa.Enum),
    )

    rows = bind.execute(
        sa.select(
            food_table.c.id,
            food_table.c.size_oz,
            food_table.c.size_g,
        )
    ).fetchall()

    updated = 0
    for row in rows:
        row_id, oz, g = row

        # Prefer g (more canonical) over oz
        if g and g > 0:
            bind.execute(
                food_table.update()
                .where(food_table.c.id == row_id)
                .values(
                    size_value=float(g),
                    size_unit="g",
                    size_unit_kind="mass",
                )
            )
            updated += 1
        elif oz and oz > 0:
            bind.execute(
                food_table.update()
                .where(food_table.c.id == row_id)
                .values(
                    size_value=oz,
                    size_unit="oz",
                    size_unit_kind="mass",
                )
            )
            updated += 1

    print(f"  Backfilled {updated} food size rows")


def upgrade():
    bind = op.get_bind()
    print("Backfilling nutrition serving fields...")
    _backfill_nutrition(bind)
    print("Backfilling food size fields...")
    _backfill_food_sizes(bind)
    # Recipe size fields: no existing size_oz/size_g data to backfill (all NULL/0)


def downgrade():
    # No-op: downgrade just drops the columns (handled by Slice A's downgrade).
    # We don't need to un-backfill since the columns themselves are removed.
    pass