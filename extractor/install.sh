#!/bin/sh

echo "deb http://archive.debian.org/debian/ buster main" > /etc/apt/sources.list
apt update
apt install python3-pip

pip3 install requests
pip3 install bs4
