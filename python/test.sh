#!/bin/bash

export MEGA_USER="gramoscelli@hotmail.com"
export MEGA_PASSWORD="Secret20130"
export MYSQL_HOST="127.0.0.1"
export MYSQL_PORT="3306"
export MYSQL_USER="abr"
export MYSQL_PASSWORD="abr2005"
export MYSQL_DATABASE="abr"
export BACKUP_DIR="$(pwd)/backup/"
python3 ./app.py
 