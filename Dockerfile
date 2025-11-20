FROM php:latest
RUN echo "deb http://archive.debian.org/debian stretch main" > /etc/apt/sources.list
RUN apt update
