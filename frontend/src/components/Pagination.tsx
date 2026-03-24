
import { MdKeyboardDoubleArrowLeft, MdKeyboardArrowLeft, MdKeyboardArrowRight, MdKeyboardDoubleArrowRight } from "react-icons/md";
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

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
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ mt: 1.5 }}>
            <IconButton size="small" disabled={!canPreviousPage} onClick={e => { e.preventDefault(); firstPage(); }}>
                <MdKeyboardDoubleArrowLeft />
            </IconButton>
            <IconButton size="small" disabled={!canPreviousPage} onClick={e => { e.preventDefault(); previousPage(); }}>
                <MdKeyboardArrowLeft />
            </IconButton>
            <Typography variant="body2" sx={{ minWidth: 72, textAlign: 'center' }}>
                {pageIndex + 1} of {pageCount || 1}
            </Typography>
            <IconButton size="small" disabled={!canNextPage} onClick={e => { e.preventDefault(); nextPage(); }}>
                <MdKeyboardArrowRight />
            </IconButton>
            <IconButton size="small" disabled={!canNextPage} onClick={e => { e.preventDefault(); lastPage(); }}>
                <MdKeyboardDoubleArrowRight />
            </IconButton>
        </Stack>
    );
};

export default Pagination;
