import fs from 'fs/promises';

async function loadAll() {
     const filePath = './1000-palavras.md';
    const data = await fs.readFile(filePath, 'utf-8');
    return data.split('\n').map(l => l.trim())
        .filter(l => l.length > 0)
        .map(x=> x.split("_")[1].split('-')[0].trim());
}

async function load(quantidade) {

    var linhas  = loadAll();

    const total = linhas.length;

    quantidade = Math.min(quantidade, total);

    const indices = new Set();

    while (indices.size < quantidade) {
        const randomIndex = Math.floor(Math.random() * total);
        indices.add(randomIndex);
    }

    return [...indices].map(i => linhas[i]);
}

const WordLoader = {
    load,
    loadAll
}

export default WordLoader;