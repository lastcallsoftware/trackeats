import { createColumnHelper, flexRender, getCoreRowModel, TableOptions, useReactTable } from '@tanstack/react-table';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
        cell: info => info.getValue(),
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

    const tableOptions: TableOptions<Ingredient> = {
        data: ingredients,
        columns,
        getCoreRowModel: getCoreRowModel(),
        enableMultiRowSelection: false
    }

    // Use the table hooks from TanStack Table
    const table = useReactTable(tableOptions)

    const addRecord = () => {
        navigate("/ingredientForm", { state: {} });
    }
    
    useEffect(() => {
        // Call the back end's /ingredient API to get the data to populate the table
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
        <section className="ingredientTableContainer">
          	<table className="ingredientTable">
        		<thead>
            		{table.getHeaderGroups().map((headerGroup) => (
    					<tr key={headerGroup.id}>
        					{headerGroup.headers.map((header) => (
        						<th key={header.id} style={{width: header.getSize()}} colSpan={header.colSpan}>
        							{header.isPlaceholder
        								? null
										: flexRender(
											header.column.columnDef.header,
											header.getContext()
										)
                          			}
                    			</th>
                  			))}
                		</tr>
              		))}
            	</thead>
            	<tbody>
              		{table.getRowModel().rows.map((row) => (
                		<tr key={row.id} className={row.getIsSelected() ? "selected" : undefined} onClick={row.getToggleSelectedHandler()}>
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

            <button onClick={addRecord}>Add</button>

            <p>{errorMessage}</p>
</section>

)
}
  
export default Ingredients;