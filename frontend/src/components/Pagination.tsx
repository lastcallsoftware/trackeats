import { Table } from "@tanstack/react-table"
import { IFood, IRecipe } from "./DataProvider"
import { MdKeyboardDoubleArrowLeft, MdKeyboardArrowLeft, MdKeyboardArrowRight, MdKeyboardDoubleArrowRight } from "react-icons/md";


function Pagination({table}: {table:Table<IFood> | Table<IRecipe>}) {
    return(
        <section className="paginationButtons">
            <button disabled={!table.getCanPreviousPage()} onClick={(e) => {e.preventDefault(); table.firstPage()}}><MdKeyboardDoubleArrowLeft/></button>
            <button disabled={!table.getCanPreviousPage()} onClick={(e) => {e.preventDefault(); table.previousPage()}}><MdKeyboardArrowLeft/></button>
            {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            <button disabled={!table.getCanNextPage()} onClick={(e) => {e.preventDefault(); table.nextPage()}}><MdKeyboardArrowRight/></button>
            <button disabled={!table.getCanNextPage()} onClick={(e) => {e.preventDefault(); table.lastPage()}}><MdKeyboardDoubleArrowRight/></button>
        </section>
    )
}

export default Pagination;
