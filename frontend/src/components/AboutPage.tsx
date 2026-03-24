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
    background: theme.palette.table.headerBg,
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
                    The nominal purpose of this app is to track the nutritional content of one's diet. I chose this goal because it is something I wanted myself. None of the nutrition-tracking apps I found out there did quite what I wanted -- so I decided to make my own!
                </Typography>
                <Typography sx={{ mb: 2 }}>
                    But the app's functionality is secondary. Its REAL purpose is to demonstrate expertise in all the technologies necessary to design, develop, and deploy a full-stack web app.
                </Typography>
                <Typography sx={{ mb: 1 }}>At the time of this writing, that tech stack includes:</Typography>
                <List sx={{ listStyleType: 'disc', pl: 3.5, mb: 2 }}>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Vite + React + JavaScript/Typescript + HTML + CSS - for building the front end</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Flask + Python - for building the back end</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Docker - for deploying the frontend, backend and database in separate containers</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>TanStack Table - for the tables which comprise the bulk of the UI</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Material UI - for styling the user interface</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Axios - for communications between the front end and back end</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>SQL Alchemy - for communications between the back end and the database (i.e., the ORM layer)</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>MySQL - the database</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Nginx - the web server/reverse proxy that serves up the front end</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Waitress - the app server that serves up the back end</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Ubuntu - the OS on which it all runs</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>TLS certificates - for providing HTTPS encryption</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>SMTP - for the email-based authentication used during registration</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>JWT tokens - for user authentication and authorization</ListItem>
                </List>
                <Typography sx={{ mb: 1 }}>In addition, an alternate pluggable back end is in the works using:</Typography>
                <List sx={{ listStyleType: 'disc', pl: 3.5, mb: 2 }}>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Java</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Spring Boot</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Hibernate</ListItem>
                </List>
                <Typography sx={{ mb: 1 }}>Add to that the various techs and services used on the development side of things:</Typography>
                <List sx={{ listStyleType: 'disc', pl: 3.5, mb: 2 }}>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Amazon Web Services (AWS) - for provisioning the server on which the app runs</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>GoDaddy/Namecheap - for licensing and configuring the app's domain names</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>SSL.com - for licensing the TLS certificates that secure the server</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>VS Code - the code editor/development environment</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>WSL - for developing a Linux app on a Windows PC</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>GitHub - for version control</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>GitHub Secrets - for configuration management</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>GitHub Actons/Docker Compose - for CI/CD</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Figma - for designing and prototyping the UI</ListItem>
                    <ListItem sx={{ display: 'list-item', py: 0.25 }}>Jira - for planning and defect tracking</ListItem>
                </List>
                <Typography sx={{ mb: 2 }}>
                    Yes, even in this age of AI, you need to know a LOT of stuff to build a full-stack web app completely by yourself!
                </Typography>
                <Typography sx={{ mb: 2 }}>
                    Speaking of which, special thanks to Claude, Copilot, Gemini, ChatGPT, and Cline (in that order) for their generally helpful and occasionally infuriating advice and assistance.
                </Typography>
                <Typography>Paul Holmes</Typography>
                <Typography variant="body2" color="text.secondary">Nov 2024, updated Mar 2026</Typography>
            </AboutCard>
        </AboutShell>
    );
}

export default AboutPage;
