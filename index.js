var _         = require('underscore');

var stopwords = require("./lib/stopwords").stopwords;

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
 * @return an array of words (string)
 */
function getWords (text, withStopWords) {

  var words = text.replace(/[\n\r]/g, WORD_SEPARATOR)   // Convert end of line
                      .replace(/[\t]/g, EMPTY) // Remove Tabs
                      .replace(/&nbsp;/gi,'') // remove HTML entities, only non breaking space
                      .replace(/(<([^>]+)>)/ig,EMPTY)   // remove HTML tags
                      .replace(/[’«»'";:,.\/(\/)\/!\/?\\-]/g, WORD_SEPARATOR)  // Remove punctuations
                      .replace(/  +/g, WORD_SEPARATOR) // remove multiple spaces
                      .toLowerCase()
                      .split(WORD_SEPARATOR);

  // Remove numbers, empty string & stopwords
  if (withStopWords) {
      return _.filter(words, function(word){return (word !== '') &&  isNaN(word); });
  }
  else {
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
            // update the number of documents for this word
            stats.nbrDocsByWords[word] = stats.nbrDocsByWords[word] ? ++stats.nbrDocsByWords[word] : 1;

            // Calculate sum & register the tf for min & max computation
            if (stats.words[word] && stats.words[word].tfs) {
              stats.words[word].tfs.push(tfs[word]);
              stats.words[word].tfSum += tfs[word];
            }
            else {
              stats.words[word] = initWordStat(tfs[word]);
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
        var idf = Math.log(nbrDocs/stats.nbrDocsByWords[word]) + 1;
        tfIdf[word] = document.tfs[word] * idf;

        if (stats.words[word] && stats.words[word].tfIdfs && stats.words[word].idfs) {
          stats.words[word].tfIdfs.push(tfIdf[word]);
          stats.words[word].tfIdfSum += tfIdf[word];
          stats.words[word].idfs.push(idf);
          stats.words[word].idfSum += idf;
        }
    });

    document.tfIdf = tfIdf;
    return document;
}

function initWordStat(tf) {

    return {
      tfSum : tf,
      tfs : [tf],

      idfSum : 0,
      idfs : [],

      tfIdfSum : 0,
      tfIdfs : []

    };

}

/**
 *  Get the TF.IDF for each words found in several documents
 *
 * @param an arrays of String matching to the document content. It could be Text or HTML
 * @param ngrams cardinality (optional). Has to be > 0
 * @param True if the stop words are to be present in the corpus
 */
function getTfIdfs(documents, n, withStopWords) {

    var result = {};
    var stats = createEmptyStat();

    // Calculate the TF of each words for each docs
    var tfs = _.map(documents, function(document){ return getTf(getWords(document, withStopWords), n, stats);});

    // Calculate the tf.idf for each each docs & produce stats per word
    var data = _.map(tfs, function(docTfs) { return geTfIdf(docTfs, documents.length, stats );});

    // Calculate min, max, avg for tf, idf & tf.idf
    stats.words = _.mapObject(stats.words, function(word, key){
        word.tfMin = _.min(word.tfs);
        word.tfMax = _.max(word.tfs);
        word.tfAvg = word.tfSum / stats.nbrDocsByWords[key];

        word.idfMax = _.max(word.idfs);
        word.idfAvg = word.idfSum / stats.nbrDocsByWords[key];

        word.tfIdfMin = _.min(word.tfIdfs);
        word.tfIdfMax = _.max(word.tfIdfs);
        word.tfIdfAvg = word.tfIdfSum / stats.nbrDocsByWords[key];
        return word;
    });

    result.documents = data;
    result.numberOfDocs = documents.length;
    result.stats = stats;

    return result;
}

function createEmptyStat() {
     return {
       nbrDocsByWords : {},
       words : []
     };
}

exports.getStatements = getStatements;
exports.getWords = getWords;
exports.getNgrams = getNgrams;
exports.getTf = getTf;
exports.getTfIdfs = getTfIdfs;
