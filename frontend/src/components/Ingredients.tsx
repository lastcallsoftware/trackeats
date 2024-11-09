import { createColumnHelper, flexRender, getCoreRowModel, TableOptions, useReactTable } from '@tanstack/react-table';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Ingredient = {
    id: number
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
        total_carb_g: number
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

const columnHelper = createColumnHelper<Ingredient>()

const columns = [
    columnHelper.accessor("id", {
        header: () => "ID",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("group", {
        header: () => <div className="w-2">Group</div>,
        cell: info => String(info.getValue()).charAt(0).toUpperCase() + String(info.getValue()).slice(1),
    }),
    columnHelper.accessor("type", {
        header: () => <div className="w-2">Type</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("subtype", {
        header: () => <div className="w-2">Subtype</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("description", {
        header: () => <div className="w-3">Description</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("vendor", {
        header: () => <div className="w-2">Vendor</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("size_description", {
        header: () => <div className="w-2">Size</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("size_g", {
        header: () => <div className="w-1">Size (g or ml)</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("servings", {
        header: () => <div className="w-1">Servings</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.serving_size_description", {
        header: () => <div className="w-2">Serving Size</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.serving_size_g", {
        header: () => <div className="w-1">Serving Size (g or ml)</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.calories", {
        header: () => <div className="w-1">Calories</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.total_fat_g", {
        header: () => <div className="w-1">Total Fat (g)</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.saturated_fat_g", {
        header: () => <div className="w-1">Saturated Fat (g)</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.trans_fat_g", {
        header: () => <div className="w-1">Trans Fat (g)</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.cholesterol_mg", {
        header: () => <div className="w-1">Cholesterol (mg)</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.sodium_mg", {
        header: () =><div className="w-1">Sodium (mg)</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.total_carb_g", {
        header: () => <div className="w-1">Total Carbs (g)</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.total_sugar_g", {
        header: () => <div className="w-1">Total Sugar (g)</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.added_sugar_g", {
        header: () => <div className="w-1">Added Sugar (g)</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.protein_g", {
        header: () => <div className="w-1">Protein (g)</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.vitamin_d_mcg", {
        header: () => <div className="w-1">Vitamin D (mcg)</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.calcium_mg", {
        header: () => <div className="w-1">Calcium (mg)</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.iron_mg", {
        header: () => <div className="w-1">Iron (mg)</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.potassium_mg", {
        header: () => <div className="w-1">Potassium (mg)</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("price", {
        header: () => <div className="w-1">Price</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("price_date", {
        header: () => <div className="w-2">Price Date</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("shelf_life", {
        header: () => <div className="w-4">Shelf Life</div>,
        cell: info => info.getValue(),
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
        getCoreRowModel: getCoreRowModel()
    }

    // Use the table hooks from TanStack Table
    const table = useReactTable(tableOptions)

    useEffect(() => {
        // Call the back end's /login API with the username and password from the form
        axios.get("/ingredient", {headers: { "Authorization": "Bearer " + token}})
            .then((response) => {
                setIngredients(response.data);
            })
            .catch((error) => {
				console.log(error)
                if (error.status == 401) {
                    removeTokenFunction()
                    navigate("/", { state: { message: "Your token has expired and you have been logged out." } });
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
        						<th key={header.id}>
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
                		<tr key={row.id}>
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

		  	<p>{errorMessage}</p>
        </section>
      )
}
  
export default Ingredients;