function AboutPage() {
    return (
        <section className="aboutPage">
            <section className="aboutBoundingBox">
                <p>The nominal purpose of this app is to track the nutritional content of one's
                    diet.  And this is indeed a real objective!  In fact I chose this goal 
                    because it's something I wanted myself.  None of the apps I found out there
                    did quite what I wanted in a product of this type -- so I decided to make my
                    own.</p>
                <br/>
                <p>But the app's functionality is secondary.  Its REAL purpose is to 
                    excerise and demonstrate a working knowledge of all the products and technologies
                    necessary to design, construct, and deploy a full-stack web app.</p>
                <br/>
                <p>At the time of this writing, that tech stack includes:</p>
                <ul>
                    <li>Amazon EC2 - for provisioning the server that hosts everything</li>
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
                    <li>Figma - for designing and prototyping the UI</li>
                    <li>Jira - for planning and defect tracking</li>
                    <li>Just the whole subject of domain name registration and email hosting!</li>
                </ul>
                <br/>
                <p>And there are a couple more techs I want to add in when I have time.  They're total overkill for a
                    little project like this one, but of course, the idea is to get experience using them, so their
                    fit for the project is secondary:</p>
                <ul>
                    <li>Kubernetes - for smoother orchestration</li>
                    <li>Jenkins or GitHub Actions - for CI/CD</li>
                </ul>
                <br/>
                <p>As a longtime back end Java developer, I was familiar with only a few of these technologies 
                    when I started working on the app in earnest about 10 weeks ago.  The rest I picked up along
                    the way, mostly from scratch.  Frankly I was a little intimidated at first by the bewildering
                    number and variety of technologies and products that are required to get even a simple web app
                    working when you take ownership of the whole thing from end to end, and there's still a lot 
                    left to do before I'll be satisfied with the end result.  Yet I'm pleased with how much 
                    I've learned and what I've been able to accomplish in a relatively short amount of time,
                    completely on my own.</p>
                <br/>
                <p>You might notice that nowhere in that tech stack do you see my primary specialty: Java!
                    That was a deliberate choice, as I wanted to broaden my skill set.  (And boy did I ever!)
                    But don't worry, one of the items on my to-do list is to implement a pluggable alternate 
                    back end using Java/Spring Boot/Hibernate.
                </p>
                <br/>
                <p>Paul Holmes</p>
                <p>04 Nov 2024</p>
            </section>
        </section>
    );
}

export default AboutPage;
