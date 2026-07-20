clear
service_name=hablemos-espanhol-backend-$1-1
echo "Abrindo logs do $service_name"
docker logs -f $service_name