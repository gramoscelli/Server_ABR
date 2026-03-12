# pull the Node.js Docker image
FROM node:lts-iron

# Install mysql-client, ntpdate for time sync, and configure timezone
RUN apt-get update && apt-get install -y default-mysql-client tzdata ntpdate && \
    ln -sf /usr/share/zoneinfo/America/Argentina/Buenos_Aires /etc/localtime && \
    echo "America/Argentina/Buenos_Aires" > /etc/timezone && \
    rm -rf /var/lib/apt/lists/*

# create the directory inside the container
WORKDIR /usr/src/app

# copy the package.json files from local machine to the workdir in container
COPY package.json ./

# run npm install in our local machine
RUN npm install

# CMD ["/bin/sh"]

# copy the generated modules and all other files to the container
COPY . .

# our app is running on port 3000 within the container, so need to expose it
EXPOSE 3000

# Custom entrypoint that syncs time before starting the app
COPY entrypoint.sh /usr/local/bin/app-entrypoint.sh
RUN chmod +x /usr/local/bin/app-entrypoint.sh

RUN ["chmod", "+x", "/usr/local/bin/docker-entrypoint.sh"]

ENTRYPOINT ["/usr/local/bin/app-entrypoint.sh"]
CMD ["node", "bin/www"]
