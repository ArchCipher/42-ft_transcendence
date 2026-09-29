FROM postgres:16-alpine

COPY services/backup/backup.sh /usr/local/bin/backup.sh

RUN chmod 0755 /usr/local/bin/backup.sh

ENTRYPOINT ["/usr/local/bin/backup.sh"]
CMD ["loop"]
