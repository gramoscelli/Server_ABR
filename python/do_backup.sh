#!/bin/bash

set > /app/environment.log
/usr/local/bin/python /app/app.py &> /app/app.log


