This is just a place for me to jot down stuff about how to manage the project
which I will otherwise DEFINITELY forget!


INSTALLING AND CONFIGURING MYSQL SERVER
---------------------------------------
Most of this was taken from:
https://medium.com/@rohan_precise/step-by-step-guide-setting-up-and-connecting-mysql-on-ec2-ubuntu-instance-72c627e6c27f
...which gets my vote for the most concise, useful help article I've ever read.
I want to find the guy that wrote this and kiss him on the mouth.

If you are just setting up a local copy of MySQL Workbench to connect to the
existing MySQL server, skip to step #9.

1. Connect to the server and update Ubuntu
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
