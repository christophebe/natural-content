
const diacritics = require('./lib/diacritics.js');

const WORD_SEPARATOR = ' ';
const STATEMENT_SEPARATOR = '##';
const EMPTY = '';

/**
  * getStatements - Get all statements from a text
  *
  * @param  {string} text the text from which we want to extract the statements
  * @returns {Array}      an array of statements
  */
function getStatements(text) {
  return text.replace(/[\n\r]/g, WORD_SEPARATOR) // Convert end of line
                      .replace(/[\t]/g, WORD_SEPARATOR) // Remove Tabs
                      .replace(/&nbsp;/gi, WORD_SEPARATOR)// remove HTML entities, only non breaking space
                      .replace(/(<([^>]+)>)/ig, WORD_SEPARATOR) // remove HTML tags
                      .replace(/  +/g, WORD_SEPARATOR) // remove multiple spaces
                      .replace(/[.]/g, `.${ STATEMENT_SEPARATOR }`)
                      .replace(/[!]/g, `!${ STATEMENT_SEPARATOR }`)
                      .replace(/[?]/g, `?${ STATEMENT_SEPARATOR }`)
                      .split(STATEMENT_SEPARATOR);
}

/**
 * removeSpecials - Remove specials caracters from a text
 *
 * @param  {string} text the text
 * @returns {string}     the same text without specials caracters
 */
function removeSpecials(text) {
  const cleanText = text.replace(/[\t]/g, WORD_SEPARATOR) // Remove Tabs
                      .replace(/[\n\r]/g, WORD_SEPARATOR)
                      .replace(/&nbsp;/gi, WORD_SEPARATOR)// remove HTML entities, only non breaking space
                      .replace(/(<([^>]+)>)/ig, WORD_SEPARATOR) // remove HTML tags
                      .replace(/[|&’«»'"\/(\/)\/!\/?\\-]/g, WORD_SEPARATOR);

  const lower = cleanText.toLowerCase();
  const upper = cleanText.toUpperCase();

  let result = '';

  for (let i = 0; i < lower.length; ++i) {
    if (lower[i] !== upper[i] || lower[i].trim() === '') {
      result += cleanText[i];
    }
  }

  // remove multiple spaces
  result = result.replace(/\s+/g, WORD_SEPARATOR);

  return result;
}

/**
  * removeDiacritics -  Remove all diacritics from a text
  *
  * @param  {string} text the text
  * @returns {string}     the same text without diacritics
  */
function removeDiacritics(text) {
  return diacritics.remove(text);
}

/**
 * Get all words from a Text
 * It removes diacritics & non alphanumeric caracters
 *
 * @param Text or HTML content (String)
 * @param True if the stop words are to be present in the corpus
 * @param the iso code for the target language
 * @returns an array of words (string)
 */

/**
 * getWords - Get all words from a Text
 *
 * @param  {string} text          the text
 * @param  {boolean} withStopWords if the stop words will be remove
 * @param  {string} language      language code (fr, en, ...)
 * @returns {string}              an array of words
 */
function getWords(text, withStopWords, language) {
  const words = text.replace(/[\n\r]/g, WORD_SEPARATOR) // Convert end of line
                      .replace(/[\t]/g, WORD_SEPARATOR) // Remove Tabs
                      .replace(/&nbsp;/gi, WORD_SEPARATOR) // remove HTML entities, only non breaking space
                      .replace(/(<([^>]+)>)/ig, WORD_SEPARATOR) // remove HTML tags
                      .replace(/['’«»";:,.\/(\/)\/!\/?\\-]/g, WORD_SEPARATOR) // Remove punctuations
                      .replace(/\s+/g, WORD_SEPARATOR) // remove multiple spaces
                      .toLowerCase()
                      .split(WORD_SEPARATOR);

  // Remove empty string
  if (withStopWords) {
    return _.filter(words, (word) => word !== '');
  }

  // Remove empty string & stopwords

  const { stopwords } = require(`./lib/stopwords-${ language }`);

  return _.filter(words, (word) => word !== '' && stopwords.indexOf(removeDiacritics(word)) === -1);
}

/**
 * Get all ngrams
 *
 * @param an array of words matching the content
 * @param the cardinality of the grams
 * @returns an array of ngrams value (string)
 */

/**
 * getNgrams - get an array of ngrams
 *
 * @param  {Array} words an array of word
 * @param  {number} n    number of words to build the ngram elements
 * @returns {Array}       an array of ngrams
 */
function getNgrams(words, n) {
  const result = [];

  const count = _.max([ 0, words.length - n + 1 ]);

  for (let i = 0; i < count; i++) {
    const slice = words.slice(i, i + n);

    // Convert the ngram array into a ngram string and add it in the result list
    result.push(_.reduce(slice, (memo, word) => memo ? `${ memo } ${ word }` : word));
  }

  return result;
}

/**
 * getTf - Get the term frequency (tf) of each word of a document
 *
 * @param  {string} words array of words (String) matching to the document content
 * @param  {number} n     cardinality of the ngrams (optional). Has to be > 0
 * @param  {object} stats the current stat aout the word or ngrams (could be null). This is used to compute the tf/idf
 * @returns {object}      F json structure :
 *    {
 *        count : an array of word with the number of occurence in the document (the array index matches to the word)
 *        tf    : an array of tf value of each word (the array index matches to the word)
 *        max   : the value of the most frequent word
 *    }
 */
function getTf(words, n, stats) {
  let ws = words;

  if (n && n > 1) {
    ws = getNgrams(words, n);
  }

  const count = _.countBy(ws, (word) => word);
  const max = _.max(count);
  const tfs = {};

  _.keys(count).forEach((word) => {
    // Calculate the tf for this word
    tfs[word] = count[word] / max;

    // Update stats
    if (stats) {
      // Calculate sum & register the tf for min & max computation
      if (stats.has(word) && stats.get(word).tfs) {
        const wordStat = stats.get(word);

        // update the number of documents for this word
        wordStat.nbrDocs++;

        // Add the tf in the list of all tfs for this word
        wordStat.tfs.push(tfs[word]);
        wordStat.tfSum += tfs[word];
      } else {
        const newWordStat = initWordStat(word, tfs[word]);

        stats.set(word, newWordStat);
      }
    }
  });

  return {
    count,
    tfs,
    max
  };
}

/**
  * geTfIdf - Get the tfIdf for each word of a document
  *
  * @param  {object} document the document represented by an term frequency array.
  * @param  {number} nbrDocs  the number of documents
  * @param  {object} stats    stats about the words for the full set of documents
  * @returns {object}         the tf/idf info for this document
  */
function geTfIdf(document, nbrDocs, stats) {
  const tfIdf = {};

  _.keys(document.tfs).forEach((word) => {
    const idf = Math.log(nbrDocs / stats.get(word).nbrDocs) + 1;

    tfIdf[word] = document.tfs[word] * idf;

    if (stats.has(word) && stats.get(word).tfIdfs && stats.get(word).idfs) {
      const wordStat = stats.get(word);

      wordStat.tfIdfs.push(tfIdf[word]);
      wordStat.tfIdfSum += tfIdf[word];
      wordStat.idfs.push(idf);
      wordStat.idfSum += idf;
    }
  });

  document.tfIdf = tfIdf;

  return document;
}

/**
 *  Get the TF.IDF for each words found in several documents
 *
 * @param an arrays of String matching to the document content. It could be Text or HTML
 * @param ngrams cardinality (optional). Has to be > 0
 * @param True if the stop words are to be present in the corpus
 */

/**
  * getTfIdfs - Get the TF.IDF for each words found in several documents
  *
  * @param  {Array} documents    arrays of String matching to the document content. It could be Text or HTML
  * @param  {number} n             ngram cardinality (optional). Has to be > 0
  * @param  {boolean} withStopWords if true, remove the stopwords
  * @param  {string} language      the language code (fr, en, ... )
  * @returns {object}              the tf/idf for each word/ngrams
  */
function getTfIdfs(documents, n, withStopWords, language) {
  const result = {};
  const stats = new Map();

  // Calculate the TF of each words for each docs
  const tfs = _.map(documents, (document) => getTf(getWords(document, withStopWords, language), n, stats));

  // Calculate the tf.idf for each each docs & produce stats per word
  const data = _.map(tfs, (docTfs) => geTfIdf(docTfs, documents.length, stats));

  // Calculate stats : min, max, avg for tf, idf & tf.idf
  for (const wordStat of stats.values()) {
    wordStat.tfMin = _.min(wordStat.tfs);
    wordStat.tfMax = _.max(wordStat.tfs);
    wordStat.tfAvg = wordStat.tfSum / wordStat.nbrDocs;

    wordStat.idfMax = _.max(wordStat.idfs);
    wordStat.idfAvg = wordStat.idfSum / wordStat.nbrDocs;

    wordStat.tfIdfMin = _.min(wordStat.tfIdfs);
    wordStat.tfIdfMax = _.max(wordStat.tfIdfs);
    wordStat.tfIdfAvg = wordStat.tfIdfSum / wordStat.nbrDocs;
  }

  result.documents = data;
  result.numberOfDocs = documents.length;
  result.stats = stats;

  return result;
}

/**
 * initWordStat - Create an new Stat object for one word
 *
 * @param  {string} word the word
 * @param  {number} tf   the tf value
 * @returns {object}     the stat about the word
 */
function initWordStat(word, tf) {
  return {
    word,
    nbrDocs: 1,
    tfSum: tf,
    tfs: [ tf ],

    idfSum: 0,
    idfs: [],

    tfIdfSum: 0,
    tfIdfs: []

  };
}

exports.getStatements = getStatements;

exports.removeSpecials = removeSpecials;

exports.removeDiacritics = removeDiacritics;

exports.getWords = getWords;

exports.getNgrams = getNgrams;

exports.getTf = getTf;

exports.getTfIdfs = getTfIdfs;
