import { createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, Row, SortingState, TableOptions, useReactTable } from '@tanstack/react-table';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconContext } from "react-icons";
import { MdAddCircleOutline, MdEdit, MdRemoveCircleOutline } from "react-icons/md";

export type Ingredient = {
    id?: number
    group: string
    type: string
    subtype: string
    description: string
    vendor: string
    size_description: string
    size_g: number
    servings: number
    nutrition_id?: number
    nutrition: {
        serving_size_description: string
        serving_size_g: number
        calories: number
        total_fat_g: number
        saturated_fat_g: number
        trans_fat_g: number
        cholesterol_mg: number
        sodium_mg: number
        total_carbs_g: number
        fiber_g: number
        total_sugar_g: number
        added_sugar_g: number
        protein_g: number
        vitamin_d_mcg: number
        calcium_mg: number
        iron_mg: number
        potassium_mg: number
        }
    price: number
    price_date: string
    shelf_life: string
}

// Define the table
const columnHelper = createColumnHelper<Ingredient>()
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
        cell: info => new Date(info.getValue().replace(/-/g, '/').replace(/T.+/, '')).toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'}),
        size: 100
    }),
    columnHelper.accessor("shelf_life", {
        header: "Shelf Life",
        cell: info => info.getValue(),
        size: 400
    }),
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ingredients = (props: any) => {
    const [ingredients, setIngredients] = useState<Ingredient[]>([])
    const [errorMessage, setErrorMessage] = useState<string>("")
    const navigate = useNavigate()
    const removeTokenFunction = props.removeTokenFunction
	const tok = sessionStorage.getItem("access_token")
	const token = tok ? JSON.parse(tok) : ""
    const [sorting, setSorting] = React.useState<SortingState>([])

    const tableOptions: TableOptions<Ingredient> = {
        data: ingredients,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableMultiRowSelection: false,
        onSortingChange: setSorting,
        state: {
            sorting
        }
    }

    // Use the table hooks from TanStack Table
    const table = useReactTable(tableOptions)

    const onDoubleClick = (row: Row<Ingredient>) => {
        console.log("doubleclick")
        const record_id:number = row.getValue("id")
        doEdit(record_id)
    }

    const addRecord = () => {
        // Go to the edit form
        navigate("/ingredientForm", { state: {} });
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
        const ingredient = ingredients.find(item => item.id == record_id);
        navigate("/ingredientForm", { state: { ingredient } });
    }

    const deleteRecord = () => {
        // Get the selected record
        const selectedRows = table.getSelectedRowModel().rows
        if (selectedRows.length > 0) {
            // Confirm the deletion request
            const confirmed = confirm("Delete record.  Are you sure?  This cannot be undone.")
            if (confirmed) {
                const record_id = selectedRows[0].getValue("id");
                const table_idx = Number(selectedRows[0].id);

                // Call the back end's "delete ingredient" API
                axios.delete("/ingredient/" + record_id, {headers: { "Authorization": "Bearer " + token}})
                .then(() => {
                    setIngredients(prevItems => prevItems.filter((_item, idx) => idx != table_idx));
                })
                .catch((error) => {
                    if (error.status == 401) {
                        removeTokenFunction()
                        navigate("/login", { state: { message: "Your token has expired and you have been logged out." } });
                    }
                    setErrorMessage(error.message)
                })
            }
        }
    }

    // On page load/rerender, call the back end's /ingredient API to get the 
    // data to populate the table
    useEffect(() => {
        axios.get("/ingredient", {headers: { "Authorization": "Bearer " + token}})
            .then((response) => {
                setIngredients(response.data);
            })
            .catch((error) => {
				console.log(error)
                if (error.status == 401) {
                    removeTokenFunction()
                    navigate("/login", { state: { message: "Your token has expired and you have been logged out." } });
                }
                setErrorMessage(error.message)
            })
    }, [token, navigate, removeTokenFunction])

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
                                                    appropriate directional arrows to the header when a column is sorted.
                                                    First it defines a little two-item dictionary, and then immediately 
                                                    follows it with an index selector which will evaluate to one of the 
                                                    dictioary's two item keys depending on how the column is currently 
                                                    being sorted.  Thus the expression always evaluates to one of the
                                                    dictonary's two values, or to undefined if getIsSorted() returns false.
                                                    The ?? on the end is the Typescript "nullish coalescing operator" which
                                                    provides a "fallback value" if the expression on the left evaluates to
                                                    null or undefined (which it would do in the default case of the column
                                                    not being sorted).  You'll notice that the fallback value is null
                                                    anyway, so really it's only proteting against the expression evaluating
                                                    to undefined.  Presumably the author felt that would be a bad thing,
                                                    though if I take out the ?? it doesn't seem to matter -- the page still
                                                    renders just fine.  But I'll leave it in, in the 100% certain case that 
                                                    I don't completely understand how this page works. */}
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
  
export default Ingredients;