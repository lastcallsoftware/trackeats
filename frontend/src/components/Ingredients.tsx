import { createColumnHelper, flexRender, getCoreRowModel, TableOptions, useReactTable } from '@tanstack/react-table';
import axios from 'axios';
import { useEffect, useState } from 'react';

type Ingredient = {
    id: number
    name: string
    category: string
    vendor: string
    size: string
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
    columnHelper.accessor("name", {
        header: () => <div className="w-20">Name</div>,
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("category", {
        header: () => "Category",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("vendor", {
        header: () => "Vendor",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("size", {
        header: () => "Size",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("servings", {
        header: () => "Servings",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.serving_size_description", {
        header: () => "Serving Size Description",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.serving_size_g", {
        header: () => "Serving Size (g or ml)",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.calories", {
        header: () => "Calories",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.total_fat_g", {
        header: () => "Total Fat (g)",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.saturated_fat_g", {
        header: () => "Saturated Fat (g)",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.trans_fat_g", {
        header: () => "Trans Fat (g)",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.cholesterol_mg", {
        header: () => "Cholesterol (mg)",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.sodium_mg", {
        header: () => "Sodium (mg)",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.total_carb_g", {
        header: () => "Total Carbs (g)",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.total_sugar_g", {
        header: () => "Total Sugar (g)",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.added_sugar_g", {
        header: () => "Added Sugar (g)",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.protein_g", {
        header: () => "Protein (g)",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.vitamin_d_mcg", {
        header: () => "Vitamin D (mcg)",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.calcium_mg", {
        header: () => "Calcium (mg)",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.iron_mg", {
        header: () => "Iron (mg)",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("nutrition.potassium_mg", {
        header: () => "Potassium (mg)",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("price", {
        header: () => "Price",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("price_date", {
        header: () => "Price Date",
        cell: info => info.getValue(),
    }),
    columnHelper.accessor("shelf_life", {
        header: () => <div className="w-20">Shelf Life</div>,
        cell: info => info.getValue(),
    }),
]

const Ingredients = () => {
    //const rerender = React.useReducer(() => ({}), {})[1]
    const [ingredients, setIngredients] = useState([])
    const [errorMessage, setErrorMessage] = useState()

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
        axios.get("/ingredient", {headers: { 'Authorization': `Bearer ${token}`}})
            .then((response) => {
                setIngredients(response.data);
            })
            .catch((error) => {
				console.log(error)
                setErrorMessage(error.message)
            })
    }, [token])

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