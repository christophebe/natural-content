const diacritics = require('./lib/diacritics.js');

const WORD_SEPARATOR = ' ';
const STATEMENT_SEPARATOR = '##';

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
                      .replace(/[...]/g, `.${ STATEMENT_SEPARATOR }`)
                      .split(STATEMENT_SEPARATOR);
}

/**
 * removeSpecials - Remove specials caracters from a text
 *
 * @param  {string} text the text
 * @returns {string}     the same text without specials caracters
 */
function removeSpecials(text) {
  if (!text) {
    return '';
  }

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

  return result.trim();
}

/**
 * removeLineBreaks - Remove line breaks in a text
 *
 * @param  {type} text the text
 * @returns {type}     the text without line breaks
 */
function removeLineBreaks(text) {
  if (!text) {
    return '';
  }

  return text.replace(/(\r\n|\n|\r)/gm, '').trim();
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
    return words.filter((word) => word !== '');
  }

  // Remove empty string & stopwords

  const { stopwords } = require(`./lib/stopwords-${ language }`);

  return words.filter((word) => word !== '' && stopwords.indexOf(removeDiacritics(word)) === -1);
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

  const count = Math.max(0, words.length - n + 1);

  for (let i = 0; i < count; i++) {
    const slice = words.slice(i, i + n);

    // Convert the ngram array into a ngram string and add it in the result list
    result.push(slice.reduce((memo, word) => memo ? `${ memo } ${ word }` : word));
  }

  return result;
}

exports.getStatements = getStatements;

exports.removeSpecials = removeSpecials;

exports.removeDiacritics = removeDiacritics;

exports.removeLineBreaks = removeLineBreaks;

exports.getWords = getWords;

exports.getNgrams = getNgrams;
