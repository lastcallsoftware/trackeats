# TrackEats entity relationship diagram

This diagram describes the eight application tables in the current SQLAlchemy model, including the `food_serving` rename. It does not inspect a running database or include Alembic’s migration-version table.

Each table lists all persisted columns. `PK` means primary key, `FK` means foreign key, and `UK` means a single-column unique constraint. Columns marked `nullable` can contain SQL `NULL`; other columns cannot. Database nullability does not determine whether an API field may be omitted: defaults and request validation also apply.

Relationship labels identify the foreign-key column on the child table. Each parent can have zero or many children. A circle at the parent end means the child’s foreign key is nullable; a double bar means it is required. Dotted lines indicate that the foreign key is not part of the child’s primary key.

```mermaid
erDiagram
    direction LR

    user {
        int id PK
        varchar username "nullable; max 100 characters"
        enum status
        blob encrypted_email_addr "nullable"
        varchar email_addr_hash UK "nullable; max 64 characters"
        datetime created_at
        varchar password_hash "nullable; max 64 characters"
        datetime confirmation_email_sent_at "nullable"
        varchar confirmation_token "nullable; max 64 characters"
        datetime reset_email_sent_at "nullable"
        varchar reset_token "nullable; max 64 characters"
        boolean seed_requested
        int seed_version "nullable"
        datetime seeded_at "nullable"
        varchar oauth_provider "nullable; max 20 characters"
        varchar oauth_id "nullable; max 128 characters"
    }

    preferences {
        int id PK
        int user_id FK
        varchar context "max 50 characters"
        json preferences
    }

    food {
        int id PK
        int user_id FK
        enum group
        varchar name "max 50 characters"
        varchar subtype "nullable; max 50 characters"
        varchar description "nullable; max 100 characters"
        varchar vendor "max 50 characters"
        varchar size_description "nullable; max 50 characters"
        varchar size_description_2 "nullable; max 50 characters"
        float size_imperial "nullable"
        int size_metric "nullable"
        enum unit_type
        float density "nullable"
        float servings
        float price "nullable"
        date price_date "nullable"
        varchar shelf_life "nullable; max 150 characters"
        varchar source "nullable; max 20 characters"
        int fdc_id "nullable"
        varchar fdc_data_type "nullable; max 30 characters"
        boolean starter_food
        datetime last_synced_at "nullable"
    }

    food_serving {
        int id PK
        int food_id FK
        int nutrition_id FK
        float serving_value
        varchar serving_unit "max 50 characters"
        enum serving_unit_kind
        int ordinal
        boolean is_primary
    }

    nutrition {
        int id PK
        int user_id FK
        varchar serving_size_description "max 50 characters"
        decimal serving_size_metric "nullable; precision 7, scale 2"
        decimal serving_size_imperial "nullable; precision 7, scale 2"
        decimal calories "precision 7, scale 2"
        decimal total_fat_g "nullable; precision 7, scale 2"
        decimal saturated_fat_g "nullable; precision 7, scale 2"
        decimal trans_fat_g "nullable; precision 7, scale 2"
        decimal cholesterol_mg "nullable; precision 7, scale 2"
        decimal sodium_mg "nullable; precision 7, scale 2"
        decimal total_carbs_g "nullable; precision 7, scale 2"
        decimal fiber_g "nullable; precision 7, scale 2"
        decimal total_sugar_g "nullable; precision 7, scale 2"
        decimal added_sugar_g "nullable; precision 7, scale 2"
        decimal protein_g "nullable; precision 7, scale 2"
        decimal vitamin_d_mcg "nullable; precision 7, scale 2"
        decimal calcium_mg "nullable; precision 7, scale 2"
        decimal iron_mg "nullable; precision 7, scale 2"
        decimal potassium_mg "nullable; precision 7, scale 2"
    }

    recipe {
        int id PK
        int user_id FK "nullable"
        varchar cuisine "nullable; max 20 characters"
        varchar name "max 50 characters"
        varchar total_yield "max 50 characters"
        float size_oz "nullable"
        int size_g "nullable"
        float servings
        int nutrition_id FK "nullable"
        float price "nullable"
        int parent_recipe_id FK "nullable"
    }

    ingredient {
        int id PK
        int user_id FK
        int recipe_id FK "nullable"
        int food_ingredient_id FK "nullable"
        int recipe_ingredient_id FK "nullable"
        int ordinal
        float servings
        varchar summary "nullable; max 100 characters"
    }

    daily_log_item {
        int id PK
        int user_id FK
        date date
        int recipe_id FK "nullable"
        int food_id FK "nullable"
        float servings
        int ordinal
        varchar notes "nullable; max 200 characters"
        int nutrition_id FK "nullable"
        float price "nullable"
    }

    user ||..o{ preferences : "user_id"
    user ||..o{ food : "user_id"
    food ||..o{ food_serving : "food_id"
    nutrition ||..o{ food_serving : "nutrition_id"
    user ||..o{ nutrition : "user_id"
    user |o..o{ recipe : "user_id"
    nutrition |o..o{ recipe : "nutrition_id"
    recipe |o..o{ recipe : "parent_recipe_id"
    user ||..o{ ingredient : "user_id"
    recipe |o..o{ ingredient : "recipe_id"
    food |o..o{ ingredient : "food_ingredient_id"
    recipe |o..o{ ingredient : "recipe_ingredient_id"
    user ||..o{ daily_log_item : "user_id"
    recipe |o..o{ daily_log_item : "recipe_id"
    food |o..o{ daily_log_item : "food_id"
    nutrition |o..o{ daily_log_item : "nutrition_id"
```

## How the tables fit together

- **Ownership:** `user` owns food, nutrition, preferences, ingredients, and daily log entries. Recipe ownership is nullable in the database.
- **Food servings:** `food` contains identity, classification, package measurements, and price. Each `food_serving` belongs to one food and links to one nutrition record. The primary serving supplies the food’s default nutrition; other rows describe additional serving options. The application expects exactly one primary serving per food; the current database model does not enforce that rule with a unique constraint.
- **Import identity:** each `(user_id, source, fdc_id)` combination is unique when source and USDA ID are present. This prevents duplicate imports for an owner while allowing separate users to hold copies and manual foods to omit import identity.
- **Nutrition:** `nutrition` holds serving measurements, calories, and nutrients. Its foreign keys from servings, recipes, and daily log entries are not unique, so the database permits multiple records to reference the same nutrition row. Separate nutrition rows for food servings are an application convention.
- **Recipes:** `recipe.nutrition_id` links directly to stored nutrition totals for the whole recipe, calculated from its ingredients. `parent_recipe_id` optionally links a variation to its original recipe.
- **Ingredients:** `ingredient.recipe_id` identifies the containing recipe. An ingredient refers to either a food through `food_ingredient_id` or a nested recipe through `recipe_ingredient_id`, with `servings` recording the quantity. The application requires a containing recipe and exactly one ingredient target; the database columns are nullable and have no exclusive-or constraint. Food ingredients use the food’s primary serving rather than referencing a `food_serving` directly.
- **Daily log:** `daily_log_item` records a date, quantity, ordering, notes, and price. It can reference a food or recipe, and its direct nutrition link stores a snapshot of the selected serving’s nutrition. It has no foreign key to `food_serving`.
- **Preferences:** each `(user_id, context)` pair is unique, allowing one JSON preferences record per user and context.

## Naming and scope

`food_serving` was previously named `nutrition_alternative`. Databases must apply the rename migration to match this diagram. The existing API field and ORM collection are still called `nutrition_alternatives` for compatibility.

Food groups, unit kinds, and user statuses are enum columns rather than separate tables. This diagram shows foreign-key structure, not cascade/deletion behavior or every application validation rule.
