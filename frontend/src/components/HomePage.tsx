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
    background: theme.palette.secondary.main,
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
                        A NOTE FOR NEW GUESTS: TrackEats is a portfolio app, intended to showcase 
                        my tech skills.
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1.5 }}>
                        To use the app you can Register your own new account, or log on with the 
                        guest account:
                    </Typography>
                    <Typography component="div" sx={{ pl: 3.5, fontFamily: 'monospace' }}>Email Address: guest@lastcallsoftware.com</Typography>
                    <Typography component="div" sx={{ pl: 3.5, mb: 1.5, fontFamily: 'monospace' }}>Password: Guest*123</Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>Feel free to play around -- all the data (including user accounts) is reset to a snapshot regularly.</Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>See the About TrackEats page for more info about the app's technical design.</Typography>
                    <Typography variant="body1">Note that TrackEats is a browser app, not a mobile app.  It incorporates
                        some reactive design techniques and will work well even if you shrink your browser window, 
                        but it will not look great on a phone.  (A native mobile app is under development.)</Typography>
                </Paper>

                <List sx={{ listStyleType: 'disc', pl: 3.5, mb: 1.5 }}>
                    <ListItem sx={{ display: 'list-item', py: 0.5 }}><Typography component="span" sx={{ fontWeight: 700 }}>Monitor Nutrition </Typography><Typography component="span">Keep track of your daily nutritional intake with ease.</Typography></ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.5 }}><Typography component="span" sx={{ fontWeight: 700 }}>Track Recipes </Typography><Typography component="span">Organize and manage your favorite recipes in one place.</Typography></ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.5 }}><Typography component="span" sx={{ fontWeight: 700 }}>Plan Meals </Typography><Typography component="span">Create meal plans that fit your lifestyle and goals.</Typography></ListItem>
                </List>

                <Typography sx={{ mb: 1.5 }}>
                    TrackEats has a three-tier system: Foods, Recipes, and Daily Log:
                </Typography>

                <Box component="ul" sx={{ pl: 3, m: 0 }}>
                    <Typography component="li" sx={{ mb: 1.5 }}>
                        To get started, think of a meal you like to make, and on the Foods page enter all the
                        ingredients that are used to make that meal, along with their nutritional data. This is
                        basically the data on each food's nutrition label when you buy it at the store.
                        You can more or less copy it directly.
                    </Typography>

                    <Typography component="li" sx={{ mb: 1.5 }}>
                        Then go to the Recipes page and create a new Recipe, using those Foods as its ingredients.
                    </Typography>
                    
                    <Typography component="li" sx={{ mb: 1.5 }}>
                        Lastly, go to the Daily Log page and add the Recipes you have eaten on a particular day.
                    </Typography>
                </Box>

                <Typography sx={{ mb: 1.5 }}>
                    You will then be able to see the complete nutrition data for that day.
                    If you have entered price data for the Foods, you will even be able to see the per-serving 
                    cost of each Recipe. It is interesting to see how little (or how much!) it actually costs
                    to prepare your own meals.
                </Typography>
                <Typography sx={{ fontStyle: 'italic', textAlign: 'center', mt: 2 }}>Start your culinary journey with TrackEats today!</Typography>
            </HomeCard>
        </HomeShell>
    );
};

export default HomePage;