// Shared color constants for all data tables
// To switch schemes, swap which block is assigned to the active constants below.

// Scheme A — soft blue (original IngredientsTable style)
const SCHEME_A_HEADER_BG = '#66C2E0';
const SCHEME_A_HEADER_COLOR = '#000';
const SCHEME_A_HEADER_BORDER = 'black';
const SCHEME_A_ROW_SELECTED_BG = 'lightblue';
const SCHEME_A_ROW_BORDER = 'black';

// Scheme B — vivid blue (MUI-styled)
// const SCHEME_B_HEADER_BG = '#42a5f5';
// const SCHEME_B_HEADER_COLOR = '#fff';
// const SCHEME_B_HEADER_BORDER = '#1976d2';
// const SCHEME_B_ROW_SELECTED_BG = '#e3f2fd';
// const SCHEME_B_ROW_BORDER = '#eee';

// Active scheme — change SCHEME_A_ to SCHEME_B_ (or vice versa) on all lines to switch
export const TABLE_HEADER_BG = SCHEME_A_HEADER_BG;
export const TABLE_HEADER_COLOR = SCHEME_A_HEADER_COLOR;
export const TABLE_HEADER_BORDER = SCHEME_A_HEADER_BORDER;
export const TABLE_ROW_SELECTED_BG = SCHEME_A_ROW_SELECTED_BG;
export const TABLE_ROW_BORDER = SCHEME_A_ROW_BORDER;
