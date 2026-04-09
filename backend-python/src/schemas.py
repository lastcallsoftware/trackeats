"""
Request/response schemas using Pydantic for input validation.

These schemas provide:
- Type validation (strings, integers, floats, dates)
- Required vs optional field checks
- Custom validation logic (e.g., enum validation, email validation)
- Clear error messages on validation failures

Each schema is used to validate request.json before passing to the model layer.
"""

from datetime import datetime
from typing import Any, TypeVar
from pydantic import BaseModel, field_validator, model_validator, EmailStr, Field


SchemaModel = TypeVar("SchemaModel", bound=BaseModel)


##############################
# REGISTRATION & LOGIN
##############################
class RegistrationRequest(BaseModel):
    """Validate a new user registration request."""
    username: str
    password: str
    email: EmailStr
    seed_requested: bool = False

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not v or len(v.strip()) == 0:
            raise ValueError("username cannot be empty")
        if len(v) > 100:
            raise ValueError("username must be 100 characters or fewer")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not v or len(v.strip()) == 0:
            raise ValueError("password cannot be empty")
        if len(v) < 8:
            raise ValueError("password must be at least 8 characters")
        return v


class ResendConfirmationRequest(BaseModel):
    """Validate a resend confirmation email request."""
    token: str


class LoginRequest(BaseModel):
    """Validate a login request."""
    username: str
    password: str


##############################
# NUTRITION
##############################
class NutritionRequest(BaseModel):
    """Validated nutrition payload used by ORM model constructors and updates."""
    serving_size_description: str
    serving_size_oz: float | None = 0
    serving_size_g: int | None = 0
    calories: int = 0
    total_fat_g: float | None = 0
    saturated_fat_g: float | None = 0
    trans_fat_g: float | None = 0
    cholesterol_mg: int | None = 0
    sodium_mg: int | None = 0
    total_carbs_g: int | None = 0
    fiber_g: int | None = 0
    total_sugar_g: int | None = 0
    added_sugar_g: int | None = 0
    protein_g: int | None = 0
    vitamin_d_mcg: int | None = 0
    calcium_mg: int | None = 0
    iron_mg: float | None = 0
    potassium_mg: int | None = 0


##############################
# FOOD
##############################
class FoodRequest(BaseModel):
    """Validate a food creation or update request."""
    id: int | None = None  # None for POST, set for PUT
    group: str
    name: str
    vendor: str
    servings: float
    subtype: str | None = None
    description: str | None = None
    size_description: str | None = None
    size_description_2: str | None = None
    size_oz: float | None = None
    size_g: int | None = None
    price: float | None = None
    price_date: str | None = None
    shelf_life: str | None = None
    nutrition: NutritionRequest

    @field_validator("group")
    @classmethod
    def validate_group(cls, v: str) -> str:
        valid_groups = {
            "beverages", "condiments", "dairy", "fatsAndSugars",
            "fruits", "grains", "herbsAndSpices", "nutsAndSeeds",
            "preparedFoods", "proteins", "vegetables", "other"
        }
        if v not in valid_groups:
            raise ValueError(f"Invalid food group: {v}. Must be one of {valid_groups}")
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or len(v.strip()) == 0:
            raise ValueError("name cannot be empty")
        if len(v) > 50:
            raise ValueError("name must be 50 characters or fewer")
        return v

    @field_validator("vendor")
    @classmethod
    def validate_vendor(cls, v: str) -> str:
        if not v or len(v.strip()) == 0:
            raise ValueError("vendor cannot be empty")
        if len(v) > 50:
            raise ValueError("vendor must be 50 characters or fewer")
        return v

    @field_validator("servings")
    @classmethod
    def validate_servings(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("servings must be greater than 0")
        return v

    @field_validator("price_date")
    @classmethod
    def validate_price_date(cls, v: str | None) -> str | None:
        if v and v.strip():
            # Try to parse to ensure it's valid ISO format
            try:
                datetime.strptime(v.strip(), "%Y-%m-%d")
            except ValueError:
                raise ValueError("price_date must be in YYYY-MM-DD format")
        return v


class IngredientRequest(BaseModel):
    """Validate an ingredient within a recipe."""
    id: int | None = None
    recipe_id: int | None = None
    food_ingredient_id: int | None = None
    recipe_ingredient_id: int | None = None
    ordinal: int | None = None
    servings: float
    summary: str | None = None

    @field_validator("ordinal")
    @classmethod
    def validate_ordinal(cls, v: int | None) -> int | None:
        if v is not None and v < 0:
            raise ValueError("ordinal must be non-negative")
        return v

    @field_validator("servings")
    @classmethod
    def validate_servings(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("servings must be greater than 0")
        return v


def _empty_ingredient_requests() -> list[IngredientRequest]:
    return []


##############################
# RECIPE
##############################
class RecipeRequest(BaseModel):
    """Validate a recipe creation or update request."""
    id: int | None = None  # None for POST, set for PUT
    cuisine: str | None = None
    name: str
    total_yield: str
    servings: float
    nutrition: NutritionRequest
    price: float | None = None
    # Ingredients (passed through to model layer as typed objects)
    ingredients: list[IngredientRequest] = Field(default_factory=_empty_ingredient_requests)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or len(v.strip()) == 0:
            raise ValueError("name cannot be empty")
        if len(v) > 50:
            raise ValueError("name must be 50 characters or fewer")
        return v

    @field_validator("total_yield")
    @classmethod
    def validate_total_yield(cls, v: str) -> str:
        if not v or len(v.strip()) == 0:
            raise ValueError("total_yield cannot be empty")
        if len(v) > 50:
            raise ValueError("total_yield must be 50 characters or fewer")
        return v

    @field_validator("servings")
    @classmethod
    def validate_servings(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("servings must be greater than 0")
        return v


##############################
# DAILY LOG ITEM
##############################
class DailyLogItemRequest(BaseModel):
    """Validate a daily log item request."""
    date: str  # YYYY-MM-DD format
    recipe_id: int | None = None
    food_id: int | None = None
    servings: float
    notes: str | None = None

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("date must be in YYYY-MM-DD format")
        return v

    @field_validator("recipe_id")
    @classmethod
    def validate_recipe_id(cls, v: int | None) -> int | None:
        if v is None:
            return v
        if v <= 0:
            raise ValueError("recipe_id must be greater than 0")
        return v

    @field_validator("food_id")
    @classmethod
    def validate_food_id(cls, v: int | None) -> int | None:
        if v is None:
            return v
        if v <= 0:
            raise ValueError("food_id must be greater than 0")
        return v

    @field_validator("servings")
    @classmethod
    def validate_servings(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("servings must be greater than 0")
        return v

    @model_validator(mode="after")
    def validate_exactly_one_source(self) -> "DailyLogItemRequest":
        if self.recipe_id is not None and self.food_id is not None:
            raise ValueError("Exactly one of recipe_id or food_id must be provided, not both")
        if self.recipe_id is None and self.food_id is None:
            raise ValueError("Exactly one of recipe_id or food_id must be provided")
        return self


class DailyLogItemUpdateRequest(BaseModel):
    """Validate a daily log item update request."""
    recipe_id: int | None = None
    food_id: int | None = None
    servings: float
    date: str | None = None
    notes: str | None = None

    @field_validator("recipe_id")
    @classmethod
    def validate_recipe_id(cls, v: int | None) -> int | None:
        if v is None:
            return v
        if v <= 0:
            raise ValueError("recipe_id must be greater than 0")
        return v

    @field_validator("food_id")
    @classmethod
    def validate_food_id(cls, v: int | None) -> int | None:
        if v is None:
            return v
        if v <= 0:
            raise ValueError("food_id must be greater than 0")
        return v

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("date must be in YYYY-MM-DD format")
        return v

    @field_validator("servings")
    @classmethod
    def validate_servings(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("servings must be greater than 0")
        return v

    @model_validator(mode="after")
    def validate_at_most_one_source(self) -> "DailyLogItemUpdateRequest":
        if self.recipe_id is not None and self.food_id is not None:
            raise ValueError("recipe_id and food_id cannot both be provided")
        return self


##############################
# PREFERENCES
##############################
class PreferencesRequest(BaseModel):
    """
    Preferences is just a JSON blob, so we accept any dict.
    Pydantic will validate it's proper JSON, but we don't enforce structure.
    """
    model_config = {"extra": "allow"}  # Allow extra fields (everything is part of preferences)


##############################
# HELPERS
##############################
def parse_request_json(model_class: type[SchemaModel], json_data: dict[str, Any]) -> SchemaModel:
    """
    Parse and validate a request JSON object using the given Pydantic model.
    
    Raises ValidationError if validation fails.
    """
    return model_class.model_validate(json_data)
