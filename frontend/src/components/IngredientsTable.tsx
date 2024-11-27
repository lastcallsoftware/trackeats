import { Column, ColumnFiltersState, createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, Row, RowData, SortingState, TableOptions, useReactTable } from '@tanstack/react-table';
import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { IIngredient, IngredientContext } from "./IngredientProvider";


// Define a filterVariant property, which will be used in the table column
// definitions to choose what kind of filter input each column gets.
// The default type is "none". 
// The "text" type is just a standard text filter for text columns.
// The "range" type allows you to specify a min and max value for numeric columns.
// The "select" type is for columns with dropdown lists (of which there is just one, 
// the food group column).
declare module '@tanstack/react-table' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData extends RowData, TValue> {
      filterVariant?: 'text' | 'range' | 'select'
    }
}


// Define the table
const columnHelper = createColumnHelper<IIngredient>()
const columns = [
    columnHelper.accessor("id", {
        header: "ID",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("group", {
        header: "Group",
        cell: info => String(info.getValue()).charAt(0).toUpperCase() + String(info.getValue()).slice(1),
        size: 75
    }),
    columnHelper.accessor("type", {
        header: "Type",
        cell: info => info.getValue(),
        size: 150,
        meta: { filterVariant: "text" }
    }),
    columnHelper.accessor("subtype", {
        header: "Subtype",
        cell: info => info.getValue(),
        size: 150
    }),
    columnHelper.accessor("description", {
        header: "Description",
        cell: info => info.getValue(),
        size: 150
    }),
    columnHelper.accessor("vendor", {
        header: "Vendor",
        cell: info => info.getValue(),
        size: 100
    }),
    columnHelper.accessor("size_description", {
        header: "Size",
        cell: info => info.getValue(),
        size: 100
    }),
    columnHelper.accessor("size_g", {
        header: "Size (g or ml)",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("servings", {
        header: "Servings",
        cell: info => info.getValue(),
        size: 60
    }),
    columnHelper.accessor("nutrition.serving_size_description", {
        header: "Serving Size",
        cell: info => info.getValue(),
        size: 100
    }),
    columnHelper.accessor("nutrition.serving_size_g", {
        header: "Serving Size (g or ml)",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("nutrition.calories", {
        header: "Calories",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("nutrition.total_fat_g", {
        header: "Total Fat (g)",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("nutrition.saturated_fat_g", {
        header: "Satu- rated Fat (g)",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("nutrition.trans_fat_g", {
        header: "Trans Fat (g)",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("nutrition.cholesterol_mg", {
        header: "Choles- terol (mg)",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("nutrition.sodium_mg", {
        header: "Sodium (mg)",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("nutrition.total_carbs_g", {
        header: "Total Carbs (g)",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("nutrition.total_sugar_g", {
        header: "Total Sugar (g)",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("nutrition.added_sugar_g", {
        header: "Added Sugar (g)",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("nutrition.protein_g", {
        header: "Protein (g)",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("nutrition.vitamin_d_mcg", {
        header: "Vitamin D (mcg)",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("nutrition.calcium_mg", {
        header: "Calcium (mg)",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("nutrition.iron_mg", {
        header: "Iron (mg)",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("nutrition.potassium_mg", {
        header: "Potas- sium (mg)",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("price", {
        header: "Price",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("price_date", {
        header: "Price Date",
        cell: info => {
            if (info.getValue().trim().length > 0)
                return new Date(info.getValue().replace(/-/g, '/').replace(/T.+/, '')).toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'})
            else
                return "";
        },
        size: 100
    }),
    columnHelper.accessor("shelf_life", {
        header: "Shelf Life",
        cell: info => info.getValue(),
        size: 400
    }),
]


// Define a Filter component, which is the input widget at the top of each column
// which determines if and how the column is filtered.
// See Tanstack's "faceted column filters" example for details about min-max values, 
// dynamic select options, and suggestions about searching.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Filter({ column }: { column: Column<any, unknown> }) {
    const columnFilterValue = column.getFilterValue()
    const { filterVariant } = column.columnDef.meta ?? {}
  
    {/* For the 'range' filterVariant, we implement min-max inputs.  This is for numeric columns */}
    return filterVariant === 'range' ? (
        <div>
            <div className="flex space-x-2">
                <DebouncedInput
                    type="number"
                    value={(columnFilterValue as [number, number])?.[0] ?? ''}
                    onChange={value => column.setFilterValue((old: [number, number]) => [value, old?.[1]])}
                    placeholder={`Min`}
                    className="w-24 border shadow rounded" />
                <DebouncedInput
                    type="number"
                    value={(columnFilterValue as [number, number])?.[1] ?? ''}
                    onChange={value => column.setFilterValue((old: [number, number]) => [old?.[0], value]) }
                    placeholder={`Max`}
                    className="w-24 border shadow rounded" />
            </div>
            {/* Put a lil' separator.  Why?  Dunno! */}
            <div className="h-1" />
        </div>
    // For the "select" filterVariant, we implement a dropdown (select) input.
    ) : filterVariant === 'select' ? (
        <select
            onChange={e => column.setFilterValue(e.target.value)}
            value={columnFilterValue?.toString()}>
            <option value="">All</option>
            <option value="dairy">dairy</option>
            <option value="grains">grains</option>
            <option value="proteins">proteins</option>
        </select>
    // The default is the "text" filterVariant, for which we implement a text input.
    ) : filterVariant === 'text' ? (
        <DebouncedInput
            style={{width: column.getSize()}}
            className="w-36 border shadow rounded"
            onChange={value => column.setFilterValue(value)}
            placeholder={`Search...`}
            type="text"
            value={(columnFilterValue ?? '') as string} />
    // The default is no filter input.
    ) : ""
}


// Define a DebouncedInput component, for use in the Filter component defined above.
// "Debounced" means there is a small delay between the user input and its processing,
// intended to prevent unnecessary processing of "noisy" user input.
// TBH I have no idea how this thing works.  Can't even trace through the code.
// I'm just taking it as a fait accomplis from the Tanstack example code.
function DebouncedInput({
    value: initialValue,
    onChange,
    debounce = 500,
    ...props
}: {
    value: string | number
    onChange: (value: string | number) => void
    debounce?: number
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
    const [value, setValue] = React.useState(initialValue)
  
    React.useEffect(() => {
      setValue(initialValue)
    }, [initialValue])
  
    React.useEffect(() => {
        const timeout = setTimeout(() => { onChange(value)}, debounce)
        return () => clearTimeout(timeout)
    }, [value, debounce, onChange])
  
    return (
      <input {...props} value={value} onChange={e => setValue(e.target.value)} />
    )
}


// Finally, the Ingredients table itself!
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const IngredientsTable = (props: any) => {
    const navigate = useNavigate()
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const context = useContext(IngredientContext)
    if (!context)
        throw Error("useIngredientContext can only be used inside an IngredientProvider")
    const ingredients = context.ingredients;

    // Define the table's properties.
    const tableOptions: TableOptions<IIngredient> = {
        data: ingredients,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        enableMultiRowSelection: false,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        filterFns: {},
        state: { sorting, columnFilters }
    }
    const table = useReactTable(tableOptions)

    const handleClick = (row: Row<IIngredient>) => {
        // Toggle the row's state (selected/unselected).
        row.toggleSelected()
        // Inform our parent about which row was selected.
        // toggleSelected() doesn't take effect until the page is re-rendered, which happens AFTER
        // this function executes, so getIsSelected() actually returns the opposite of what you'd expect.
        // So we invert the logic too.
        if (row.getIsSelected())
            props.setSelectedRowId(null)
        else
            props.setSelectedRowId(row.getValue("id"))
    }

    const handleDoubleClick = (row: Row<IIngredient>) => {
        if (!row.getIsSelected())
            row.toggleSelected()
        // Retrieve the selected record from the context and send it to the edit form.
        const record_id:number = row.getValue("id")
        const ingredient = ingredients.find((item:IIngredient) => item.id == record_id);
        navigate("/ingredientForm", { state: { ingredient } });
    }

    return (
        <table className="ingredientTable table-bordered">
            {/* The thead, tbody, and tfooter elements are the functional components of the Tanstack Table. 
                The basic skeleton is boilerplate code, but with loads of additional stuff thrown in to add
                functionality, like the onClick handler you see below adding the sorting functionality. */}
            <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                            <th key={header.id} 
                                // Do a little custom styling here
                                // For the width attribute, the getSize() call retrieves the size attribute
                                // in the column definitions above.
                                // Setting the userSelect attribute to none prevents the user from being able
                                // to select the header text.  We do this because clicking on the header is
                                // how we make sorting happen, and you have a tendency to double-click, which
                                // by default selects the text in the header cell -- and looks ugly!
                                style={{width: header.getSize(), userSelect: "none"}} 
                                colSpan={header.colSpan}
                                onClick={header.column.getToggleSortingHandler()}>
                                {header.isPlaceholder ? null : (
                                    <>
                                        {/* Add */}
                                        <div {...{ className: header.column.getCanSort() ? 'cursor-pointer select-none' : '' }}>
                                            {/* Add the appropriate header text */}
                                            { flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                            {/* This is the clever magic that adds the appropriate directional arrows 
                                                to the header when a column is sorted. */}
                                            {{asc: ' 🔼', desc: ' 🔽'}[header.column.getIsSorted() as string] ?? null}
                                        </div>

                                        {/* Add the header's appropriate Filter input widget */}
                                        {/* The stopPropagation() call in the onClick handler prevents clicks on the Filter 
                                            widget from passing through to its parent, the header div.  We need this because 
                                            clicking on the header enacts the table's sorting functionality. */}
                                        {header.column.getCanFilter() ? (
                                            <div onClick={(e) => {e.stopPropagation()}}>
                                                <Filter column={header.column}/>
                                            </div>
                                        ) : null}
                                    </>
                                    )}
                            </th>
                        ))}
                    </tr>
                ))}
            </thead>

            <tbody>
                {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} 
                        className={row.getIsSelected() ? "selected" : undefined} 
                        onClick={() => handleClick(row)}
                        onDoubleClick={() => handleDoubleClick(row)}>
                        {row.getVisibleCells().map((cell) => (
                            <td key={cell.id}>
                                {flexRender(
                                    cell.column.columnDef.cell, 
                                    cell.getContext()
                                )}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>

            <tfoot>
                {table.getFooterGroups().map(footerGroup => (
                    <tr key={footerGroup.id}>
                        {footerGroup.headers.map(header => (
                            <th key={header.id}>
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.footer,
                                        header.getContext()
                                    )
                                }
                            </th>
                        ))}
                    </tr>
                ))}
            </tfoot>
        </table>
    )
}

export default IngredientsTable;