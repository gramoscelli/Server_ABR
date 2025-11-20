# pull the Node.js Docker image
FROM node:lts-iron

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

RUN ["chmod", "+x", "/usr/local/bin/docker-entrypoint.sh"]

# the command that starts our app
CMD ["node", "bin/www"]
