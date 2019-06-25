const assert = require('assert');
const natural = require('../index.js');

describe('Natural Content', () => {
  const documents = [
    'word1 word2 word3 word4 word5 word6. word7 word1 word8 word9 word10 word11 word6. word1 word12 word13. word1 word1 ',
    'word2 word7 word8 word9 word10 word7 word11 word7 word11 word11 word11 word11.',
    ' word7 word2 '
  ];

  const documentsFr = [
    'Les conditions d\'utilisations de l\'objet doivent se faire dans de bonnes conditions. Sinon l\'objet ne peut pas bien être utilisé.',
    'Les conditions d\'emploi de la chose doivent se faire dans de bonne condition. Sinon l\'objet n\'est pas utilisable.',
    'Pour éviter une mauvaise utilisation, les conditions d\'utilisations doivent être faite correctement.'
  ];

  it('Statements', () => {
    const stats = natural.getStatements('word1 word2 word3 word4 :word5 word6. word7 word1, word8 word9 word10 word11 word6. Question? Word1 word12 word13!...End text.');

    // console.log(stats);
    assert(stats.length === 5);

    // console.log(natural.getStatements(txt));
  });

  it('Special caracters', () => {
    const text = 'ceci est un texte en français ! sans caractères spéciaux !§($€) # 123 avant-hier';
    const result = natural.removeSpecials(text);

    assert(result === 'ceci est un texte en français sans caractères spéciaux avant hier');
  });

  it('apostrophe', () => {
    const text = 'ceci est un texte en français. l\'été sera chaud. Les conditions d\'utilisation de l\'objet';

    const result = natural.removeSpecials(text);

    assert(result === 'ceci est un texte en français l été sera chaud Les conditions d utilisation de l objet');
  });

  it('diacritics', () => {
    const text = 'ceci est un texte en français ! sans diacritiques çàoözęùô';
    const result = natural.removeDiacritics(text);

    assert(result === 'ceci est un texte en francais ! sans diacritiques caoozeuo');
  });

  it('Words', () => {
    let words = natural.getWords('word1 word2 word3 word4. le la sur word5, ça été bientôt & @\' $ 123', true);

    assert(words.length === 15);

    words = natural.getWords(natural.removeSpecials('word1 word2 word3 word4. le la sur word5, ça été bientôt & @\' $ 123'), true);

    // console.log("words", words);
    assert(words.length === 11);

    words = natural.getWords('word1 word2 word3 word4. le la sur word5 bientôt', false, 'fr');

    // console.log("words", words);
    assert(words.length === 5);

    words = natural.getWords('word1 word2 word3 1234 word4 156,78. le la sur word5', false, 'fr');

    // console.log(words);
    assert(words.length === 8);

    words = natural.getWords('l\'été sera chaud. Les conditions d\'utilisation de l\'objet', false, 'fr');
    assert(words.length === 4);

    words = natural.getWords('l\'été sera chaud. Les conditions d\'utilisation de l\'objet', true);
    assert(words.length === 11);
  });

  it('n-grams', () => {
    let grams = natural.getNgrams(natural.getWords('word1 word2 word3 word4. le la sur word5', true), 1);

    assert(grams.length === 8);
    assert(grams[3] === 'word4');

    grams = natural.getNgrams(natural.getWords('word1 word2 word3 word4. le la sur word5', true), 2);
    assert(grams.length === 7);
    assert(grams[1] === 'word2 word3');

    grams = natural.getNgrams(natural.getWords('word1 word2 word3 word4. le la sur word5', true), 3);
    assert(grams.length === 6);
    assert(grams[2] === 'word3 word4 le');

    grams = natural.getNgrams(natural.getWords('l\'été sera chaud. Les conditions d\'utilisation de l\'objet', false, 'fr'), 1);
    assert(grams.length === 4);
  });
});
