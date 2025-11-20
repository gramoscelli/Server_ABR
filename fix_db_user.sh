#!/bin/bash

# Load environment variables
source .env

# Replace variables in the SQL script and store in a temporary file
sed -e "s/\${MYSQL_USER}/$MYSQL_USER/g" -e "s/\${MYSQL_PASSWORD}/$MYSQL_PASSWORD/g" fix_db_user.sql > /tmp/temp_fix_db_user.sql

# Get the container ID of the running MySQL container
CONTAINER_ID=$(docker ps --filter "name=mysql" --format "{{.ID}}")

# Execute the SQL script inside the Docker container
docker exec -i "$CONTAINER_ID" mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" < /tmp/temp_fix_db_user.sql

# Optionally clean up the temporary file
rm /tmp/temp_fix_db_user.sql
