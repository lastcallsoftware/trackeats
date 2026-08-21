import math
from decimal import Decimal

import pytest
from pydantic import ValidationError
from schemas import NutritionRequest


def _make(calories: object) -> NutritionRequest:
    return NutritionRequest(serving_size_description="1 serving", calories=calories)  # type: ignore[arg-type]


class TestNormalizeDecimal:
    def test_rounds_half_up(self) -> None:
        # 1.005 -> Decimal("1.005"), quantized to 2 places with ROUND_HALF_UP -> 1.01
        assert _make(1.005).calories == Decimal("1.01")

    def test_rounds_half_up_negative_boundary(self) -> None:
        assert _make("2.125").calories == Decimal("2.13")

    def test_accepts_int(self) -> None:
        assert _make(5).calories == Decimal("5.00")

    def test_accepts_string_decimal(self) -> None:
        assert _make("123.4").calories == Decimal("123.40")

    def test_none_is_allowed_for_optional_fields(self) -> None:
        req = NutritionRequest(serving_size_description="1 serving", calories=0, total_fat_g=None)
        assert req.total_fat_g is None

    def test_max_precision_boundary_is_accepted(self) -> None:
        assert _make("99999.99").calories == Decimal("99999.99")

    def test_min_precision_boundary_is_accepted(self) -> None:
        assert _make("-99999.99").calories == Decimal("-99999.99")

    def test_overflow_beyond_decimal_7_2_is_rejected(self) -> None:
        with pytest.raises(ValidationError, match="value must fit DECIMAL"):
            _make("100000.00")

    def test_negative_overflow_beyond_decimal_7_2_is_rejected(self) -> None:
        with pytest.raises(ValidationError, match="value must fit DECIMAL"):
            _make("-100000.00")

    def test_nan_is_rejected(self) -> None:
        with pytest.raises(ValidationError, match="value must be a valid finite number"):
            _make(math.nan)

    def test_infinity_is_rejected(self) -> None:
        with pytest.raises(ValidationError, match="value must be a valid finite number"):
            _make(math.inf)

    def test_negative_infinity_is_rejected(self) -> None:
        with pytest.raises(ValidationError, match="value must be a valid finite number"):
            _make(-math.inf)

    def test_non_numeric_string_is_rejected(self) -> None:
        with pytest.raises(ValidationError, match="value must be a valid finite number"):
            _make("not-a-number")
