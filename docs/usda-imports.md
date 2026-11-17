# USDA import duplicate protection

USDA imports are administrator-only operations that create foods in the shared catalog. Import identity is the combination of owner, source (`usda_fdc`), and USDA `fdc_id`. A catalog food is imported once; repeating an import skips it and preserves its name, serving sizes, nutrition, and starter-food flag.

## Search and selection

`GET /api/import/fdc/search` retains the existing query and pagination parameters. Each food in the response includes an `alreadyImported` boolean based on whether its USDA ID exists in the catalog. The import table displays “Already imported” and disables selection for those foods. Preview remains available; there is no edit link.

After an import, newly created and skipped foods are marked as already imported in the current results and removed from the selection. Failed items remain selected for retry. Searching again refreshes import status from the catalog.

## Import response

`POST /api/import/fdc/import` accepts `fdc_ids` and the optional boolean `starter_food`. Repeated IDs within a request are deduplicated. Each batch runs in a transaction with a savepoint per new food, allowing other items to succeed if one fails.

A processed batch returns HTTP 200 with these fields:

| Field | Meaning |
| --- | --- |
| `imported_count` | Number of newly imported foods. |
| `created_count` | Same count, retained for compatibility. |
| `updated_count` | Always zero; imports no longer overwrite existing foods. |
| `items` | Newly created foods, with `fdc_id`, `food_id`, `name`, and `action: "created"`. |
| `skipped_count` | Number of USDA records already imported. |
| `skipped` | Entries containing `fdc_id` and `reason: "already_imported"`. |
| `failures` | Per-item failures containing `fdc_id` and `error`. |

Existing foods are checked again during import, so a stale search result cannot overwrite them. The unique database constraint `uq_food_user_source_fdc` also prevents two simultaneous requests from creating the same food. A conflict on this constraint is reported as a skipped item. Foods owned by different users may share a USDA ID; manually created foods may omit source and USDA ID.

Request validation errors return HTTP 400, unauthorized roles receive HTTP 403, and unexpected request-level failures return HTTP 500. These follow the existing import API conventions. The search flag and skip fields are additive response fields; the intentional behavior change is that repeat imports skip rather than update.

## Migration

Apply the new migration with `flask db upgrade` before using the updated importer. If duplicate identities already exist, the migration reports one affected owner/source/USDA ID and stops for manual correction. It does not delete records. The downgrade removes the unique constraint.
