function AboutPage() {
    return (
        <section className="about-page">
            <section className="about-box">
                <p>The nominal purpose of this app is to track the nutritional content of one's
                    diet.  I chose this goal because it's something I wanted myself.  None of the 
                    nutrition-tracking apps I found out there did quite what I wanted -- so I decided 
                    to make my own!</p>
                <br/>
                <p>But the app's functionality is secondary.  Its REAL purpose is to 
                    excerise and demonstrate a working knowledge of all the technologies
                    necessary to design, construct, and deploy a full-stack web app.</p>
                <br/>
                <p>At the time of this writing, that tech stack includes:</p>
                <ul>
                    <li>Amazon EC2 - for provisioning the server that hosts everything</li>
                    <li>Ubuntu - the OS on which it all runs</li>
                    <li>Docker - for deploying the various pieces</li>
                    <li>Vite + React + JavaScript/Typescript + HTML + CSS - for building the front end</li>
                    <li>TanStack Table - for the front end tables</li>
                    <li>Chakra UI - for its styling capabilities (I prefer it to Bootstrap)</li>
                    <li>Axios - for communications between the front end and back end</li>
                    <li>Flask + Python - for building the back end</li>
                    <li>SQL Alchemy - for communications between the back end and the database (i.e., the ORM layer)</li>
                    <li>MySQL - the database</li>
                    <li>Nginx - the web server/reverse proxy that serves up the front end</li>
                    <li>Waitress - the app server that serves up the back end</li>
                    <li>TLS certificates - for providing HTTPS encryption</li>
                    <li>SMTP - for the email-based authentication used during registration</li>
                    <li>JWT tokens - for user authentication and authorization</li>
                </ul>
                <br/>
                <p>Add to that the techs used on the development side of things:</p>
                <ul>
                    <li>VS Code - the code editor/development environment</li>
                    <li>Git - for version control</li>
                    <li>WSL - for developing a Linux app on a Windows PC!</li>
                    <li>Figma - for designing and prototyping the UI</li>
                    <li>Jira - for planning and defect tracking</li>
                    <li>Just the whole subject of domain name registration and email hosting!</li>
                </ul>
                <br/>
                <p>And there are a couple more techs I want to add in when I have time.  Of course they're
                    total overkill for a little project like this one, but of course the idea is to
                    demonstrate my knowledge of them, so their fit for the project is secondary:</p>
                <ul>
                    <li>Kubernetes - for smoother orchestration</li>
                    <li>Jenkins or GitHub Actions - for CI/CD</li>
                </ul>
                <br/>
                <p>In addition, an alternate pluggable back end is in the works using:</p>
                <ul>
                    <li>Java</li>
                    <li>Spring Boot</li>
                    <li>Hibernate</li>
                </ul>
                <br/>
                <p>Paul Holmes</p>
                <p>Nov 2024</p>
            </section>
        </section>
    );
}

export default AboutPage;
