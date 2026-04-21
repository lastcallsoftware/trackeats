#!/bin/bash
# Route traffic from any source on native Windows port 5000 to the IP address on WSL where the backend is running
netsh interface portproxy add v4tov4 listenport=5000 listenaddress=0.0.0.0 connectport=5000 connectaddress=172.19.77.76
# Poke a hole in Windows Defender (aka Windows Firewall) at port 5000 so we don't have to disable the whole thing
netsh advfirewall firewall add rule name="WSL Port 5000" dir=in action=allow protocol=TCP localport=5000
