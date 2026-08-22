import { Lesson } from "./lessons.types.js";

export const InitialLessons: Lesson[] = [
  {
    lessonNumber: 1,
    title: "Saudações, Apresentação e Cortesia",
    goal: "Cumprimentar, se apresentar e usar palavras de educação.",
    level: "A1",
    examples: [
      "Hola, buenos días. Me llamo Juan.",
      "Mucho gusto. ¿Cómo te llamas?",
      "Por favor, gracias, de nada, disculpe."
    ]
  },
  {
    lessonNumber: 2,
    title: "A Frase Coringa e Pedidos de Ajuda",
    goal: "Resolver dúvidas de idioma e pedir para falarem mais devagar.",
    level: "A1",
    examples: [
      "¿Cómo se dice 'guardanapo' en español?",
      "No entiendo, ¿puede hablar más despacio, por favor?",
      "¿Habla portugués o inglés?"
    ]
  }
];
