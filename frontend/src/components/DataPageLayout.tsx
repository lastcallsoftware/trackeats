import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TitleCard from './TitleCard';

type DataPageLayoutProps = {
    title: string;
    subtitle: string;
    controlBarLeft?: ReactNode;
    controlBarRight?: ReactNode;
    aboveMain?: ReactNode;
    main: ReactNode;
    sidebar?: ReactNode;
};

function DataPageLayout({
    title,
    subtitle,
    controlBarLeft,
    controlBarRight,
    aboveMain,
    main,
    sidebar,
}: DataPageLayoutProps) {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #e3f2fd 0%, #fce4ec 100%)',
                py: { xs: 3, sm: 5 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            <TitleCard title={title} subtitle={subtitle} />

            <Paper
                elevation={4}
                sx={{
                    background: '#fff',
                    borderRadius: 2.25,
                    boxShadow: '0 4px 24px 0 rgba(25, 118, 210, 0.10)',
                    px: { xs: 2, sm: 5 },
                    py: { xs: 2, sm: 3 },
                    width: { xs: '98%', md: '90%' },
                    maxWidth: 1600,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: 1.5,
                }}
            >
                {/* ── Control bar ── */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: 40, flexWrap: 'wrap' }}>
                        {controlBarLeft}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 40 }}>
                        {controlBarRight}
                    </Box>
                </Box>

                {aboveMain}

                {/* ── Main content: table + nutrition panel ── */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        {main}
                    </Box>
                    {sidebar !== undefined && sidebar !== null && (
                        <Box sx={{ flex: 1, minWidth: 280, maxWidth: 310, display: { xs: 'none', md: 'block' }, pl: 1, mt: 0 }}>
                            {sidebar}
                        </Box>
                    )}
                </Box>
            </Paper>
        </Box>
    );
}

export default DataPageLayout;