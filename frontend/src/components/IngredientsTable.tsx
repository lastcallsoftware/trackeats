import { createColumnHelper, flexRender, getCoreRowModel, Row, TableOptions, useReactTable } from '@tanstack/react-table';
import { IIngredient } from "./DataProvider";

// Define the table's columns
const columnHelper = createColumnHelper<IIngredient>()
const columns = [
    columnHelper.accessor("id", {
        header: "ID",
        cell: info => info.getValue(),
        size: 10
    }),
    columnHelper.accessor("food_ingredient_id", {
        header: "Food Ingredient ID",
        cell: info => info.getValue(),
        size: 10
    }),
    columnHelper.accessor("recipe_ingredient_id", {
        header: "Recipe Ingredient ID",
        cell: info => info.getValue(),
        size: 10
    }),
    columnHelper.accessor("servings", {
        header: "Servings",
        cell: info => info.getValue(),
        //size: 150,
    }),
    columnHelper.accessor("summary", {
        header: "Recipe Ingredients",
        cell: info => info.getValue(),
        //size: 150,
    }),
]

interface IRecipesTableProps {
    setSelectedRowId: React.Dispatch<React.SetStateAction<number[] | null>>,
    ingredients: IIngredient[]
}

// Now declare the Foods table itself
const IngredientsTable: React.FC<IRecipesTableProps> = ({setSelectedRowId, ingredients}) => {
    // Define the table's properties.
    const tableOptions: TableOptions<IIngredient> = {
        data: ingredients,
        columns: columns,
        getCoreRowModel: getCoreRowModel(),
        enableMultiRowSelection: false,
        initialState: {
            columnVisibility: {
                id: false,
                servings: false,
                food_ingredient_id: false,
                recipe_ingredient_id: false
            }
        }
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
            setSelectedRowId(null)
        else {
            const tuple: number[] = [row.getValue("food_ingredient_id"), row.getValue("recipe_ingredient_id")]
            setSelectedRowId(tuple)
        }
    }

    return (
        <>
            <table className="ingredientTable">
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
                                    colSpan={header.colSpan}>
                                    {header.isPlaceholder ? null : (
                                        <section className='header_cell'>
                                            <p {...{ className: header.column.getCanSort() ? 'cursor-pointer select-none' : '' }}>
                                                {/* Add the appropriate header text */}
                                                { flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                            </p>
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
        </>
    )
}

export default IngredientsTable;