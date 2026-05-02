# Route backend traffic from native Windows port 5000 to the WSL IP where the
# Flask backend is running.  The mobile app hits the Windows host IP, so this
# forwards that request across the WSL boundary.
netsh interface portproxy add v4tov4 listenport=5000 listenaddress=0.0.0.0 connectport=5000 connectaddress=172.19.77.76

# Route Metro bundler traffic from native Windows port 8081 to the WSL IP where
# `expo start` is serving JavaScript for the installed dev-client build.
netsh interface portproxy add v4tov4 listenport=8081 listenaddress=0.0.0.0 connectport=8081 connectaddress=172.19.77.76

# Poke holes in Windows Defender (aka Windows Firewall) for both ports so we do
# not have to disable the firewall entirely.
netsh advfirewall firewall add rule name="WSL Port 5000" dir=in action=allow protocol=TCP localport=5000
netsh advfirewall firewall add rule name="WSL Port 8081" dir=in action=allow protocol=TCP localport=8081
