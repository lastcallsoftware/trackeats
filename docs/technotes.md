This is just a place for me to jot down stuff about how to manage the project
which I will otherwise DEFINITELY forget!

SSH
---
Config file location:
    ~/.ssh
On the client, you need the private AND public key files.
Default key names include id_rsa, id_ecdsa, id_ecdsa_sk, id_ed25519,
id_ed25519_sk, and id_dsa, depending on the type of key that was generated.
The public key will have the extension ".pub".  You can have a different
file name, but then you have to specify it using the -i parameter.

The client will also have a known_hosts file listing the public key
files of known servers.  This file is text, but not human readable.
The format is generally "hashed-server-name algorithm server-public-key".

The server will have an authorized_keys file containing the public
keys FOR THAT USER.  Remember that ~ is the home ditrectory for a
particular user and is just an alias for /home/<username>.

The format of authorized_keys is "algorithm user-public-key comment".
Each entry must be on one line (i.e., no newlines).

You can add your public key to authorized_keys manually (i.e., 
by logging on to the server NOT using the key files somehow and
manually editing the authorized_keys file), or by using:
    ssh-copy-id username@server
...which does essentially the same thing.  ssh-copy-id tries to
authenticate using password authentication, so that must be enabled.

To enable password authentication, edit both of:
    /etc/ssh/sshd_config
    /etc/ssh/ssh_config.d/60-cloudimg-settings.conf
...and change this line:
    PasswordAuthenication no
...to this:
    PasswordAuthenication yes

...and then RESTART THE SSH SERVICE:
    sudo systemctl restart ssh.service
..or maybe just this is necessary, not sure:
    sudo systemctl restart ssh
...but what DOESN'T work is the old-style command:
    service ssh restart

IMPORTANT: The ownership and permissions on the .ssh directory, the
authorized_keys file, and key files themselves, must be correct!
Set the owner of the .ssh directory and files to the user in question:
    sudo chown -R <username>:<username> ~/.ssh 
The second <username> sets the group ownership to the user as well.
Set the permissions on the directory:
    sudo chmod 0700 ./.ssh
Set the permissions on authorized_keys on the server AND the private 
key file on the client:
    sudo chmod 0600 authorized_keys
    sudo chmod 0600 id_rsa
Set the permissions on the public key file on the client:
    sudo chmod 0644 id_rsa.pub


INSTALLING AND CONFIGURING MYSQL SERVER
---------------------------------------
Most of this was taken from:
https://medium.com/@rohan_precise/step-by-step-guide-setting-up-and-connecting-mysql-on-ec2-ubuntu-instance-72c627e6c27f
...which gets my vote for the most concise, useful help article I've ever read.
I want to find the guy that wrote this and kiss him on the mouth.

If you are just setting up a local copy of MySQL Workbench to connect to an
existing MySQL server, skip to step #9.
If you are installing MySQL Server on Linux, read on!

1. Connect to the app server and update Ubuntu
    Locally, execute:
        ssh -i your-key.pem ubuntu@your-server.com
    Then on the server, once you've connected:
        sudo apt update
        sudo apt upgrade
    You may need to restart the server afterwards.

2. Install MySQL Server
        sudo apt install mysql-server

3. Secure the installation
    This asks you to confirm 5 or 6 choices to make the server more secure for
    production, like removing the test database:
        sudo mysql_secure_installation

4. Configure MySQL for remote access
    Update the MySQL config to allow connections from any host (the default is
    only localhost is allowed).  To do this, edit the mysqld.cnf file:
        sudo nano /etc/mysql/mysql.conf.d/mysql.cnf
    This uses the nano editor but you could use others (e.g., vi) if you are
    so inclined.
    In this file, look for the line that reads:
        bind-address = 127.0.0.1
    ...and change it to:
        bind-address = 0.0.0.0
    Save and exit.

3. Edit the server config file.
    MySQL Workbench looks for a particular line in a particular confiig file to
    test its connection, and for some reason that line isn't there by default.
    Let's add it:
        sudo nano /etc/mysql/my.cnf
    Between the two lines starting with ! that are already there, add:
        [mysqld]
    Save and exit.

4. Create a MySQL user for remote access
    To do this, we start a MSQL command prompt and issue a few SQL commands
    directly to the MySQL server:
        mysql -u root -p
    I don't remember if you need to "sudo" that.  Maybe?
    Anyway, once the command interpreter is running, enter:
        create user 'your-username'@'%' identified by 'your-password';
        grant all priveleges on *.* to 'your-user'@'%' with grant option;
        flush privileges;
        exit;
    The '%' suffix on the name says that it should be allowed to connect
    from any host.  In production we may want to restrict that.
    I've been using 'mysql-admin' as the username for this.  I keep the password
    in my LastPass TrackEats vault.  I won't say it here because this is a
    public file.

7. Allow MSQL port (3306) in AWS Secrity Group
    On AWS EC2, go to the security group and add a rule for Incoming Traffic
    to allow MySQL (port 3306).

8. Start the server
    To start MySQL server:
        sudo /etc/init.d/mysql start
    To stop MySQL server:
        sudo /etc/init.d/mysql stop
    To check the status:
        service mysql status

9. Set up the connection in MySQL Workbench
    On your local system, start up MySQL Workbench and add a connection.  On the Parameters tab:
        Connection name: any name you like
        Connection method: Standard TCP/IP over SSH
        SSH Hostname: trackeats.com:22
        SSH Username: your SSH user name (e.g., 'paul' or 'alex')
        SSH Password: leave this blank, we use a key file for SSH authentication
        SSH Key File: point it to your SSH .pem (private key) file
        MySQL Hostname: trackeats.com (or 127.0.0.1?  not sure)
        Username: the name we created in step 5 (e.g., 'mysql-admin')
        Password/Store In Vault: the password we created in step 5
        Default schema: leave blank (for now)
    Click on Configure Server Management and follow the wizard:
        After clicking on Next the first time, it tests the connection to the server.
        If that's successful, we're nearly home!
        After another Next, select "SSH login based management", then:
            Operating Sytem: Linux
            MSQL Instllation Type: Ubuntu Package (sysvinit, Vendor Package)
        After another Next if you should be prompted for SSH login credentials
        again, but they ahould alrewady be filled in with the values you entered
        earlier.  If not, enter them now and click Next.
        The app will do another test using these config values.
        I had a little wonkiness here -- it flipped back to the parent window
        for some reason.  If it does that, Alt-Tab back to the wizard, which
        should now hopefully be telling you that the test was successful.
        Click Next and you should get a popup asking if you want to Continue.
        Do so.
        You are brought back to the main config dialog.

10. Click on Test Connection
    BE PATIENT, it takes a few seconds.  And you may need to try two or three
    times.  But eventually you should get a popup telling you the connection was
    successful.  Voila!  Click OK.


WINDOWS SUBSYSTEM FOR LINUX (WSL)
---------------------------------
A subset of Linux distributions intended to assist in developing for Linux on
a Windows desktop.  Mostly what you're getting is a bash shell and some
command-line utilities.

This is mostly from:
https://learn.microsoft.com/en-us/windows/wsl/basic-commands#unregister-or-uninstall-a-linux-distribution

To install WSL:
    wsl --install
To see the available Linux distributions:
    wsl -l -o
    wsl --list --online
To see the installed Linux distributions:
    wsl -l
    wsl --list
To install a Linux distribution
    wsl --install <distro-name>
To remove an installed distribution:
    wsl --unregister <distro-naem>
To change the default distribution:
    wsl --set-default <distro-name>
To run a bash shell for the default distribution:
    wsl

The physical file system for the Linux distributions is buried somewhere deep
within the Windows AppData folder structure.  Good luck finding it.
The file system for the distros grows automatically.  It does NOT shrink
automatically.
Supposedly the disk space used by the distros is released when you
unregister the distro (see above), but I'm a little skeptical: it happens
instaneously!  Users have reported not getting back all their disk space.
Look into it ifit becomes a problem.


NVM/NPM/NODE.JS ON WSL
----------------------
This is mostly from:
https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-wsl

1. Open an Ubunto bash command line
2. Install curl:
        sudo apt-get install curl
3. Install nvm:
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
4. Verify the installation with:
        command -v nvm
    It should respond with "nvm".
    If you get no resopnse, close your terminal, reopen, and try again.
5. Check the installed versions:
        nvm ls
    They should all say "N/A" at this point.
6. Install Node.js and NPM.
    To install the stable release:
        nvm install --lts
    To install the current release:
        nvm install node
    You can install both and switch between them.
7. Check the installed versions again:
        nvm ls
    You should see version numbers at this point.
8. Check the node version with:
        node --version
        npm --version
9. Switching versions.
    To switch to the stable version of Node.js:
        nvm use --lts
    To switch to the current version:
        nvm use node

