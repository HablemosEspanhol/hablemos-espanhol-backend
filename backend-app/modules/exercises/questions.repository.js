import fs from "fs/promises"
import Logger from "../../shared/Logger.js";
import WordLoader from "../../shared/services/WordLoader.js";
import { isMock } from "../../shared/config/cmd_args.js";

const model = "phi3:mini";
var url = "http://ollama:11434";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const File = (path) => {
  const update = async function (data) {
    await fs.writeFile(
      path,
      JSON.stringify(data, null, 2)
    )
  }

  const load = async function (defaultObject) {
    try {
      const fileContent = await fs.readFile(path, "utf-8");
      return JSON.parse(fileContent)
    } catch (error) {
      Logger.error("Erro ao carregar Perguntas: ", error);
      return defaultObject;
    }
  }

  return {
    update,
    load
  }
}

var questionsArray = [];
var filePath = "/app/data/questionsArray.json";
var filePathV2 = isMock ? './app/data/questionsArrayV2.json' : "/app/data/questionsArrayV2.json";

var fileV1 = File(filePath);
var fileV2 = File(filePathV2);

const AiRequest = (body) => {
  return fetch(url+"/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
}

async function loadDataFromDisc() {
  // questionsArray = await fileV1.load([]);
  questionFromWordCache = await fileV2.load({});
}

function getQuestions(amount) {
  var limit = questionsArray.length >= amount ? amount : questionsArray.length;
  var selectedQuestions = [];

  while (selectedQuestions.length < limit) {
    const questionIndex = Math.floor(Math.random() * questionsArray.length);
    const question = questionsArray[questionIndex];
    if (!selectedQuestions.includes(question)) {
      selectedQuestions.push(question);
    }
  }

  return selectedQuestions;
}

async function executeFetch() {
  Logger.info("[OLLAMA] Fazendo pooling de perguntas");
  const amountOfQuestionToPull = 3;
  const AiBody = {
    model,
    stream: false,
    format: "json",
    options: {
      num_predict: 150
    },
    prompt:

      `Retorne apenas JSON válido.

Formato:
[
  {"front": "palavra ou frase", "back": "resposta correta"}
]

Gere ${amountOfQuestionToPull} exercícios em espanhol para iniciantes. o front do card deve ser uma frase ou palavra em portugues ou espanhol e atrás a tradução. 
Se por exemplo, a frase do front for em portugues, a back deve ser em espanhol e se a front for em espanhol a de trás deve ser em portugues`

  };
  const ollamaResponse = await AiRequest(AiBody);
  const ollamaData = await ollamaResponse.json()
  const exercises = JSON.parse(ollamaData.response);

  if (exercises.cards) {
    Logger.info("exercises.cards[]", exercises.cards);
    questionsArray.push(...exercises.cards);
  } else if (exercises.length > 0) {
    Logger.info("exercises[]", exercises);
    for (const element of exercises) {
      questionsArray.push(element);
    }
  } else if (exercises.front) {
    Logger.info("{front, back}", exercises);
    questionsArray.push(exercises);
  } else {
    Logger.info("exercises{}", exercises);
    for (const key in exercises) {
      const element = exercises[key];
      questionsArray.push(element);
    }
  }

  Logger.info("questionsArray", questionsArray);
  await fileV1.update(questionsArray);
}

async function pollingQuestions() {
  if (isMock) return Promise.resolve();
  // await pollingQuestionsOld();
  await pollingQuestionsByLevel();
}

async function pollingQuestionsOld() {
  while (questionsArray.length < 25) {
    try {
      await executeFetch();
    } catch (error) {
      Logger.error("Erro ao fazer pooling das perguntas: ", error);
    }
  }
}

async function pollingQuestionsByLevel() {
  var niveis = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  var words = await WordLoader.loadAll();
  var from = "espanhol";
  var to = "português";

  for (let index = 0; index < niveis.length; index++) {
    const nivel = niveis[index];
    await checkIfNivelWasCreated(nivel);

    for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {

      var word = words[wordIndex];

      if (!questionFromWordCache[nivel][word]) {
        console.log(`-----------------------------------------------------------`);
        console.log(`Gerando Questões para a palavra ${word} no nivel ${nivel}`);
        console.log(`-----------------------------------------------------------`);
        var begin = Date.now();
        await generateQuestionsFromWord(
          word,
          nivel,
          from,
          to
        );
        var end = Date.now();
        var durationInMinutes = (end - begin) / 1000 / 60;

        console.log(`-----------------------------------------------------------`);
        console.log(`Geradas Questões para a palavra ${word} no nivel ${nivel}. Duração em minutos ${durationInMinutes}`);
        console.log(`-----------------------------------------------------------`);
         var delaySec = 30;
        Logger.info(`Aguardando ${delaySec} seg`)
        await delay(delaySec * 1000);
      }
    }
  }
}

async function generateQuestionsFromWord(word, nivel, idiomaFrase, idiomaTraducao) {

  if (questionFromWordCache[nivel][word]) {
    console.log(`Lendo palavra ${word} do cache`);
    return Promise.resolve(questionFromWordCache[nivel][word]);
  }

//   const prompt =
//     `<<<
// Gere exatamente 3 linhas.

// Cada linha deve conter:
// [frase em ${idiomaFrase}]; [tradução em ${idiomaTraducao}]

// Regras obrigatórias:
// - Use a palavra "${word}" em TODAS as frases
// - Nível ${nivel} (frases simples e curtas)
// - Apenas 1 tradução por frase
// - NÃO use "/" ou múltiplas opções
// - NÃO use explicações
// - NÃO use texto extra

// Formato EXATO (3 linhas):
// frase; tradução
// frase; tradução
// frase; tradução
// >>>`;

var prompt = `write 3 short phrases (limited to 80 chars) in ${idiomaFrase} with the word '${word}',  concat ';', concat the traslation in '${idiomaTraducao}'. each phrase need to be separed by breakline '\n'`;

  var consfigs = {
    model,
    stream: false,
    options: {
      temperature: 0,
      "top_p": 0.1,
      "repeat_penalty": 1.2
    },
    prompt,
  }

  console.log("PromptConfigs: ", consfigs);


  
  let parsed;
  let ollamaData;
  
  try {   
    
    const ollamaResponse = await AiRequest(consfigs);    
    ollamaData = await ollamaResponse.json()
    const response = ollamaData.response;

    console.log("Ollama response data:", response);

    if (!response.includes(";") || response.includes("}") || response.includes("{")) {
      throw new Error("resposta invalida: "+ ollamaData.response)      
    }

    var frases = response
      .split('\n')
      .filter(l => l.includes(';'))
      .map(x => {
          let [texto, traduccion] = x.replaceAll('"', "").split(';');
          traduccion = traduccion.split('/')[0].trim();
          texto = (texto.includes(".") ? texto.split(".")[1] : texto).trim();

          return {
            texto,
            traduccion
          }
        });
    parsed = {
      palavra: word,
      frases
    };
    console.log("Parsed CSV:", parsed);
  } catch (error) {
    console.error("Erro ao fazer parse da resposta:", error);
    console.error("Conteúdo bruto:", ollamaData);
    return null;

    // // Tentar extrair JSON do texto (caso tenha texto extra)
    // const jsonMatch = ollamaData.response.match(/\{[\s\S]*\}/);
    // if (jsonMatch) {
    //   try {
    //     parsed = JSON.parse(jsonMatch[0]);
    //     console.log("Parsed JSON extraído:", parsed);
    //   } catch (extractError) {
    //     console.error("Falha ao extrair JSON:", extractError);
    //     throw new Error(`Resposta inválida da IA: ${error.message}`);
    //   }
    // } else {
    //   throw new Error(`Resposta inválida da IA: ${error.message}`);
    // }
  }

  if (parsed.palavra === word) {
    questionFromWordCache[nivel][word] = parsed;
    await fileV2.update(questionFromWordCache);
  } else {
    console.warn(`Palavra no JSON (${parsed.palavra}) não corresponde à palavra solicitada (${word})`);
  }

  return parsed;
}

var questionFromWordCache = {}

async function checkIfNivelWasCreated(nivel) {
  if (!questionFromWordCache[nivel]) {
    questionFromWordCache[nivel] = {};
    await fileV2.update(questionFromWordCache);
  }
}

async function generateQuestionsFromWords(words, nivel) {
  const limite = 3; // 👈 ajuste (2-4 ideal pra Ollama local)
  const resultados = [];
  let index = 0;

  await checkIfNivelWasCreated(nivel);

  async function worker() {
    while (index < words.length) {
      const i = index++;
      try {
        resultados[i] = await generateQuestionsFromWord(
          words[i],
          nivel,
          "spanish",
          "portuguese"
        );
      } catch (err) {
        resultados[i] = { error: err.message };
      }
    }
  }

  const workers = Array.from({ length: limite }, worker);
  await Promise.all(workers);

  return resultados;
}

function getPhrasesForExercises(level, amount, wordsToReview = []) {
  const allPhrases = [];

  const appendLevel = (lvl) => {
    if (!questionFromWordCache[lvl]) {
      return;
    }
    for (const word in questionFromWordCache[lvl]) {
      const data = questionFromWordCache[lvl][word];
      if (data.frases) {
        data.frases.forEach(frase => {
          allPhrases.push({
            palavra: data.palavra,
            texto: frase.texto,
            traduccion: frase.traduccion
          });
        });
      }
    }
  };

  appendLevel(level);

  console.log("allPhrases", allPhrases);

  if (allPhrases.length < amount) {
    Object.keys(questionFromWordCache).forEach(otherLevel => {
      if (otherLevel !== level) {
        appendLevel(otherLevel);
      }
    });
  }

  const filtered = allPhrases.filter(phrase =>
    phrase &&
    typeof phrase.texto === 'string' && phrase.texto.trim() &&
    typeof phrase.traduccion === 'string' && phrase.traduccion.trim()
  );

  console.log("filtered", filtered);
  const phrasesByWord = new Map();
  for (const phrase of filtered) {
    if (!phrasesByWord.has(phrase.palavra)) {
      phrasesByWord.set(phrase.palavra, []);
    }
    phrasesByWord.get(phrase.palavra).push(phrase);
  }

  console.log("phrasesByWord", phrasesByWord);

  const shuffle = (phrases) => [...phrases].sort(() => Math.random() - 0.5);
  const shuffled = shuffle(filtered);
  const selected = [];
  const seen = new Set();

  for (const word of wordsToReview) {
    if (selected.length >= amount) {
      break;
    }

    const candidates = shuffle(phrasesByWord.get(word.phrase) || []);
    const filteredPhrase = candidates.find(candidate => {
      const key = `${candidate.texto}-${candidate.traduccion}`;
      return !seen.has(key);
    });

    if (filteredPhrase) {
      const key = `${filteredPhrase.texto}-${filteredPhrase.traduccion}`;
      if (!seen.has(key)) {
        seen.add(key);
        selected.push(filteredPhrase);
      }
    }
  }

  for (const phrase of shuffled) {
    if (selected.length >= amount) break;
    const key = `${phrase.texto}-${phrase.traduccion}`;
    if (!seen.has(key)) {
      seen.add(key);
      selected.push(phrase);
    }
  }

  return selected;
}

function getAllPhrasesForLevel(level) {
  const phrases = [];
  if (!questionFromWordCache[level]) {
    return phrases;
  }

  for (const word in questionFromWordCache[level]) {
    const data = questionFromWordCache[level][word];
    if (data.frases && Array.isArray(data.frases)) {
      data.frases.forEach((frase, index) => {
        phrases.push({
          id: `${level}-${word}-${index}`,
          palavra: data.palavra,
          texto: frase.texto,
          traduccion: frase.traduccion,
          nivel: level
        });
      });
    }
  }

  return phrases;
}

function QuestionsRepository() {
  return {
    model,
    setUrl: (newUrl)=> url = newUrl,
    getQuestions,
    pollingQuestions,
    generateQuestionsFromWords,
    getPhrasesForExercises,
    getAllPhrasesForLevel,
    loadDataFromDisc
  }
}

export default QuestionsRepository();
