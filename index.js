var _  = require('underscore');

var WORD_SEPARATOR = " ";
var STATEMENT_SEPARATOR = "##";
var EMPTY = "";


/**
 *  Get all statements
 *
 * @param Text or HTML content (String)
 * @return an array of statements
 */
 function getStatements (text) {
  return text.replace(/[\n\r]/g, WORD_SEPARATOR)   // Convert end of line
                      .replace(/[\t]/g, EMPTY) // Remove Tabs
                      .replace(/&nbsp;/gi,'')// remove HTML entities, only non breaking space
                      .replace(/(<([^>]+)>)/ig,EMPTY)   // remove HTML tags
                      .replace(/  +/g, WORD_SEPARATOR) // remove multiple spaces
                      .replace(/[.]/g, "." + STATEMENT_SEPARATOR)
                      .replace(/[!]/g, "!" + STATEMENT_SEPARATOR)
                      .replace(/[?]/g, "?" + STATEMENT_SEPARATOR)
                      .split(STATEMENT_SEPARATOR);
}

/**
 * Get all words
 *
 * @param Text or HTML content (String)
 * @param True if the stop words are to be present in the corpus
 * @param the iso code for the target language
 * @return an array of words (string)
 */
function getWords (text, withStopWords, language) {

  var words = text.replace(/[\n\r]/g, WORD_SEPARATOR)   // Convert end of line
                      .replace(/[\t]/g, EMPTY) // Remove Tabs
                      .replace(/&nbsp;/gi,'') // remove HTML entities, only non breaking space
                      .replace(/(<([^>]+)>)/ig,EMPTY)   // remove HTML tags
                      .replace(/[’«»'";:,.\/(\/)\/!\/?\\-]/g, WORD_SEPARATOR)  // Remove punctuations
                      .replace(/[\W_]+/g," ") // Remove non alphanumeric char
                      .replace(/  +/g, WORD_SEPARATOR) // remove multiple spaces
                      .toLowerCase()
                      .split(WORD_SEPARATOR);

  // Remove empty string & numbers
  if (withStopWords) {
      return _.filter(words, function(word){return (word !== '') &&  isNaN(word); });
  }
  // Remove empty string, numbers & stopwords
  else {
      var stopwords = require("./lib/stopwords-" + language).stopwords;
      return _.filter(words, function(word){return (word !== '' && isNaN(word) && stopwords.indexOf(word) === -1); });
  }

}

/**
 * Get all ngrams
 *
 * @param an array of words matching the content
 * @param the cardinality of the grams
 * @return an array of ngrams value (string)
 */
 function getNgrams(words, n) {
    var result = [];

    var count = _.max([0, words.length - n + 1]);
    for (var i = 0; i < count; i++) {
        var slice =  words.slice(i, i + n);
        // Convert the ngram array into a ngram string and add it in the result list
        result.push(_.reduce(slice, function(memo, word){ return (memo ? memo + " " + word : word);}));
    }
    return result;
}

/**
 * Get the term frequency (tf) of each word of a document
 *
 * @param an array of words (String) matching to the document content.
 * @param ngrams cardinality (optional). Has to be > 0
 * @param number  of documents for each word (optional). Those value can be used later for the IDF computation
 * @return a TF json structure :
 *    {
 *        count : an array of word with the number of occurence in the document (the array index matches to the word)
 *        tf    : an array of tf value of each word (the array index matches to the word)
 *        max   : the value of the most frequent word
 *    }
 */
function getTf(words, n, stats) {

    var ws = words;
    if (n && n > 1) {
      ws = getNgrams(words, n);
    }
    var count = _.countBy(ws, function(word) { return word; });
    var max = _.max(count);
    var tfs = {};

    _.keys(count).forEach(function(word) {

        // Calculate the tf for this word
        tfs[word] = count[word]/max;

        // Update stats
        if (stats) {

            // Calculate sum & register the tf for min & max computation
            if (stats.has(word) && stats.get(word).tfs) {
                var wordStat = stats.get(word);
                // update the number of documents for this word
                wordStat.nbrDocs++ ;

                // Add the tf in the list of all tfs for this word
                wordStat.tfs.push(tfs[word]);
                wordStat.tfSum += tfs[word];
            }
            else {
                var newWordStat = initWordStat(word, tfs[word]);
                stats.set(word, newWordStat);
            }
        }

    });

    return {
      count : count,
      tfs : tfs,
      max : max
    };

}


/**
 * Get the tfIdf for each word of a document
 *
 *
 * @param the document represented by an term frequency array.
 *        the function getTf can be used for generating the term frequency array
 * @param the number of document per word (index = word)
 * @param the number of documents
 * @param the stats about the words for the full set of documents
 * @return
 */
function geTfIdf(document, nbrDocs, stats) {

    var tfIdf = {};
    _.keys(document.tfs).forEach(function(word) {
        var idf = Math.log(nbrDocs/stats.get(word).nbrDocs) + 1;
        tfIdf[word] = document.tfs[word] * idf;

        if (stats.has(word) && stats.get(word).tfIdfs &&  stats.get(word).idfs) {
            var wordStat = stats.get(word);

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
function getTfIdfs(documents, n, withStopWords, language) {

    var result = {};
    var stats = new Map();

    // Calculate the TF of each words for each docs
    var tfs = _.map(documents, function(document){ return getTf(getWords(document, withStopWords, language), n, stats);});

    // Calculate the tf.idf for each each docs & produce stats per word
    var data = _.map(tfs, function(docTfs) { return geTfIdf(docTfs, documents.length, stats );});

    // Calculate stats : min, max, avg for tf, idf & tf.idf
    for (var wordStat of stats.values()) {

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
 *  Create an new Stat object for one word
 *
 */
function initWordStat(word,  tf) {

    return {
      word : word,
      nbrDocs : 1,
      tfSum : tf,
      tfs : [tf],

      idfSum : 0,
      idfs : [],

      tfIdfSum : 0,
      tfIdfs : []

    };

}

exports.getStatements = getStatements;
exports.getWords = getWords;
exports.getNgrams = getNgrams;
exports.getTf = getTf;
exports.getTfIdfs = getTfIdfs;
