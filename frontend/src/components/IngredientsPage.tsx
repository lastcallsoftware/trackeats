import { createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, Row, SortingState, TableOptions, useReactTable } from '@tanstack/react-table';
import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconContext } from "react-icons";
import { MdAddCircleOutline, MdEdit, MdRemoveCircleOutline } from "react-icons/md";
import { IIngredient, IngredientContext } from "./IngredientProvider";

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

const IngredientsPage = () => {
    const navigate = useNavigate()
    const [sorting, setSorting] = React.useState<SortingState>([])
    const context = useContext(IngredientContext)
    if (!context)
        throw Error("useIngredientContext can only be used inside an IngredientProvider")
    const ingredients = context.ingredients;
    const errorMessage = context.errorMessage;
    const deleteIngredient = context.deleteIngredient;

    const tableOptions: TableOptions<IIngredient> = {
        data: ingredients,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableMultiRowSelection: false,
        onSortingChange: setSorting,
        state: { sorting }
    }

    // Use the table hooks from TanStack Table
    const table = useReactTable(tableOptions)

    const onDoubleClick = (row: Row<IIngredient>) => {
        console.log("doubleclick")
        const record_id:number = row.getValue("id")
        doEdit(record_id)
    }

    const addRecord = () => {
        // Go to the edit form
        navigate("/ingredientForm");
    }

    const editRecord = () => {
        // Get the selected record
        const selectedRows = table.getSelectedRowModel().rows
        if (selectedRows.length > 0) {
            const record_id:number = selectedRows[0].getValue("id");
            doEdit(record_id)
        }
    }
    
    const doEdit = (record_id: number) => {
        const ingredient = ingredients.find((item:IIngredient) => item.id == record_id);
        navigate("/ingredientForm", { state: { ingredient } });
    }

    const deleteRecord = () => {
        // Get the selected record
        const selectedRows = table.getSelectedRowModel().rows
        if (selectedRows.length > 0) {
            // Confirm the deletion request
            const confirmed = confirm("Delete record.  Are you sure?  This cannot be undone.")
            if (confirmed) {
                const record_id:number = selectedRows[0].getValue("id");
                //const table_idx = Number(selectedRows[0].id);
                // Delete the record from the database and the ingredients list.
                //TODO: Not sure if this will also update the table on the GUI.
                deleteIngredient(record_id);
            }
        }
    }

    return (
        <section className="ingredientPage">
            <section className="ingredientTableContainer">
                <table className="ingredientTable">
                    {/* The thead, tbody, and tfooter elements are the functional components of the Tanstack Table. 
                        They are mostly boilerplate code, with additional stuff thrown in to add functionality,
                        like the onClick handler you see below adding the sorting functionality. */}
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
                                            <div>
                                                { flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                                {/* This little bit is the INCREDIBLY clever magic that adds the 
                                                    appropriate directional arrows to the header when a column is sorted. */}
                                                {{asc: ' 🔼', desc: ' 🔽'}[header.column.getIsSorted() as string] ?? null}
                                            </div>
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
                                onClick={row.getToggleSelectedHandler()}
                                onDoubleClick={() => onDoubleClick(row)}>
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
            </section>

            <section className="buttonBar">
                <button className="editButton" onClick={addRecord}>
                    <IconContext.Provider value={{ size: "30px", color: "green"}}>
                        <p className="editButtonText">Add</p><MdAddCircleOutline/>
                    </IconContext.Provider>
                </button>
                <button className="editButton" onClick={editRecord}>
                    <IconContext.Provider value={{ size: "30px", color: "orange"}}>
                        <p className="editButtonText">Edit</p><MdEdit/>
                    </IconContext.Provider>
                </button>
                <button className="editButton" onClick={deleteRecord}>
                    <IconContext.Provider value={{ size: "30px", color: "red"}}>
                        <p className="editButtonText">Delete</p><MdRemoveCircleOutline/>
                    </IconContext.Provider>
                </button>
            </section>

            <p>{errorMessage}</p>
        </section>
    )
}
  
export default IngredientsPage;