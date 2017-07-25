# Permission setup so that we can host everything in the same folder.
sudo chown root:root log.txt
sudo chown root:root config.js
sudo chmod 600 log.txt
sudo chmod 600 config.js

# Install npm deps
npm install