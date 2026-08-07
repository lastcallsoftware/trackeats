import React, { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
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

type ServingView = {
  key: string;
  label: string;
  nutrition: INutrition;
};

// A simple FDA-style Nutrition Facts label for use in FoodsTable/RecipesTable detail panel
export const NutritionLabel: React.FC<{
  nutrition: INutrition | null;
  nutritionAlternatives?: INutritionAlternative[];
  dvDivisor?: number;
  pricePerServing?: number | null;
}> = ({ nutrition, nutritionAlternatives, dvDivisor, pricePerServing }) => {
  const defaultNutrition: INutrition = {
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
  };

  const buildServingViews = (): ServingView[] => {
    const views: ServingView[] = [
      {
        key: "primary",
        label: nutrition?.serving_size_description || "Primary",
        nutrition: nutrition || defaultNutrition,
      },
    ];
    if (nutritionAlternatives) {
      // The backend's nutrition_alternatives list includes the primary
      // serving (marked is_primary). The primary is already the first view
      // above, so skip it here to avoid showing it twice.
      nutritionAlternatives.forEach((alt, i) => {
        if (alt.is_primary) return;
        views.push({
          key: `alt-${i}`,
          label: alt.nutrition?.serving_size_description || `${alt.serving_value} ${alt.serving_unit}`,
          nutrition: alt.nutrition || defaultNutrition,
        });
      });
    }
    return views;
  };

  const servingViews = buildServingViews();
  const [selectedKey, setSelectedKey] = useState("primary");

  // If the selected key no longer exists in the current serving views (e.g.
  // the user switched to a different food that has fewer or no alternatives),
  // fall back to the primary view instead of showing all-zero nutrition.
  const effectiveKey = servingViews.some(v => v.key === selectedKey) ? selectedKey : "primary";
  const n = servingViews.find(v => v.key === effectiveKey)?.nutrition || defaultNutrition;

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
        fontFamily: 'Arial Narrow, Arial, sans-serif',
        userSelect: "none",
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: 1, mb: 1 }}>
        Nutrition Facts
      </Typography>
      <Divider sx={{ borderBottomWidth: 4, mb: 1 }} />

      {/* ── Serving View Switcher ── */}
      {/* The bold "Serving Size:" label always remains. When there are multiple
          serving sizes, a dropdown replaces the value next to the label. */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
          Serving Size:
        </Typography>
        {servingViews.length > 1 ? (
          <FormControl size="small" sx={{ flex: 1, minWidth: 0, height: 32 }}>
            <Select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              sx={{
                height: "100%",
                fontSize: "0.8rem",
                fontWeight: 700,
                "& .MuiSelect-select": { py: 0.5, pl: 1, pr: 2.5, fontWeight: 700, height: "100%", display: "flex", alignItems: "center" },
              }}
            >
              {servingViews.map(v => (
                <MenuItem key={v.key} value={v.key} sx={{ fontSize: "0.8rem", py: 0.5, fontWeight: 700 }}>{v.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, height: 32, display: "flex", alignItems: "center" }}
          >
            {n.serving_size_description}
          </Typography>
        )}
      </Box>
      <Typography variant="caption" sx={{ color: "#555", display: "block", mb: 1 }}>
        {[
          n.serving_size_oz > 0 ? `${formatSignificantDigit(n.serving_size_oz)} oz` : null,
          n.serving_size_g > 0 ? `${Math.round(n.serving_size_g)} g` : null,
          pricePerServing != null && Number.isFinite(pricePerServing) ? `$${pricePerServing.toFixed(2)}` : null,
        ]
          .filter(Boolean)
          .join(", ")}
      </Typography>
      <Divider sx={{ borderBottomWidth: 2, my: 1 }} />
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5 }}>
        {Math.round(n.calories)} <span style={{ fontSize: 18, fontWeight: 400 }}>Calories</span>
      </Typography>
      <Divider sx={{ borderBottomWidth: 2, my: 1 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        % Daily Value*
      </Typography>
      <Box sx={{ ml: 1 }}>
        <LabelRow label="Total Fat" value={n.total_fat_g} unit="g" dv={DAILY_VALUES.total_fat_g} dvDivisor={dvDivisor} />
        <LabelRow label="Saturated Fat" value={n.saturated_fat_g} unit="g" dv={DAILY_VALUES.saturated_fat_g} indent dvDivisor={dvDivisor} />
        <LabelRow label="Trans Fat" value={n.trans_fat_g} unit="g" dv={DAILY_VALUES.trans_fat_g} indent dvDivisor={dvDivisor} />
        <LabelRow label="Cholesterol" value={n.cholesterol_mg} unit="mg" dv={DAILY_VALUES.cholesterol_mg} dvDivisor={dvDivisor} />
        <LabelRow label="Sodium" value={n.sodium_mg} unit="mg" dv={DAILY_VALUES.sodium_mg} dvDivisor={dvDivisor} />
        <LabelRow label="Total Carbohydrate" value={n.total_carbs_g} unit="g" dv={DAILY_VALUES.total_carbs_g} dvDivisor={dvDivisor} />
        <LabelRow label="Dietary Fiber" value={n.fiber_g} unit="g" dv={DAILY_VALUES.fiber_g} indent dvDivisor={dvDivisor} />
        <LabelRow label="Total Sugars" value={n.total_sugar_g} unit="g" dv={DAILY_VALUES.total_sugar_g} indent dvDivisor={dvDivisor} />
        <LabelRow label="Added Sugars" value={n.added_sugar_g} unit="g" dv={DAILY_VALUES.added_sugar_g} indent dvDivisor={dvDivisor} />
        <LabelRow label="Protein" value={n.protein_g} unit="g" dv={DAILY_VALUES.protein_g} dvDivisor={dvDivisor} />
        <LabelRow label="Vitamin D" value={n.vitamin_d_mcg} unit="mcg" dv={DAILY_VALUES.vitamin_d_mcg} dvDivisor={dvDivisor} />
        <LabelRow label="Calcium" value={n.calcium_mg} unit="mg" dv={DAILY_VALUES.calcium_mg} dvDivisor={dvDivisor} />
        <LabelRow label="Iron" value={n.iron_mg} unit="mg" dv={DAILY_VALUES.iron_mg} dvDivisor={dvDivisor} />
        <LabelRow label="Potassium" value={n.potassium_mg} unit="mg" dv={DAILY_VALUES.potassium_mg} dvDivisor={dvDivisor} />
      </Box>
      <Divider sx={{ borderBottomWidth: 2, my: 1 }} />
      <Typography variant="caption" sx={{ color: "#555" }}>
        *Percent Daily Values are based on a 2,000 calorie diet.
      </Typography>
    </Box>
  );
};

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

const LabelRow: React.FC<LabelRowProps> = ({ label, value, unit, dv, indent, dvDivisor }) => {
  // Compute %DV if dv is a positive number and not null/undefined/0
  let percent: string | null = null;
  const divisor = dvDivisor && dvDivisor > 0 ? dvDivisor : 1;
  if (dv && dv > 0) {
    percent = Math.round((value / (dv * divisor)) * 100) + "%";
  }
  const displayValue = formatNutrientValue(value);
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", pl: indent ? 2 : 0, fontSize: 15, fontWeight: indent ? 400 : 700, mb: 0.2 }}>
      <span>
        <span style={{ fontWeight: "inherit" }}>{label} </span>
        <span style={{ fontWeight: 400 }}>{displayValue}{unit}</span>
      </span>
      <span style={{ fontWeight: 700, minWidth: 36, textAlign: "right" }}>{percent ?? ""}</span>
    </Box>
  );
};


