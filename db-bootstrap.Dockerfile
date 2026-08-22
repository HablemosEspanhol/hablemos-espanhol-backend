FROM mysql:8.0

WORKDIR /db

COPY db/init.sql /db/init.sql
COPY db/insert_data.sql /db/insert_data.sql
COPY db/bootstrap.sh /db/bootstrap.sh

RUN chmod +x /db/bootstrap.sh

ENTRYPOINT ["/bin/sh", "/db/bootstrap.sh"]
