import { ColumnFiltersState, createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, Row, SortingState, TableOptions, useReactTable } from '@tanstack/react-table';
import React, { useContext } from 'react';
import { IRecipe, DataContext } from "./DataProvider";
import { Filter } from "./Widgets"


// Define the table's columns
const columnHelper = createColumnHelper<IRecipe>()
const columns = [
    columnHelper.accessor("id", {
        header: "ID",
        cell: info => info.getValue(),
        size: 55
    }),
    columnHelper.accessor("name", {
        header: "Name",
        cell: info => info.getValue(),
        size: 150,
        meta: { filterVariant: "text" }
    }),
]

// Now declare the Foods table itself
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RecipesTable = (props: any) => {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const context = useContext(DataContext)
    if (!context)
        throw Error("useDataContext can only be used inside a DataProvider")
    const recipes = context.recipes;

    // Define the table's properties.
    const tableOptions: TableOptions<IRecipe> = {
        data: recipes,
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

    const handleClick = (row: Row<IRecipe>) => {
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

    return (
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
                        onClick={() => handleClick(row)}>
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

export default RecipesTable;