import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { INutrition } from "@/contexts/DataProvider";
import { DAILY_VALUES } from "../utils/dailyValues";

// A simple FDA-style Nutrition Facts label for use in FoodsTable/RecipesTable detail panel
export const NutritionLabel: React.FC<{ nutrition: INutrition | null }> = ({ nutrition }) => {
  if (!nutrition) return null;

  return (
    <Box
      sx={{
        width: 280,
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
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Serving Size: {nutrition.serving_size_description}
      </Typography>
      <Divider sx={{ borderBottomWidth: 2, my: 1 }} />
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5 }}>
        {Math.round(nutrition.calories)} <span style={{ fontSize: 18, fontWeight: 400 }}>Calories</span>
      </Typography>
      <Divider sx={{ borderBottomWidth: 2, my: 1 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        % Daily Value*
      </Typography>
      <Box sx={{ ml: 1 }}>
        <LabelRow label="Total Fat" value={nutrition.total_fat_g} unit="g" dv={DAILY_VALUES.total_fat_g} />
        <LabelRow label="Saturated Fat" value={nutrition.saturated_fat_g} unit="g" dv={DAILY_VALUES.saturated_fat_g} indent />
        <LabelRow label="Trans Fat" value={nutrition.trans_fat_g} unit="g" dv={DAILY_VALUES.trans_fat_g} indent />
        <LabelRow label="Cholesterol" value={nutrition.cholesterol_mg} unit="mg" dv={DAILY_VALUES.cholesterol_mg} />
        <LabelRow label="Sodium" value={nutrition.sodium_mg} unit="mg" dv={DAILY_VALUES.sodium_mg} />
        <LabelRow label="Total Carbohydrate" value={nutrition.total_carbs_g} unit="g" dv={DAILY_VALUES.total_carbs_g} />
        <LabelRow label="Dietary Fiber" value={nutrition.fiber_g} unit="g" dv={DAILY_VALUES.fiber_g} indent />
        <LabelRow label="Total Sugars" value={nutrition.total_sugar_g} unit="g" dv={DAILY_VALUES.total_sugar_g} indent />
        <LabelRow label="Added Sugars" value={nutrition.added_sugar_g} unit="g" dv={DAILY_VALUES.added_sugar_g} indent />
        <LabelRow label="Protein" value={nutrition.protein_g} unit="g" dv={DAILY_VALUES.protein_g} />
        <LabelRow label="Vitamin D" value={nutrition.vitamin_d_mcg} unit="mcg" dv={DAILY_VALUES.vitamin_d_mcg} />
        <LabelRow label="Calcium" value={nutrition.calcium_mg} unit="mg" dv={DAILY_VALUES.calcium_mg} />
        <LabelRow label="Iron" value={nutrition.iron_mg} unit="mg" dv={DAILY_VALUES.iron_mg} />
        <LabelRow label="Potassium" value={nutrition.potassium_mg} unit="mg" dv={DAILY_VALUES.potassium_mg} />
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
};

const LabelRow: React.FC<LabelRowProps> = ({ label, value, unit, dv, indent }) => {
  // Compute %DV if dv is a positive number and not null/undefined/0
  let percent: string | null = null;
  if (dv && dv > 0) {
    percent = Math.round((value / dv) * 100) + "%";
  }
  const rounded = Math.round(value);
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", pl: indent ? 2 : 0, fontSize: 15, fontWeight: indent ? 400 : 700, mb: 0.2 }}>
      <span>
        <span style={{ fontWeight: "inherit" }}>{label} </span>
        <span style={{ fontWeight: 400 }}>{rounded}{unit}</span>
      </span>
      <span style={{ fontWeight: 700, minWidth: 36, textAlign: "right" }}>{percent ?? ""}</span>
    </Box>
  );
};

export default NutritionLabel;
