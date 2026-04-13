CONTEXT_NAME=aspire-m5
docker context update $CONTEXT_NAME --docker "host=ssh://tiago@192.168.15.13"
docker context ls
docker context use $CONTEXT_NAME
docker ps
