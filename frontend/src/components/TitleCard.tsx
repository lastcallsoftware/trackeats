import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';

interface TitleCardProps {
    title: string;
    subtitle: string;
}

function TitleCard({ title, subtitle }: TitleCardProps) {
    return (
        <Paper
            elevation={3}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                mb: 3,
                background: 'rgba(255,255,255,0.85)',
                borderRadius: 2,
                boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.08)',
                px: { xs: 2, sm: 5 },
                py: 2,
                width: { xs: '98%', md: '90%' },
                maxWidth: 900,
                textAlign: 'left',
            }}
        >
            <Box sx={{ fontSize: '2.2rem', fontWeight: 700, color: 'primary.main', letterSpacing: 1, mb: 0.2, width: '100%', textAlign: 'center' }}>{title}</Box>
            <Box sx={{ fontSize: '1.1rem', color: 'text.secondary', width: '100%', textAlign: 'center' }}>{subtitle}</Box>
        </Paper>
    );
}

export default TitleCard;
