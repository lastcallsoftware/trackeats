function AboutPage() {
    return (
        <section className="about-page">
            <section className="about-content">
                <p>The nominal purpose of this app is to track the nutritional content of one's
                    diet.  I chose this goal because it's something I wanted myself.  None of the 
                    nutrition-tracking apps I found out there did quite what I wanted -- so I decided 
                    to make my own!</p>
                <br/>
                <p>But the app's functionality is secondary.  Its REAL purpose is to demonstrate 
                    expertise in all the technologies necessary to design, develop, and deploy a 
                    full-stack web app.</p>
                <br/>
                <p>At the time of this writing, that tech stack includes:</p>
                <ul>
                    <li>Vite + React + JavaScript/Typescript + HTML + CSS - for building the front end</li>
                    <li>Flask + Python - for building the back end</li>
                    <li>Docker - for deploying the frontend, backend and database in separate containers</li>
                    <li>TanStack Table - for the tables which comprise the bulk of the UI</li>
                    <li>Chakra UI - for its styling capabilities (I prefer it to Bootstrap)</li>
                    <li>Axios - for communications between the front end and back end</li>
                    <li>SQL Alchemy - for communications between the back end and the database (i.e., the ORM layer)</li>
                    <li>MySQL - the database</li>
                    <li>Nginx - the web server/reverse proxy that serves up the front end</li>
                    <li>Waitress - the app server that serves up the back end</li>
                    <li>Ubuntu - the OS on which it all runs</li>
                    <li>TLS certificates - for providing HTTPS encryption</li>
                    <li>SMTP - for the email-based authentication used during registration</li>
                    <li>JWT tokens - for user authentication and authorization</li>
                </ul>
                <br/>
                <p>In addition, an alternate pluggable back end is in the works using:</p>
                <ul>
                    <li>Java</li>
                    <li>Spring Boot</li>
                    <li>Hibernate</li>
                </ul>
                <br/>
                <p>Add to that the various techs and services used on the development side of things:</p>
                <ul>
                    <li>Amazon Web Services (AWS) - for provisioning the server on which the app runs</li>
                    <li>GoDaddy/Namecheap - for licensing and configuring the app's domain names</li>
                    <li>SSL.com - for licensing the TLS certificates that secure the server</li>
                    <li>VS Code - the code editor/development environment</li>
                    <li>WSL - for developing a Linux app on a Windows PC</li>
                    <li>GitHub - for version control</li>
                    <li>GitHub Secrets - for configuration management</li>
                    <li>GitHub Actons/Docker Compose - for CI/CD</li>
                    <li>Figma - for designing and prototyping the UI</li>
                    <li>Jira - for planning and defect tracking</li>
                </ul>
                <br/>
                <p>Yes, even in this age of AI, you need to know a LOT of stuff to build a
                    full-stack web app completely by yourself.</p>
                <br/>
                <p>Speaking of which, special thanks to Claude, Copilot, Gemini, ChatGPT, and Cline 
                    (in that order) for thier frequently helpful and  occasionally infuriating advice.</p>
                <br/>
                <p>Paul Holmes</p>
                <p>Nov 2024, updated Mar 2026</p>
            </section>
        </section>
    );
}

export default AboutPage;
