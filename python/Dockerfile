FROM python:3.6

RUN apt update && apt install -y cron default-mysql-client nano less
WORKDIR /app
COPY . .
RUN echo "48 9 * * 1-6 /bin/sh -c /app/do_backup.sh" > /etc/crontab
RUN chmod +x /app/do_backup.sh 
RUN crontab /etc/crontab
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt
CMD ["./start.sh"]