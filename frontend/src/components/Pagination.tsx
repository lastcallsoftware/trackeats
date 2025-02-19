import { Table } from "@tanstack/react-table"
import { IFood, IRecipe } from "./DataProvider"
import { MdKeyboardDoubleArrowLeft, MdKeyboardArrowLeft, MdKeyboardArrowRight, MdKeyboardDoubleArrowRight } from "react-icons/md";

function Pagination({table}: {table:Table<IFood> | Table<IRecipe>}) {
    return(
        <section className="paginationButtons">
            <button onClick={() => table.firstPage()}><MdKeyboardDoubleArrowLeft/></button>
            <button onClick={() => table.previousPage()}><MdKeyboardArrowLeft/></button>
            <button onClick={() => table.nextPage()}><MdKeyboardArrowRight/></button>
            <button onClick={() => table.lastPage()}><MdKeyboardDoubleArrowRight/></button>
        </section>
    )
}

export default Pagination;
