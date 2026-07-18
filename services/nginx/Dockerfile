# base image
FROM nginx:alpine

# Official image runs envsubst on /etc/nginx/templates/*.template
COPY conf.template /etc/nginx/templates/default.conf.template

EXPOSE 443

# By default nginx forks to background and the original process exits.
# Docker tracks PID 1. When PID 1 exits, it thinks container stopped.
# It keeps restarting as we have "restart: always" in compose.yaml.
# So, run nginx in foreground to avoid this issue.
CMD ["nginx", "-g", "daemon off;"]
