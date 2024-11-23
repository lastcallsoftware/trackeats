Setting up our development environment
--------------------------------------
It's taken me a couple weeks to set up what I've got so far and I didn't take
notes along the way, so a lot of this is from memory and I've almost certainly
missed steps.  If you follow this script and get errors or realize something
is missing, PLEASE let me know so I can update it!

1. Install Windows PowerShell
In addition to having a lot of useful features that the normal Windows command
prompt lacks, Powershell has a tab menu across the top, just like a web browser,
so you can have multiple command prompts of different types open in one window.
For example, once you have WSL installed, you can open an Ubuntu bash shell as
a tab in a Powershell window.  This is my new favorite thing!
    winget install -id Microsoft.Powershell --source winget

2. Install WSL
WSL is a Linux emulator for Windows.  WSL will install a Linux virtual machine
on your Windows system, which includes its own file system separate from Windows.
(Actually you CAN access the Linux file system from Windows and vice-versa using
the proper syntax, but dont worry about that for the moment.)
It isn't a full Linux operating system, but it provides a Linux command line 
environment and some basic OS services.  This is necessary if you want to do 
your development on Windows, but deploy to Linux in productuon -- especially if 
you're using Docker (which we are), since a Docker container doesn't include the 
operating system itself, and therefore must be built for a particular OS.
If you haven't done so already, install WSL 2.  This is stupidly easy: Just open
a Powershell or even normal Windows command prompt and execute:
    wsl --install

3. Add the Ubuntu 24.04 distribution and make it the default
The default Linux distribution used with WSL is "Ubuntu", without a specific 
version number.  We don't want that.  When a Linux distribution for WSL is listed
without a specific version number, it means "use the latest version".  But it's 
not good practice to develop a production app such that the versions of its 
dependencies can change unexpectedly.  So we explicitly pick a version:
    wsl --install -d Ubuntu-24.04
    wsl --set-default Ubuntu-24.04

4. Open an Ubuntu 24.04 bash shell in Powershell
You should be in your home directory (~, which is an alias for 
/home/<username>).

5. Log on to the trackeats server and change your password
I have already created a userID for you on the trackeats server with a
username of "alex", and password of "password":
    ssh alex@lastcallsw.com
Once you are successfully logged on, please change your password:
    passwd
NOTE YOUR NEW PASSWORD!
Once your password is updated, log out and return to your local Ubuntu 
command shell:
    exit

6. Create an SSH keypair (or use your own if you already have one)
This is super easy!  From the Ubuntu command prompt, run:
    ssh-keygen
...and accept the defaults.  It generates both a private and public key file
and even puts them in the right directory (namely, ~/.ssh).
Alternately, if you already have a keypair, feel free to use that.
You can use this keypair for any purpose that requires SSH authentication.
You're definitely going to need it for accessing the trackeats server,
but you could also use it for GitHub or anything else.

7. Upload your public key to the trackeats server
There are several ways to do this.  I'm going to tell you the standard way,
even though I haven't actually tried it myself, so again there may be bumps.
From an Ubuntu command prompt, run:
    ssh-copy-id alex@lastcallsw.com
I have never run this command myself, but I think what it does is, prompt
you for your userID and password on the server, then log on, append the 
contents of your publc key file to ~/.ssh/authorized_keys, and log out.
This assumes your public key file is in your local ~/.ssh directory and has
one of the standard recognized names.  If not, you have to specify its name 
with the -i parameter.

Assuming this works, you should now be able to log on to the server via:
    ssh alex@lastcallsw.com
...and it will use your key file to authenticate you, so you don't need to 
specify a username or password any more.  This will be very handy down the
line.  Now log out again:
    exit

8. Install curl to the Ubuntu VM
Curl is a very useful tool for downloading HTML content.  It's like a 
command-line version of a web browser.  To install it, execute this from an
Ubuntu command prompt:
    sudo apt-get install curl

9. Install nvm to the Ubuntu VM
nvm is the version manager for Node.js.  In other words, its only purpose is to 
install and update JavaScript.  Install it by executing this from an Ubuntu 
command prompt:
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
Important: Close and restart your Ubuntu command window after this step.
Then verify the nvm installation by running:
    command -v nvm
You should get back a single word: "nvm".  If not it's usually because you
haven't restarted the command shell yet.

10. Install npm and node.js
Use nvm to install JavaScript; specifically npm and Node.js.  (It cracks me up 
how each package manager has to be installed by ANOTHER package manager.)  
To install nvm, execute this from an Ubuntu command prompt:
    nvm install node
Verify the installation:
    nvm ls
You should get a list of version numbers, including one for "node".  If you 
got "N/A" on that line, something went wrong.  If not, type:
    node --version
The number should match the output from the last command.

11. Install VS Code
VS Code is the hot code editor du jour.  Install it if you haven't done so
already.  I'm too tired to list the instructions for this one, figure it out 
yourself. :P

12. Install VS Code extensions
VS Code has some essential extensions necessary for our development projects.
Start VS Code, go to the Extensions tab, and search for and install the following
extensions:
    WSL
    Remote Development
    Docker
    Dev Containers
Close and restart VS Code.

13. Activate Remote Development
So this bit is a little weird.  What we're going to be doing here is running 
VS Code as a client-server app, with the server portion running in your Ubunto 
virtual machine, and the client portion running in Windows as normal.  We do 
this because the CODE we're going to be editing exists inside the virtual 
machine, but the editor's USER INTERFACE will still be in native Windows.
To activate this mode, on VS Code's welcome screen when you start it up,
look for the link that says:
    Connect To...
Click that and select:
    Connect to WSL
It kind of frightens me that there are about 10 other selections there which
I do not understand, lolz.
Anyway, after you do this, VS Code will be in that split client-server mode I
was talking about.  This persists only for the current execution of VS Code; 
if you restart VS Code again it will be in its normal mode.

14. Install/Move critical VS Code extensions to the server side
If you go to the Extensions tab in VS Code now, you will see that it now has
THREE sections instead of its normal TWO:
    Local - Installed
    WSL: Ubuntu-24.02 - Installed
    Recommended
We need to install a couple important Extensions to the server side:
    Docker
    (maybe Dev Containers, not sure)
Just install them as normal and they'll go to the right place.

If by chance they were ALREADY instaled before you activated WSL mode, then when 
you browse through your list of installed extensions in the "Local - Installed"
list, you will see little yellow warning triangles in their description, and a 
link that says "Install in WSL:Ubuntu-24.02".  This is because they're only on
the client side but you need them on the server side.  Click that link to fix it.

Not every extension has a server portion, so you don't necessarily need to
copy over EVERY extension you have installed.  That's why not every extensuion
in the "Local - Installed" list has one of those little warning triangles.

And other than the one or two I mentioned, I'm not sure what effect it will 
have to migrate over other extensions that have the warning triangles.  There
may be other extensions we want/need to migrate, but I'm not sure yet.  Use 
your discretion.

15. Install Docker to the Ubuntu VM
I honestly cannot remember how or even if I did this.  I can definitely run
docker from the Ubuntu command line, but that might be because I installed
Docker Desktop and the VS Code Docker extesion is carrying it over to the
Ubuntu VM.  Or maybe Docker Desktop is irrelevant and the only thing that
matters is the VS Code Docker extension.  Or maybe it was something else
entirely!  I suggest you try running docker from the command line at this 
point and see if it works.  If not, we'll figure it out from there.

16. Clone the project repository into your Ubuntu VM
I *think* support for git is built into VS Code without having to install
anything.  Test that by trying to run git from an Ubuntu command line or a
VS Code Terminal window.  If it's not there:
    sudo apt install git
Either way, once you can execute git on the Ubuntu command line, clone
the project repository into the Ubuntu VM.  To be clear: do NOT execute this
command at a normal Windows command prompt or using any Windows GUI for Git --
execute this in the Ubuntu command shell:
    git clone https://github.com/lastcallsoftware/trackeats.git
I think VS Code is smart enough to take it from there and you won't need to
execute any other git commands on the command line.  From now on you can use
VS Code's built-in GUI to commit/push code, which is about a BILLION times
easier than those freaking command lines.
The project now exists in the WSL virtual file system.  If you had already 
cloned the project to your normal Windows file system, you can delete it from
there -- you won't need it anymore.

17. Build and run the app
Because the VS Code WSL extension is so clever, you can still build the app as
usual, launch it, and view it in a browser on your Windows desktop, even  though
the code is in a Linux virtual machine.  For dev mode, execute this from a VS
Code Terminal window or an Ubunto command line:
    npm run dev
When building for production, run this:
    npm run build
Note that when you run the dev build, it automatically launches the app in the
Vite app server.  This is just a fast little pseudo-app-server included in the
project's dev-only dependecies when you first create a React project using Vite.
It is only used when you're devloping so you can see and test the effects of
your code changes on the fly.  It is not present in the production build.

Anyway, when you do a dev build, the terminal window starts this server and
tells you a port number.  You should be able to start any brower on your local
system and point it to localhost with that post (e.g., http://localhost:3000).
Bazinga!

When you do a production build, it doesn't launch it into the Vite server
because Vite isn't part of the production build.  However, you can still do
a smoke test on the production build by running:
    npm run preview
This does basically the same thing as the dev build: it tells you a port
number and you can point a browser at it to test the production build.

In a real production environment, some real web server (e.g., Nginx) will be
configured to serve up the app's main page. Right now I've got a little
command-line utility doing that, but it's only temporary.

18. Build a Docker image
When we're ready to deploy the app to producion, we do a production build as
described above, and then cram it into a Docker container.  You can use a
Docker command line, but who remembers that crap?  It's much easier to use a
VS Code command: Hit the F1 key while in VS Code, and at the prompt type:
    docker images
From the list that pops up, select:
    Docker Images: Build Image...
(Don't worry, next time you won't even need to type that: VS Code puts
recently-used commands at the top of the list you get when you press F1.)
When you select that menu item, you'll see a bunch of stuff happening in a 
Terminal window.  This is the Docker image build.  Press any key to dismiss
the Terminal window when it's done.

At this point you should notice a little Docker icon (the whale) in the side 
bar on the left side of the screen.  One of the sections is IMAGES.  You should 
see an entry titled:
    trackeats / latest

Right click on that and select "Run Interactive".  You should get a new Terminal
window showing the output of running the Docker image.  The last line should be:
    Accepting connections at http://localhost:XXXX
...where XXXX is the port number.  Still working on that.

19. Deploy the Docker image to the server
TBD.

