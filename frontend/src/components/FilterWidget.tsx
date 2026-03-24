import { Column } from "@tanstack/react-table";

interface FilterWidgetProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    column: Column<any, unknown>;
    updateFilterFunction: (id: string, value: string) => void;
}

import Box from '@mui/material/Box';

const FilterWidget: React.FC<FilterWidgetProps> = ({column, updateFilterFunction}) => {
    return (
        <Box sx={{ position: 'relative', width: '100%' }}>
            <input
                type="text"
                style={{ width: '100%', boxSizing: 'border-box', paddingRight: column.getFilterValue() ? 28 : 8, borderRadius: 4, border: '1px solid #ccc', fontSize: 14, height: 28 }}
                placeholder="Filter..."
                value={column.getFilterValue()?.toString() || ""}
                onChange={e => updateFilterFunction(column.id, e.target.value)}
            />
            {column.getFilterValue() ? (
                <button
                    onClick={() => updateFilterFunction(column.id, "")}
                    style={{ position: 'absolute', right: 2, top: 2, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}
                    aria-label="Clear filter"
                >
                    ❌
                </button>
            ) : null}
        </Box>
    );
}

export default FilterWidget;
