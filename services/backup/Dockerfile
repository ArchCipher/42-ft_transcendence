FROM postgres:16-alpine

COPY services/backup/backup.sh /usr/local/bin/backup.sh
COPY services/backup/restore.sh /usr/local/bin/restore.sh

RUN chmod 0755 /usr/local/bin/backup.sh /usr/local/bin/restore.sh

ENTRYPOINT ["/usr/local/bin/backup.sh"]
CMD ["loop"]
