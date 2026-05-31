import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';

import TitleCard from './TitleCard';

const AboutShell = styled(Box)(() => ({
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #e3f2fd 0%, #fce4ec 100%)',
    paddingTop: 40,
    paddingBottom: 40,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
}));

const AboutCard = styled(Paper)(({ theme }) => ({
    width: '90%',
    maxWidth: 980,
    padding: theme.spacing(3),
    background: theme.palette.secondary.main,
    color: theme.palette.table.headerColor,
    border: `1px solid ${theme.palette.table.headerBorder}`,
    borderRadius: 16,
}));

function AboutPage() {
    return (
        <AboutShell>
            <TitleCard title="About" subtitle="About this app and its tech stack" />
            <AboutCard elevation={2}>
                <Typography sx={{ mb: 2 }}>
                    The nominal purpose of this app is to track the nutritional content of one's diet. I chose
                    this goal because it is something I wanted myself. None of the nutrition-tracking apps I 
                    found out there did quite what I wanted -- so I decided to make my own!
                </Typography>
                <Typography sx={{ mb: 2 }}>
                    But the app's functionality is secondary. Its REAL purpose is to demonstrate expertise in 
                    all the technologies necessary to design, develop, and deploy a full-stack web app.
                </Typography>
                <Typography sx={{ mb: 1 }}>At the time of this writing, that tech stack includes:</Typography>
                <List sx={{ listStyleType: 'disc', pl: 3.5, mb: 2 }}>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Vite + React + Typescript + HTML + CSS - the framework for the web front end</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Expo + React Native + Typescript - the framework for the Android front end</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Flask + Python - the framework for the back end</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>TanStack Table - the tables which comprise the bulk of the web UI</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Material UI - for styling the web user interface</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Axios - for communications between the front ends and the back end</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>SQL Alchemy - for communications between the back end and the database (i.e., the ORM layer)</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>MySQL - the database</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Nginx - the web server/reverse proxy that serves up the web front end</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Waitress - the WSGI app server that serves up the back end</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Figma - for designing and prototyping the UI</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Ubuntu - the OS on which it all runs</ListItem>
                </List>
                <Typography sx={{ mb: 1 }}>
                    Add to that the various techs and services used to deploy, secure and maintain the app 
                    (DevOps and DevSecOps):
                </Typography>
                <List sx={{ listStyleType: 'disc', pl: 3.5, mb: 2 }}>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Docker - for "containerizing" the app</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Amazon Web Services (AWS) - for provisioning the server on which the app runs</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>GitHub - for source code storage and version control</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>GitHub Actions/Docker Compose - for CI/CD</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>GitHub Secrets - for configuration management</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>GoDaddy/Namecheap - for reserving and configuring the app's Internet domains</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Social logins - for "Sign in with Google" support</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Amazon SES/SMTP - for sending email (e.g., the authentication email for email-based logins)</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Let's Encrypt/TLS certificates - for providing HTTPS encryption</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>JWT tokens - for user authentication and authorization</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Jira - for planning and defect tracking</ListItem>
                </List>
                <Typography sx={{ mb: 2 }}>
                    Yes, even in this age of AI, you need to know a LOT of stuff to build a full-stack 
                    web app completely by yourself!
                </Typography>
                <Typography sx={{ mb: 2 }}>
                    Speaking of AI, special thanks to Claude, GSD, Copilot, Gemini, ChatGPT, Cline, Cursor, 
                    and Codex (in that order) for their generally helpful and occasionally infuriating advice and 
                    assistance.
                </Typography>
                <Typography sx={{ mb: 2 }}>
                    Note that the TrackEats mobile app is currently not publicly available, but you can see some
                    screen shots of it on the About TrackEats page.  If and when I release TrackEats as a real app 
                    instead of just a tech demo, the mobile version will be relased on the Google Play Store.
                </Typography>
                <Typography sx={{ mb: 2 }}>
                    For a while I also had an alternate pluggable back end written in Java/Spring Boot/Hibernate, 
                    but with the constant changes I was making it was just too much work to keep it consistent 
                    with the rest of the app, so I ditched it.
                </Typography>
                <Typography>Paul Holmes</Typography>
                <Typography variant="body2" color="text.secondary">Nov 2024, updated May 2026</Typography>
            </AboutCard>
        </AboutShell>
    );
}

export default AboutPage;
