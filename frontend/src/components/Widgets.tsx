import { Column, RowData } from "@tanstack/react-table"
import React from "react"


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

// Define a Filter component, which is the input widget at the top of each column
// which determines if and how the column is filtered.
// See Tanstack's "faceted column filters" example for details about min-max values, 
// dynamic select options, and suggestions about searching.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Filter({ column }: { column: Column<any, unknown> }) {
    const columnFilterValue = column.getFilterValue()
    const { filterVariant } = column.columnDef.meta ?? {}
  
    {/* For the 'range' filterVariant, we implement min-max inputs.  This is for numeric columns */}
    return filterVariant === 'range' ? (
        <div>
            <div className="flex space-x-2">
                <DebouncedInput
                    //className="w-24 border shadow rounded" 
                    type="number"
                    value={(columnFilterValue as [number, number])?.[0] ?? ''}
                    onChange={value => column.setFilterValue((old: [number, number]) => [value, old?.[1]])}
                    placeholder={`Min`} />
                <DebouncedInput
                    //className="w-24 border shadow rounded"
                    type="number"
                    value={(columnFilterValue as [number, number])?.[1] ?? ''}
                    onChange={value => column.setFilterValue((old: [number, number]) => [old?.[0], value]) }
                    placeholder={`Max`} />
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
            style={{width: column.getSize() - 6}}
            //className="w-36 border shadow rounded"
            onChange={value => column.setFilterValue(value)}
            placeholder={`Filter...`}
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
export function DebouncedInput({
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
