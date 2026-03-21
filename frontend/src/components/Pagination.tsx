
import { MdKeyboardDoubleArrowLeft, MdKeyboardArrowLeft, MdKeyboardArrowRight, MdKeyboardDoubleArrowRight } from "react-icons/md";

interface PaginationProps {
    pagination: { pageIndex: number, pageSize: number },
    setPagination: React.Dispatch<React.SetStateAction<{ pageIndex: number, pageSize: number }>>,
    totalCount: number
}

const Pagination: React.FC<PaginationProps> = ({ pagination, setPagination, totalCount }) => {
    const { pageIndex, pageSize } = pagination;
    const pageCount = Math.ceil(totalCount / pageSize);

    const canPreviousPage = pageIndex > 0;
    const canNextPage = pageIndex < pageCount - 1;

    const firstPage = () => setPagination(p => ({ ...p, pageIndex: 0 }));
    const previousPage = () => setPagination(p => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }));
    const nextPage = () => setPagination(p => ({ ...p, pageIndex: Math.min(pageCount - 1, p.pageIndex + 1) }));
    const lastPage = () => setPagination(p => ({ ...p, pageIndex: pageCount - 1 }));

    return (
        <section className="paginationButtons">
            <button disabled={!canPreviousPage} onClick={e => { e.preventDefault(); firstPage(); }}><MdKeyboardDoubleArrowLeft /></button>
            <button disabled={!canPreviousPage} onClick={e => { e.preventDefault(); previousPage(); }}><MdKeyboardArrowLeft /></button>
            {pageIndex + 1} of {pageCount}
            <button disabled={!canNextPage} onClick={e => { e.preventDefault(); nextPage(); }}><MdKeyboardArrowRight /></button>
            <button disabled={!canNextPage} onClick={e => { e.preventDefault(); lastPage(); }}><MdKeyboardDoubleArrowRight /></button>
        </section>
    );
};

export default Pagination;
