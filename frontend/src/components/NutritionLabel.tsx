import React, { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import { INutrition, INutritionAlternative } from "@/contexts/DataProvider";
import { DAILY_VALUES } from "../utils/dailyValues";

// Format a value to two significant digits
const formatSignificantDigit = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }
  return new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: 2,
    minimumSignificantDigits: 2,
  }).format(value);
};

// Build a human-readable serving-size label from an alternative's metadata
const alternativeLabel = (alt: INutritionAlternative): string => {
  const parts: string[] = [];
  if (alt.serving_value) {
    const v = formatSignificantDigit(alt.serving_value);
    if (v) parts.push(v);
  }
  if (alt.serving_unit) {
    parts.push(alt.serving_unit);
  }
  return parts.length > 0 ? parts.join(" ") : "Alt";
};

type NutritionLabelProps = {
  nutrition: INutrition | null;
  dvDivisor?: number;
  pricePerServing?: number | null;
  nutritionAlternatives?: INutritionAlternative[];
};

const emptyNutrition: INutrition = {
  serving_size_description: "-",
  serving_size_oz: 0,
  serving_size_g: 0,
  calories: 0,
  total_fat_g: 0,
  saturated_fat_g: 0,
  trans_fat_g: 0,
  cholesterol_mg: 0,
  sodium_mg: 0,
  total_carbs_g: 0,
  fiber_g: 0,
  total_sugar_g: 0,
  added_sugar_g: 0,
  protein_g: 0,
  vitamin_d_mcg: 0,
  calcium_mg: 0,
  iron_mg: 0,
  potassium_mg: 0,
  serving_value: null,
  serving_unit: null,
  serving_unit_kind: null,
};

// A simple FDA-style Nutrition Facts label for use in FoodsTable/RecipesTable detail panel
export const NutritionLabel: React.FC<NutritionLabelProps> = ({
  nutrition,
  dvDivisor,
  pricePerServing,
  nutritionAlternatives,
}) => {
  // -1 = primary serving, 0+ = alternative index
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const hasAlternatives =
    nutritionAlternatives && nutritionAlternatives.length > 0;

  // Determine which nutrition data to render
  const activeNutrition: INutrition =
    selectedIndex >= 0 && hasAlternatives
      ? nutritionAlternatives![selectedIndex].nutrition
      : (nutrition || emptyNutrition);

  // Build the serving view switcher buttons
  const primaryLabel = nutrition
    ? formatServingLabel(nutrition)
    : "Primary";

  return (
    <Box
      sx={{
        width: 280,
        boxSizing: "border-box",
        bgcolor: "#fff",
        color: "#222",
        border: "2px solid #222",
        borderRadius: 2,
        p: 2,
        boxShadow: 2,
        fontFamily: "Arial Narrow, Arial, sans-serif",
        userSelect: "none",
      }}
    >
      <Typography
        variant="h5"
        sx={{ fontWeight: 900, letterSpacing: 1, mb: 1 }}
      >
        Nutrition Facts
      </Typography>

      {/* Serving view switcher */}
      {hasAlternatives && (
        <ToggleButtonGroup
          value={selectedIndex}
          exclusive
          onChange={(_e, newVal) => {
            if (newVal !== null) setSelectedIndex(newVal);
          }}
          size="small"
          sx={{ mb: 1, flexWrap: "wrap" }}
        >
          <ToggleButton value={-1} sx={{ fontSize: 11, py: 0.25 }}>
            {primaryLabel}
          </ToggleButton>
          {nutritionAlternatives!.map((alt, idx) => (
            <ToggleButton
              key={alt.id || idx}
              value={idx}
              sx={{ fontSize: 11, py: 0.25 }}
            >
              {alternativeLabel(alt)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}

      <Divider sx={{ borderBottomWidth: 4, mb: 1 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Serving Size: {activeNutrition.serving_size_description}
      </Typography>

      {/* Structured serving fields */}
      <Typography
        variant="caption"
        sx={{ color: "#555", display: "block", mb: 1 }}
      >
        {[
          formatServingLabel(activeNutrition),
          pricePerServing != null && Number.isFinite(pricePerServing)
            ? `$${pricePerServing.toFixed(2)}`
            : null,
        ]
          .filter(Boolean)
          .join(", ")}
      </Typography>

      <Divider sx={{ borderBottomWidth: 2, my: 1 }} />
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5 }}>
        {Math.round(activeNutrition.calories)}{" "}
        <span style={{ fontSize: 18, fontWeight: 400 }}>Calories</span>
      </Typography>
      <Divider sx={{ borderBottomWidth: 2, my: 1 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        % Daily Value*
      </Typography>
      <Box sx={{ ml: 1 }}>
        <LabelRow
          label="Total Fat"
          value={activeNutrition.total_fat_g}
          unit="g"
          dv={DAILY_VALUES.total_fat_g}
          dvDivisor={dvDivisor}
        />
        <LabelRow
          label="Saturated Fat"
          value={activeNutrition.saturated_fat_g}
          unit="g"
          dv={DAILY_VALUES.saturated_fat_g}
          indent
          dvDivisor={dvDivisor}
        />
        <LabelRow
          label="Trans Fat"
          value={activeNutrition.trans_fat_g}
          unit="g"
          dv={DAILY_VALUES.trans_fat_g}
          indent
          dvDivisor={dvDivisor}
        />
        <LabelRow
          label="Cholesterol"
          value={activeNutrition.cholesterol_mg}
          unit="mg"
          dv={DAILY_VALUES.cholesterol_mg}
          dvDivisor={dvDivisor}
        />
        <LabelRow
          label="Sodium"
          value={activeNutrition.sodium_mg}
          unit="mg"
          dv={DAILY_VALUES.sodium_mg}
          dvDivisor={dvDivisor}
        />
        <LabelRow
          label="Total Carbohydrate"
          value={activeNutrition.total_carbs_g}
          unit="g"
          dv={DAILY_VALUES.total_carbs_g}
          dvDivisor={dvDivisor}
        />
        <LabelRow
          label="Dietary Fiber"
          value={activeNutrition.fiber_g}
          unit="g"
          dv={DAILY_VALUES.fiber_g}
          indent
          dvDivisor={dvDivisor}
        />
        <LabelRow
          label="Total Sugars"
          value={activeNutrition.total_sugar_g}
          unit="g"
          dv={DAILY_VALUES.total_sugar_g}
          indent
          dvDivisor={dvDivisor}
        />
        <LabelRow
          label="Added Sugars"
          value={activeNutrition.added_sugar_g}
          unit="g"
          dv={DAILY_VALUES.added_sugar_g}
          indent
          dvDivisor={dvDivisor}
        />
        <LabelRow
          label="Protein"
          value={activeNutrition.protein_g}
          unit="g"
          dv={DAILY_VALUES.protein_g}
          dvDivisor={dvDivisor}
        />
        <LabelRow
          label="Vitamin D"
          value={activeNutrition.vitamin_d_mcg}
          unit="mcg"
          dv={DAILY_VALUES.vitamin_d_mcg}
          dvDivisor={dvDivisor}
        />
        <LabelRow
          label="Calcium"
          value={activeNutrition.calcium_mg}
          unit="mg"
          dv={DAILY_VALUES.calcium_mg}
          dvDivisor={dvDivisor}
        />
        <LabelRow
          label="Iron"
          value={activeNutrition.iron_mg}
          unit="mg"
          dv={DAILY_VALUES.iron_mg}
          dvDivisor={dvDivisor}
        />
        <LabelRow
          label="Potassium"
          value={activeNutrition.potassium_mg}
          unit="mg"
          dv={DAILY_VALUES.potassium_mg}
          dvDivisor={dvDivisor}
        />
      </Box>
      <Divider sx={{ borderBottomWidth: 2, my: 1 }} />
      <Typography variant="caption" sx={{ color: "#555" }}>
        *Percent Daily Values are based on a 2,000 calorie diet.
      </Typography>
    </Box>
  );
};

function formatServingLabel(n: INutrition): string | null {
  // Prefer structured serving fields when available; fall back to legacy oz/g
  if (n.serving_value != null && n.serving_unit) {
    return `${formatSignificantDigit(n.serving_value)} ${n.serving_unit}`;
  }
  return [
    n.serving_size_oz > 0
      ? `${formatSignificantDigit(n.serving_size_oz)} oz`
      : null,
    n.serving_size_g > 0 ? `${Math.round(n.serving_size_g)} g` : null,
  ]
    .filter(Boolean)
    .join(", ") || null;
}

type LabelRowProps = {
  label: string;
  value: number;
  unit: string;
  dv?: number | null;
  indent?: boolean;
  dvDivisor?: number;
};

function formatNutrientValue(value: number): string {
  if (value >= 10) return String(Math.round(value));
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

const LabelRow: React.FC<LabelRowProps> = ({
  label,
  value,
  unit,
  dv,
  indent,
  dvDivisor,
}) => {
  // Compute %DV if dv is a positive number and not null/undefined/0
  let percent: string | null = null;
  const divisor = dvDivisor && dvDivisor > 0 ? dvDivisor : 1;
  if (dv && dv > 0) {
    percent = Math.round((value / (dv * divisor)) * 100) + "%";
  }
  const displayValue = formatNutrientValue(value);
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        pl: indent ? 2 : 0,
        fontSize: 15,
        fontWeight: indent ? 400 : 700,
        mb: 0.2,
      }}
    >
      <span>
        <span style={{ fontWeight: "inherit" }}>{label} </span>
        <span style={{ fontWeight: 400 }}>
          {displayValue}
          {unit}
        </span>
      </span>
      <span style={{ fontWeight: 700, minWidth: 36, textAlign: "right" }}>
        {percent ?? ""}
      </span>
    </Box>
  );
};