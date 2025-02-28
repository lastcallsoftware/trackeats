import { Column } from "@tanstack/react-table";

interface FilterWidgetProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    column: Column<any, unknown>;
    updateFilterFunction: (id: string, value: string) => void;
}

const FilterWidget: React.FC<FilterWidgetProps> = ({column, updateFilterFunction}) => {
    return (
        <section className="clearable-input">
            <input 
                className="clearable-input"
                type="text"
                style={{width: column.getSize() - 6}}
                placeholder="Filter..."
                value={column.getFilterValue()?.toString() || ""}
                onChange={e => updateFilterFunction(column.id, e.target.value)} />

            {column.getFilterValue() ? (
                <button 
                    className="clearable-input-button"
                    onClick={() => updateFilterFunction(column.id, "")}>❌</button>
            )  : ""}
        </section>
    )
}

export default FilterWidget;
