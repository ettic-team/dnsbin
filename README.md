# dnsbin
The request.bin of DNS request

DNSBin is a simple tool to test data exfiltration through DNS and help test vulnerability like RCE or XXE when the environment has significant constraint. The project is in two parts, the first one is the web server and it's component. It offers a basic web UI, for most cases you won't need more than this. The client part offers a python script which allows data to be transfered in both direction through DNS using the web service. 

## Demo

http://dnsbin.zhack.ca/

## Setup and installation

### DNS

The current DNS setup that I have for the demo server is the following one. Do note that I did this with trial and error, so the setup may be overcomplicated or may have issues. If you are more knowledgeable feel free to open an issue. 

 - Add a "A" record for the domain "dns1.zhack.ca" that points to "192.99.55.194".
 - Add a "A" record for the domain "ns1.zhack.ca" that points to "192.99.55.194".
 - Add a "NS" record for the domain "d.zhack.ca" with the value "dns1.zhack.ca".
 - Add a "NS" record for the domain "d.zhack.ca" with the value "ns1.zhack.ca". 

### Web Hosting

It's highly recommended to start the DNS receiver and WebSocket endpoint with the Node.JS module ["forever"](https://www.npmjs.com/package/forever).

> forever start index.js

For the frontend, the file "index.html" can be hosted on the webserver of your choice. Make sure that the WebSocket URL points to your server.

### Client

The client script requires ["dnspython"](https://github.com/rthalley/dnspython) to be installed on both end. Whether you are sending or receiving data, you must first start the script on the machine that's outside of the restricted zone. The script will provide you with a unique token that you must pass when running the script on the machine that's inside of the restricted zone.
