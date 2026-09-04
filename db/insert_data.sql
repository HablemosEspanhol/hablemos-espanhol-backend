INSERT INTO proficiency_levels (level, focus) VALUES
('A1', 'Conseguir se locomover, pedir comida, comprar coisas e interagir em situações diárias essenciais.'),
('A2', 'Resolver imprevistos de viagem, falar sobre planos e expressar preferências simples.'),
('B1', 'Lidar com imprevistos de viagem, expressar sentimentos, contar experiências passadas e sustentar diálogos do cotidiano sem depender de tradução mental.'),
('B2', 'Naturalidade no diálogo, uso correto de variação linguística regional e capacidade de debater tópicos do cotidiano.'),
('C1', 'Entendimento implícito, ironia, humor, linguagem idiomática e capacidade de transitar entre registros formais e informais sem esforço.'),
('C2', 'Domínio total da estrutura formal, debates abstratos sobre política, economia, história e reuniões profissionais.')
ON DUPLICATE KEY UPDATE focus = VALUES(focus);

INSERT INTO lessons (lesson_number, title, goal, level) VALUES
(1, 'Saudações, Apresentação e Cortesia', 'Cumprimentar, se apresentar e usar palavras de educação.', 'A1'),
(2, 'A Frase Coringa e Pedidos de Ajuda', 'Resolver dúvidas de idioma e pedir para falarem mais devagar.', 'A1'),
(3, 'Direções e Localização', 'Encontrar lugares no mapa, perguntar onde fica algo e entender orientações simples.', 'A1'),
(4, 'Restaurantes e Cafés', 'Pedir mesa, fazer pedidos do menu e pedir a conta.', 'A1'),
(5, 'Compras, Mercado e Dinheiro', 'Perguntar preços, quantidades e pagar no comércio local.', 'A1'),
(6, 'Transporte e Hospedagem', 'Hacer check-in/out, pedir táxi/Uber, comprar passagens.', 'A2'),
(7, 'Descrevendo Sintomas e Emergências', 'Explicar problemas de saúde simples na farmácia ou hospital.', 'A2'),
(8, 'Expressando Gostos e Preferências', 'Explicar o que prefere fazer durante os passeios e itinerários.', 'A2'),
(9, 'Contando o que Aconteceu (Passado Simples)', 'Narrar acontecimentos recentes ou problemas ocorridos na viagem.', 'A2'),
(10, 'Contando Experiências e Histórias de Viagem (Pasados)', 'Relatar imprevistos, passeios anteriores e histórias pessoais usando Pretérito Indefinido e Imperfecto.', 'B1'),
(11, 'Expressando Opiniões, Desejos e Dúvidas (Subjuntivo Inicial)', 'Dar opiniões sobre passeios e cultura, sugerir atividades e expressar preferências.', 'B1'),
(12, 'Resolvendo Problemas e Reclamações (Hotel e Serviços)', 'Fazer reclamações formais, pedir trocas de quarto ou ajustes na conta com educação e firmeza.', 'B1'),
(13, 'Modismos e Regionalismos (Espanhol Rioplatense e Voseo)', 'Entender o falar local, o ritmo da fala na Argentina, o uso do voseo e gírias urbanas.', 'B2'),
(14, 'Hipóteses, Planos e Situações Condicionais', 'Fazer planos complexos, negociações flexíveis e especular sobre situações hipotéticas.', 'B2'),
(15, 'Conectores e Coesão para Debates Informais', 'Argumentar em conversas de mesa, defender pontos de vista e concordar ou discordar com diplomacia.', 'B2'),
(16, 'Implicaturas, Humor e Duplo Sentido', 'Compreender piadas locais, sarcasmo, metáforas e expressões de segundo sentido sem tradução.', 'C1'),
(17, 'Expressões Idiomáticas Avançadas e Metáforas Culturais', 'Dominar provérbios e expressões coloquiais profundas para soar de forma natural.', 'C1'),
(18, 'Debates Complexos e Registro Formal/Técnico', 'Discutir temas abstratos com vocabulário erudito e estrutura sintática elaborada.', 'C2'),
(19, 'Análise Crítica, Literatura e Mídia Local', 'Interpretar artigos de opinião, literatura clássica/contemporânea, notícias complexas e discursos políticos.', 'C2')
ON DUPLICATE KEY UPDATE
title = VALUES(title),
goal = VALUES(goal),
level = VALUES(level);

DELETE FROM lesson_examples;

INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Hola, buenos días. Me llamo Juan.' FROM lessons WHERE lesson_number = 1;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Mucho gusto. ¿Cómo te llamas?' FROM lessons WHERE lesson_number = 1;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Por favor, gracias, de nada, disculpe.' FROM lessons WHERE lesson_number = 1;

INSERT INTO lesson_examples (lesson_id, example)
SELECT id, '¿Cómo se dice ''guardanapo'' en español?' FROM lessons WHERE lesson_number = 2;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'No entiendo, ¿puede hablar más despacio, por favor?' FROM lessons WHERE lesson_number = 2;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, '¿Habla portugués o inglés?' FROM lessons WHERE lesson_number = 2;

INSERT INTO lesson_examples (lesson_id, example)
SELECT id, '¿Dónde está el baño / la estación de metro?' FROM lessons WHERE lesson_number = 3;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, '¿Dónde queda el Hotel Plaza?' FROM lessons WHERE lesson_number = 3;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Siga recto y doble a la derecha.' FROM lessons WHERE lesson_number = 3;

INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Una mesa para dos personas, por favor.' FROM lessons WHERE lesson_number = 4;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Quisiera pedir una empanada de carne y un agua sin gas.' FROM lessons WHERE lesson_number = 4;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'La cuenta, por favor. ¿Puedo pagar con tarjeta?' FROM lessons WHERE lesson_number = 4;

INSERT INTO lesson_examples (lesson_id, example)
SELECT id, '¿Cuánto cuesta esto?' FROM lessons WHERE lesson_number = 5;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, '¿Tiene este talle / este tamaño?' FROM lessons WHERE lesson_number = 5;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Llevo dos kilos de manzanas.' FROM lessons WHERE lesson_number = 5;

INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Tengo una reserva a nombre de Carlos.' FROM lessons WHERE lesson_number = 6;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, '¿A qué hora sale el próximo autobús para Mendoza?' FROM lessons WHERE lesson_number = 6;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Necesito un taxi para ir al aeropuerto.' FROM lessons WHERE lesson_number = 6;

INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Me duele mucho la cabeza y tengo fiebre.' FROM lessons WHERE lesson_number = 7;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, '¿Tiene algún medicamento para la digestión?' FROM lessons WHERE lesson_number = 7;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Necesito llamar a una ambulancia / a la policía.' FROM lessons WHERE lesson_number = 7;

INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Prefiero visitar museos antes que ir de compras.' FROM lessons WHERE lesson_number = 8;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Me gusta la comida picante, pero a mi amigo no.' FROM lessons WHERE lesson_number = 8;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, '¿Qué me recomienda hacer por la tarde?' FROM lessons WHERE lesson_number = 8;

INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Ayer fuimos a Caminito y estuvo muy lindo.' FROM lessons WHERE lesson_number = 9;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Perdí mi tarjeta de crédito en el restaurante.' FROM lessons WHERE lesson_number = 9;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Llegamos tarde porque el vuelo se demoró.' FROM lessons WHERE lesson_number = 9;

INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Ayer fuimos a La Boca, pero cuando llegamos ya había cerrado el museo.' FROM lessons WHERE lesson_number = 10;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Cuando era chico, siempre viajaba con mi familia en auto.' FROM lessons WHERE lesson_number = 10;

INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'No creo que valga la pena pagar tanto por esa excursión.' FROM lessons WHERE lesson_number = 11;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Es importante que pruebes el asado antes de irte de Argentina.' FROM lessons WHERE lesson_number = 11;

INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Disculpe, pero la habitación no está limpia y la ducha no funciona.' FROM lessons WHERE lesson_number = 12;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Quisiera hablar con el encargado, la factura tiene un error.' FROM lessons WHERE lesson_number = 12;

INSERT INTO lesson_examples (lesson_id, example)
SELECT id, '¿Vos querés ir a tomar un café a la merienda?' FROM lessons WHERE lesson_number = 13;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Está re bueno este lugar, ¡qué copado! / Che, ¿me alcanzás la sal?' FROM lessons WHERE lesson_number = 13;

INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Si tuviéramos más tiempo, iríamos a Bariloche en tren.' FROM lessons WHERE lesson_number = 14;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Yo en tu lugar compraría los pasajes con anticipación.' FROM lessons WHERE lesson_number = 14;

INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Por un lado entiendo tu punto, pero por otro lado me parece muy costoso.' FROM lessons WHERE lesson_number = 15;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Sin embargo, habría que tener en cuenta el clima antes de decidir.' FROM lessons WHERE lesson_number = 15;

INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'No me vengas con cuentos, que nos conocemos todos.' FROM lessons WHERE lesson_number = 16;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Hizo un frío de locos, pero la pasamos de diez.' FROM lessons WHERE lesson_number = 16;

INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Estar en el horno con este tema.' FROM lessons WHERE lesson_number = 17;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Darle la vuelta a la tortilla cuando las cosas se complican.' FROM lessons WHERE lesson_number = 17;

INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'A raíz de los acontecimientos recientes, la perspectiva económica sigue siendo incierta.' FROM lessons WHERE lesson_number = 18;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Es menester considerar las implicancias culturales de esta medida.' FROM lessons WHERE lesson_number = 18;

INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'El análisis del editorial pone de manifiesto la polarización del discurso público.' FROM lessons WHERE lesson_number = 19;
INSERT INTO lesson_examples (lesson_id, example)
SELECT id, 'Más allá de las apariencias, la obra refleja la idiosincrasia de la época.' FROM lessons WHERE lesson_number = 19;
