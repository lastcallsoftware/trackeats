Setting up the development environment
--------------------------------------
This is a step-by-step guide for installing and setting up all the pieces needed to edit, build and deploy the TrackEats app (or just about any other project using the WSL/VS Code tool stack, really).  It assumes you're running a Windows PC.

1. Install Windows PowerShell
In addition to having a lot of useful features that the normal Windows command prompt lacks, Powershell has a tab menu across the top, just like a web browser, so you can have multiple command prompts of different types open in one window.  For example, once you have WSL installed, you can open an Ubuntu bash shell as
a tab in a Powershell window.  We'll be doing just that quite often.
From a Windows command prompt, enter:
    winget install -id Microsoft.Powershell --source winget

2. Install WSL (Windows Subsystem for Linux)
WSL is a Linux emulator for Windows.  It isn't a full Linux operating system, but it provides a Linux command line environment and many basic OS services.  This is necessary if you want to do your development on a Windows PC, but deploy and run the app on Linux.  The overwheling majority of the world's app servers run some flavor of Linux, so we definitely want this!
WSL creates a Linux virtual machine on your Windows system, which includes its own file system separate from Windows.  It's crucial that you remember the distinction between the two file systems: they cannot "see" each other, and the WSL file system follows the Linux syntax and conventions.  For example, there is no "drive letter" (e.g., "C:") like there is in the Windows file system.  It's almost like you're running WSL on a separate computer.  (Actually you CAN technically access the Linux file system from Windows and vice-versa using the proper syntax, but it's awkward and very slow.)
From a Powershell command prompt, enter:
    wsl --install

3. Add the Ubuntu 24.04 distribution and make it the default
The default Linux distribution provided with WSL is called "Ubuntu".  By default WSL doesn't assign a specific Ubuntu version number, but we don't want that.  When a Linux distribution for WSL is listed without a specific version number, it means "use the latest version".  But it's not good practice to develop an app such that the versions of its core dependencies can change unexpectedly when something gets an update, so we explicitly pick a specific version of Ubuntu.
From a Powershell command prompt, enter:
    wsl --install -d Ubuntu-24.04
    wsl --set-default Ubuntu-24.04

4. Open an Ubuntu 24.04 bash shell
"bash" is the name of the app that provides the Ubuntu command prompt, or "shell".  You'll be using it a LOT, so make sure you know how to open one now.  From the Windows start menu, launch a Powershell window, then start a new "Ubuntu-24.04" window from the dropdown menu in its tab bar (NOT "Ubuntu" without a version number!).  Alternately, right-click on a Powershell icon and select "Ubuntu-24.04" from the right-click menu.  Either way you have to launch the Ubuntu shell from Powershell.  Therefore I recommend pinning Powershell to your Windows taskbar or at least creating a desktop shortcut for it.
When you start an Ubuntu bash shell you should be in your home directory (your /home/<username> directory).  The default prompt should be something like "username@computername".  If not, go into Powershell's settings by selecting Settings from the dropdown menu in the Powershell window's tab bar, find the "Ubuntu-24.04" entry from the choices to the left, select "Starting Directory" from the choices to the right, and change it to "~" (without the quotes).
In Linux, ~ is an alias for your home directory.  You can immediately go there by entering "cd ~" at the prompt, and paths are frequently specified relative to it (e.g., "~/data").  Many apps create hidden directories under your home directory to store settings and data, so you'll be here often.  Any directory whose name starts with a . is hidden by default in a directory listing, though you can still access it.  For example, the .ssh subdirectory off your home directory holds your ssh keys.  We'll be accessing that directory later in these instructions.
Note that this is a Linux command prompt, not a Windows command prompt.  A few commands, like "cd" for "change directory" are the same as in Windows, but most are different.  For example, the command for "make directory" is "md" in Windows, but "mkdir" in Linux.  You'll pick it up as you go.
Your home directory is also the best place to store projects.  I highly recommend creating a "dev" subdirectory ("mkdir dev") right now, and then later in these instructions when you create the trackeats project, put it in its own subdirectory under that.

5. Log on to the trackeats server and change your password
This assumes you already have an account on the app server.  How that happens is beyond the scope of this document.
From an Ubuntu command prompt, enter:
    ssh username@lastcallsw.com
You will be prompted for your password on the app server, which you should already have been given separately.
Once you are successfully logged on to the server, change your password:
    passwd
You will be prompted for your old and new passwords.  NOTE YOUR NEW PASSWORD!
Then log off the server by entering:
    exit

6. Create an SSH keypair
From an Ubuntu command prompt, enter:
    ssh-keygen
...and accept the defaults.  This generates both a private and public key file and even puts them in the proper directory (namely, ~/.ssh).  By default, the public key will be called "id_rsa.pub", and the private key "id_rsa", with no extension".  (I know, they're not the greatest names.)
Technically you can use this keypair for any purpose that requires SSH authentication, though best practices dictate that you only use a given keypair for one purpose.  The private key is essentially a password.  Treat it as such (i.e., never share it with anyone).  I recommend copying them both somewhere secure as a backup.

7. Upload your public key to the trackeats server
There are several ways to do this.  I'll give you the "standard" way.
From an Ubuntu command prompt, enter:
    ssh-copy-id username@lastcallsw.com
This command prompts you for your userID and password on the server, then logs on, appends the contents of your publc key file to the server's ~/.ssh/authorized_keys file, and logs out.  This assumes your public key file is stored in your local ~/.ssh directory and has one of the standard recognized names, which should be the case if you followed previous instructions.  If not, you must specify the private key file's name with the -i parameter.
You can now log on to the server without typing a password any more.  The ssh command will use your key file to authenticate you.  Test it out!
From an Ubuntu command prompt, enter:
    ssh username@lastcallsw.com
After verifying that it works, log out of the server:
    exit

8. Install curl to the Ubuntu VM
Curl is a very useful tool for downloading HTML content.  It's basically a command-line version of a web browser.
From an Ubuntu command prompt, enter:
    sudo apt-get install curl

9. Install nvm to the Ubuntu VM
nvm is the version manager for Node.js.  Its main purpose is to install and update JavaScript itself.
From an Ubuntu command prompt, enter:
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
Important: Close and restart your Ubuntu command window after this step.  Then verify the nvm installation.
From an Ubuntu command prompt, enter:
   command -v nvm
You should get back a single word: "nvm".  If not, it's likely because you haven't restarted the command shell.

10. Install npm and node.js
npm is the "package manager" for JavaScript.  It is used to install tools and libraries for JavaScript.
From an Ubuntu command prompt, enter:
    nvm install node
Verify the installation:
From an Ubuntu command prompt, enter:
    nvm ls
You should get a list of version numbers, including one for "node".  If you got "N/A" on that line, something went wrong.  If not, type:
From an Ubuntu command prompt, enter:
    node --version
The number should match the version number output by the previous command.

13. Install Docker Desktop
Most modern apps are deployed using Docker containers, and TrackEats is no exception.  VS Code has a Docker Extension which we'll install later, but we still need the Docker Engine to power it, and to get that we need to install Docker Desktop.  Go to the Docker Desktop for Windows download page (https://docs.docker.com/desktop/setup/install/windows-install/), download it, and follow the prompts.  It's a standard Windows app with a familiar installation process.
Note that Docker Desktop must be started after your computer boots up so it will start its underlying Docker Engine, but after that you can close Docker Desktop.  The Engine will continue to run, and that's the important part.  If you ever get an error when you try to build the app complaining that Docker is not installed, it's probably because Docker Engine hasn't been started yet.  So after Docker Desktop installation completes, you may want to go into its settings and check the "Start Docker Desktop when you sign in to your computer" box so you don't have to remember to do that all the time.

12. Install VS Code
VS Code is the hot code editor du jour.  Install it if you haven't done so already.  It's a standard Windows application, so simply go to its download page (https://code.visualstudio.com/download), and download and execute the install program.

13. Install VS Code extensions
VS Code has various extensions essential or at least useful for modern development projects.
Start VS Code, go to the Extensions tab, and search for and install the following extensions:
    WSL
    Remote Development
    GitHub
    Docker
    Dev Containers
Close and restart VS Code.

14. Activate "Remote Development"
When we're using VS Code with WSL, we're running its base engine in WSL, and its user interface in Windows.  To activate this mode, on VS Code's welcome screen, look for the link that says:
    Connect To...
Click that and select:
    Connect to WSL
After you do this, VS Code will be operating in WSL.  Until you open a project in native Windows, it will remember that you've selected WSL previously and start in that mode automatically.

15. Install VS Code extensions in WSL
Many (but not all) VS Code extensions have portions that must also run in WSL when VS Code is running in that environment.  If you go to the Extensions tab in VS Code while running in WSL, you will see that several extensions have prompts next to their name saying "Install in WSL".  Click those prompts.

16. Clone the TrackEats GitHub project into VS Code
You can use command lines to interact with GitHub if you're a reckless masochist, but the smart, safe and easy way is to use the VS Code UI for all GitHub interactions.
In VS Code, click Ctrl+Shift+P to open the Command Palette, find and execute "Git: Clone", and follow the prompts.  You'll need to supply the URL of the GitHub repository (https://github.com/lastcallsoftware/trackeats.git) and the path on your PC where you want the project to be stored.  I recommend putting it under the dev subdirectory off your home directory that we created earlier ("~/dev/trackeats").  In any case, make sure the directory you choose is in the WSL (Linux) file system, not the native Windows file system, or you'll pay a stiff performance penalty every time you or VS Code accesses any file in the project (i.e., constantly).

17. Build and run the app
At this point your environment is set up and you should be able to build and run the app.  Follow the instructions in the README.md.
