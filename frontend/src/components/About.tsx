function About() {
    return (
        <section className="aboutPage">
            <section className="aboutBoundingBox">
                <p>I know, I know, it's not much to look at... yet!  But we'll get there.</p>
                <br/>
                <p>I've always asserted that a good user interface is a crucial part of any 
                    application, but for now I've been focused on getting the full tech stack 
                    working rather than making a pleasing visual design.  This application's actual
                    functionality is almost trivial compared to all the machinery behind the scenes
                    needed to get it working at a basic level.</p>
                <br/>
                <p>At the time of this writing, that tech stack includes:</p>
                <ul>
                    <li>Amazon EC2 - for provisioning the server on which it all runs</li>
                    <li>Ubuntu - the OS on which it all runs</li>
                    <li>Docker - for deploying the various pieces</li>
                    <li>React + Vite + Typescript - for building the front end you're using right now</li>
                    <li>Flask + Python - for building the back end</li>
                    <li>SQL Alchemy + Flask-SQL Alchemy - for the ORM layer</li>
                    <li>MySQL - the database</li>
                    <li>Nginx - the web server/reverse proxy that serves up the front end</li>
                    <li>Waitress - the app server that serves up the back end</li>
                    <li>TLS certificates - for providing HTTPS encryption</li>
                    <li>SMTP - for the email-based authentication used during registration</li>
                    <li>JWT tokens - for providing user authorization</li>
                </ul>
                <br/>
                <p>Add to that the techs used on the development side of things:</p>
                <ul>
                    <li>VS Code - the editor/development environment</li>
                    <li>Git - for version control</li>
                    <li>WSL - for developing a Linux app on a Windows PC!</li>
                    <li>Jira - for planning and defect tracking</li>
                    <li>Just the whole subject of domain name registration and email hosting!</li>
                </ul>
                <br/>
                <p>And there are still a few techs I want to add in when I have time:</p>
                <ul>
                    <li>Kubernetes - for smoother orchestration</li>
                    <li>Jenkins or GitHub Actions - for CI/CD</li>
                </ul>
                <br/>
                <p>As a longtime Java developer, I was familiar with only a few of these technologies 
                    when I started working on the app in earnest about 10 weeks ago.  The rest I picked
                    up along the way, mostly from scratch.  I'm pretty pleased with how much I've
                    learned and what I've been able to accomplish in a relatively short amount of time.</p>
            </section>
        </section>
    );
}

export default About;
