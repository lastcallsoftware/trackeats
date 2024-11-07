function About() {
    return (
        <section className="aboutPage">
            <section className="aboutBoundingBox">
                <p>I know, I know, it's not much to look at... yet!  But we'll get there.</p>
                <br/>
                <p>I've always said that a good user interface is the most crucial part of any 
                    application since it constitutes the user's entire experience of the app... but
                    for now I've been more focused on getting the full tech stack working.  This 
                    application's actual functionality is almost trivial compared to all the machinery
                    needed behind the scenes to get it working at a basic level.</p>
                <br/>
                <p>At the time of this writing, that tech stack includes:</p>
                <ul>
                    <li>Amazon EC2 - for provisioning the server on which it all runs</li>
                    <li>Ubuntu - the OS on which it all runs</li>
                    <li>Docker - for deploying the various pieces</li>
                    <li>Vite + React + HTML + CSS + JavaScript/Typescript - for building the front end</li>
                    <li>TanStack Table - for the front end tables</li>
                    <li>Axios - for communications between the front end and back end</li>
                    <li>Flask + Python - for building the back end</li>
                    <li>Flask-SQL Alchemy - for communications between the back end and the database (i.e., the ORM layer)</li>
                    <li>MySQL - the database</li>
                    <li>Nginx - the web server/reverse proxy that serves up the front end</li>
                    <li>Waitress - the app server that serves up the back end</li>
                    <li>TLS certificates - for providing HTTPS encryption</li>
                    <li>SMTP - for the email-based authentication used during registration</li>
                    <li>JWT tokens - for providing user authentication and authorization</li>
                </ul>
                <br/>
                <p>Add to that the techs used on the development side of things:</p>
                <ul>
                    <li>VS Code - the code editor/development environment</li>
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
                <p>As a longtime back end Java developer, I was familiar with only a few of these technologies 
                    when I started working on the app in earnest about 10 weeks ago.  The rest I picked up along
                    the way, mostly from scratch.  Frankly I was a little intimidated by the bewildering number
                    and variety of technologies and products that are required to get even a simple web app
                    working when you take ownership of the whole thing from end to end, and to be honest there's
                    still a lot to do before I'm satisfied with the end result.  Yet I'm pleased with how much 
                    I've learned and what I've been able to accomplish in a relatively short amount of time,
                    completely on my own.</p>
                <br/>
                <p>You might notice that nowhere in that tech stack do you see my primary specialty: Java!
                    That was a deliberate choice, as I wanted to broaden my skill set.  (And boy did I ever!)
                    But don't worry, one of the items on my to-do list is to implement a pluggable alternate 
                    back end using Java/Spring Boot/Hibernate.
                </p>
            </section>
        </section>
    );
}

export default About;
