import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import { styled } from '@mui/material/styles';
import TitleCard from './TitleCard';



const HomeShell = styled(Box)(() => ({
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #e3f2fd 0%, #fce4ec 100%)',
    paddingTop: 40,
    paddingBottom: 40,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
}));

const HomeCard = styled(Paper)(({ theme }) => ({
    width: '90%',
    maxWidth: 980,
    padding: theme.spacing(3),
    background: theme.palette.table.headerBg,
    color: theme.palette.table.headerColor,
    border: `1px solid ${theme.palette.table.headerBorder}`,
    borderRadius: 16,
}));

const HomePage: React.FC = () => {
    return (
        <HomeShell>
            <TitleCard title="Welcome to TrackEats" subtitle="Your ultimate app for tracking recipes, meals, and nutrition!" />
            <HomeCard elevation={2}>
                <Paper sx={{ p: 2, mb: 3, bgcolor: '#fff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 1 }}>
                    <Typography variant="body1" sx={{ mb: 1.5 }}>
                        A NOTE FOR NEW GUESTS: TrackEats is a portfolio app, intended to showcase my tech skills.
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1.5 }}>
                        To use the app you can Register your own new account, but it is a lot more interesting to log on with an account that already has a lot of data. To do that, log on using these credentials:
                    </Typography>
                    <Typography component="div" sx={{ pl: 3.5, fontFamily: 'monospace' }}>Username: guest</Typography>
                    <Typography component="div" sx={{ pl: 3.5, mb: 1.5, fontFamily: 'monospace' }}>Password: Guest*123</Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                        Feel free to play around -- all the data (including user accounts) is reset to a snapshot regularly.
                    </Typography>
                    <Typography variant="body1">See the About TrackEats page for more info about the app's technical design.</Typography>
                </Paper>

                <List sx={{ listStyleType: 'disc', pl: 3.5, mb: 1.5 }}>
                    <ListItem sx={{ display: 'list-item', py: 0.5 }}><Typography component="span" sx={{ fontWeight: 700 }}>Monitor Nutrition </Typography><Typography component="span">Keep track of your daily nutritional intake with ease.</Typography></ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.5 }}><Typography component="span" sx={{ fontWeight: 700 }}>Track Recipes </Typography><Typography component="span">Organize and manage your favorite recipes in one place.</Typography></ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.5 }}><Typography component="span" sx={{ fontWeight: 700 }}>Plan Meals </Typography><Typography component="span">Create meal plans that fit your lifestyle and goals.</Typography></ListItem>
                </List>

                <Typography sx={{ mb: 1.5 }}>TrackEats has a two-tier system: Foods and Recipes.</Typography>
                <Typography sx={{ mb: 1.5 }}>
                    To get started, think of a meal you like to make, and on the Foods page enter all the ingredients that are used to make that meal, along with their nutritional data. This is basically the data on each item's nutrition label when you buy it at the store. You can more or less copy it directly.
                </Typography>
                <Typography sx={{ mb: 1.5 }}>Then go to the Recipes page and create a new Recipe, using those Foods as its ingredients.</Typography>
                <Typography sx={{ mb: 1.5 }}>
                    Once that is all entered, you will be able to see the complete per-serving nutrition data for that meal on the Recipes page. If you have entered price data for the Foods, you will even be able to see the per-serving cost of each Recipe. It is interesting to see how little (and occasionally, how much!) meals actually cost to make yourself.
                </Typography>
                <Typography sx={{ fontStyle: 'italic', textAlign: 'center', mt: 2 }}>Start your culinary journey with TrackEats today!</Typography>
            </HomeCard>
        </HomeShell>
    );
};

export default HomePage;