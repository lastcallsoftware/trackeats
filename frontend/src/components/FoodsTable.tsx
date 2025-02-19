import { ColumnFiltersState, createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, Row, SortingState, TableOptions, useReactTable } from '@tanstack/react-table';
import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { IFood, DataContext } from "./DataProvider";
import { Filter } from "./Widgets"
import { getFoodGroupLabel } from './FoodGroups';
import Pagination from './Pagination';

// Define the table's columns
const columnHelper = createColumnHelper<IFood>()
const foodColumns = [
    columnHelper.accessor("id", {
        header: "ID",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("group", {
        header: "Group",
        //cell: info => String(info.getValue()).charAt(0).toUpperCase() + String(info.getValue()).slice(1),
        cell: info => getFoodGroupLabel(info.getValue()),
        size: 85,
        meta: { filterVariant: "text" }
    }),
    columnHelper.accessor("vendor", {
        header: "Vendor",
        cell: info => info.getValue(),
        size: 150,
        meta: { filterVariant: "text" }
    }),
    columnHelper.accessor("name", {
        header: "Name",
        cell: info => info.getValue(),
        size: 150,
        meta: { filterVariant: "text" }
    }),
    columnHelper.accessor("subtype", {
        header: "Subtype",
        cell: info => info.getValue(),
        size: 150,
        meta: { filterVariant: "text" }
    }),
    columnHelper.accessor("description", {
        header: "Description",
        cell: info => info.getValue(),
        size: 340,
        meta: { filterVariant: "text" }
    }),
    columnHelper.accessor("size_description", {
        header: "Size",
        cell: info => info.getValue(),
        size: 150
    }),
    columnHelper.accessor("size_oz", {
        header: "Size (oz or fl oz)",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("size_g", {
        header: "Size (g or ml)",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("servings", {
        header: "Servings",
        cell: info => info.getValue(),
        size: 65
    }),
    columnHelper.accessor("nutrition.serving_size_description", {
        header: "Serving Size",
        cell: info => info.getValue(),
        size: 150
    }),
    columnHelper.accessor("nutrition.serving_size_oz", {
        header: "Serving Size (oz or fl oz)",
        cell: info => info.getValue(),
        size: 65
    }),
    columnHelper.accessor("nutrition.serving_size_g", {
        header: "Serving Size (g or ml)",
        cell: info => info.getValue(),
        size: 65
    }),
    columnHelper.accessor("nutrition.calories", {
        header: "Calories",
        cell: info => info.getValue(),
        size: 65
    }),
    columnHelper.accessor("nutrition.total_fat_g", {
        header: "Total Fat (g)",
        cell: info => info.getValue(),
        size: 65
    }),
    columnHelper.accessor("nutrition.saturated_fat_g", {
        header: "Satu- rated Fat (g)",
        cell: info => info.getValue(),
        size: 65
    }),
    columnHelper.accessor("nutrition.trans_fat_g", {
        header: "Trans Fat (g)",
        cell: info => info.getValue(),
        size: 65
    }),
    columnHelper.accessor("nutrition.cholesterol_mg", {
        header: "Choles- terol (mg)",
        cell: info => info.getValue(),
        size: 65
    }),
    columnHelper.accessor("nutrition.sodium_mg", {
        header: "Sodium (mg)",
        cell: info => info.getValue(),
        size: 65
    }),
    columnHelper.accessor("nutrition.total_carbs_g", {
        header: "Total Carbs (g)",
        cell: info => info.getValue(),
        size: 65
    }),
    columnHelper.accessor("nutrition.total_sugar_g", {
        header: "Total Sugar (g)",
        cell: info => info.getValue(),
        size: 65
    }),
    columnHelper.accessor("nutrition.added_sugar_g", {
        header: "Added Sugar (g)",
        cell: info => info.getValue(),
        size: 65
    }),
    columnHelper.accessor("nutrition.protein_g", {
        header: "Protein (g)",
        cell: info => info.getValue(),
        size: 65
    }),
    columnHelper.accessor("nutrition.vitamin_d_mcg", {
        header: "Vitamin D (mcg)",
        cell: info => info.getValue(),
        size: 65
    }),
    columnHelper.accessor("nutrition.calcium_mg", {
        header: "Calcium (mg)",
        cell: info => info.getValue(),
        size: 65
    }),
    columnHelper.accessor("nutrition.iron_mg", {
        header: "Iron (mg)",
        cell: info => info.getValue(),
        size: 65
    }),
    columnHelper.accessor("nutrition.potassium_mg", {
        header: "Potas- sium (mg)",
        cell: info => info.getValue(),
        size: 65
    }),
    columnHelper.accessor("price", {
        header: "Price",
        cell: info => info.getValue(),
        size: 65
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

// Now declare the foods table itself
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FoodsTable = (props: any) => {
    const navigate = useNavigate()
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const context = useContext(DataContext)
    if (!context)
        throw Error("useDataContext can only be used inside a DataProvider")
    const foods = context.foods;

    // Define the table's properties.
    const tableOptions: TableOptions<IFood> = {
        data: foods,
        columns: foodColumns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        autoResetPageIndex: false,
        enableMultiRowSelection: false,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        filterFns: {},
        state: { sorting, columnFilters },
        initialState: {
            pagination: {
                pageSize: 10
            }
        }
    }
    const table = useReactTable(tableOptions)

    const handleClick = (row: Row<IFood>) => {
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

    const handleDoubleClick = (row: Row<IFood>) => {
        if (!row.getIsSelected())
            row.toggleSelected()
        // Retrieve the selected record from the context and send it to the edit form.
        const record_id:number = row.getValue("id")
        const food = foods.find((item:IFood) => item.id == record_id);
        navigate("/foodForm", { state: { food } });
    }

    return (
        <>
            <table className="foodTable table-bordered">
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
                                        <section className='header_cell'>
                                            {/* Add */}
                                            <p {...{ className: header.column.getCanSort() ? 'cursor-pointer select-none' : '' }}>
                                                {/* Add the appropriate header text */}
                                                { flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                                {/* This is the clever magic that adds the appropriate directional arrows 
                                                    to the header when a column is sorted. */}
                                                {{asc: ' 🔼', desc: ' 🔽'}[header.column.getIsSorted() as string] ?? null}
                                            </p>

                                            {/* Add the header's appropriate Filter input widget */}
                                            {/* The stopPropagation() call in the onClick handler prevents clicks on the Filter 
                                                widget from passing through to its parent, the header div.  We need this because 
                                                clicking on the header enacts the table's sorting functionality. */}
                                            {header.column.getCanFilter() ? (
                                                <section className='filter_box' onClick={(e) => {e.stopPropagation()}}>
                                                    <Filter column={header.column}/>
                                                </section>
                                            ) : null}
                                        </section>
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
            <Pagination table={table}/>
        </>
    )
}

export default FoodsTable;