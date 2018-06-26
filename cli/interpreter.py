#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Author : KeyLo99
Contact : twitter.com/KeyLo_99
Project Owner : https://github.com/HoLyVieR/
"""

from datetime import datetime
import websocket
import json

ws_addr = "ws://dns1.zhack.ca:8001/dnsbin"  # DnsBin WebSocket Address
site_addr = "http://dnsbin.zhack.ca/"  # URL
subd_addr = ".d.zhack.ca"  # Subdomain

def handle_message(ws, message):
    try:
        json_data = json.loads(message)
        if json_data['type'] == 'token':
            print_dns(json_data)
        elif json_data['type'] == 'request':
            print_data(json_data['data'])
    except Exception as e:
        print(gettime()+"[-] " + str(e))

def on_error(ws, error):
    print(gettime()+"[-] " + str(error))

def on_close(ws):
    print(gettime()+"[-] WebSocket connection closed.")

def on_open(ws):
    print(gettime()+"[-] Getting subdomain. Please wait...")

def print_dns(data):
    data_token = data['data']
    master_token = data['master']
    subdomain = "*."+data_token+subd_addr
    print(gettime()+"[+] Data Token: " + data_token)
    print(gettime()+"[+] Master Token: " + master_token)
    print(gettime()+"[#] Subdomain to use: " + subdomain)
    print(" ="*25)

def print_data(data):
    print(gettime()+"[<*>] " + data)

def gettime():
    return "[" + str(datetime.now().strftime("%H:%M:%S")) + "] "

def main():
    print("""
  ____            ____  _       
 |  _ \ _ __  ___| __ )(_)_ __  
 | | | | '_ \/ __|  _ \| | '_ \ 
 | |_| | | | \__ \ |_) | | | | |
 |____/|_| |_|___/____/|_|_| |_|
 The request.bin of DNS request
 @HoLyVieR             @KeyLo99\n""")
    websocket.enableTrace(True)
    ws = websocket.WebSocketApp(ws_addr,
                                on_message=handle_message,
                                on_error=on_error,
                                on_close=on_close,
                                on_open=on_open)
    ws.run_forever()

if __name__ == "__main__":
    main()
