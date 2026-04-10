ollama run phi3 "gere 3 frases em 'espanhol' de nível 'A1' que contenham a palavra 'casa' e a tradução em 'português' \
Formato: conteudo não deve retornar em JSON, dever texto em formato CSV usando ; como delimitador\
Regras: deve conter somente o conteudo do arquivo sem aspas simples ou duplas.\
exemplo de resposta:\
Tengo una casa; Tenho uma casa\
Soy un perro; Sou um cachorro\
Vivo en São Paulo; Vivo em São Paulo"

ollama run phi3:mini "write 3 phrases in spanish with the word 'recordar',  concat ';', concat the traslation in 'portuguese'. each phrase need to be separed by breakline '\\n'"