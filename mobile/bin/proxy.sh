#!/bin/bash
# Route traffic on native Windows localhost:5000 to WSL
netsh interface portproxy add v4tov4 listenport=5000 listenaddress=0.0.0.0 connectport=5000 connectaddress=172.19.77.76
netsh advfirewall firewall add rule name="WSL Port 5000" dir=in action=allow protocol=TCP localport=5000
