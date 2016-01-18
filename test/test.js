var assert     = require("assert");
var _          = require("underscore");
var natural    = require("../index.js");


describe("Natural Content", function() {
        var documents = [
            "word1 word2 word3 word4 word5 word6. word7 word1 word8 word9 word10 word11 word6. word1 word12 word13. word1 word1 ",
            "word2 word7 word8 word9 word10 word7 word11 word7 word11 word11 word11 word11.",
            " word7 word2 "  ];

        it('Statements', function() {
              var stats = natural.getStatements("word1 word2 word3 word4 :word5 word6. word7 word1, word8 word9 word10 word11 word6. word1 word12 word13");
              assert(stats.length === 3);

        });


        it('Words', function() {
          var words = natural.getWords("word1 word2 word3 word4. le la sur word5", true);
          assert(words.length === 8);

          words = natural.getWords("word1 word2 word3 word4. le la sur word5", false);
          console.log("words", words);
          assert(words.length === 5);

          words = natural.getWords("word1 word2 word3 1234 word4 156,78. le la sur word5", false);
          console.log(words);
          assert(words.length === 5);

        });

        it('n-grams', function() {
          var grams = natural.getNgrams(natural.getWords("word1 word2 word3 word4. le la sur word5", true), 1);
          assert(grams.length === 8);
          assert(grams[3] === "word4");

          grams = natural.getNgrams(natural.getWords("word1 word2 word3 word4. le la sur word5", true), 2);
          assert(grams.length === 7);
          assert(grams[1] === "word2 word3");

          grams = natural.getNgrams(natural.getWords("word1 word2 word3 word4. le la sur word5", true), 3);
          assert(grams.length === 6);
          assert(grams[2] === "word3 word4 le");

        });

        it("term frequency", function(){
            var info = natural.getTf(natural.getWords(documents[0]));
            //console.log(info);
            assert(info.max === 5);
            assert(info.count.word1 === 5);
            assert(info.count.word6 === 2);
            assert(info.tfs.word1 === 1);
            assert(info.tfs.word2 === 0.2);
            assert(info.tfs.word6 === 0.4);

        });


        it("tf.idf for a set of document ", function(){

            var info = natural.getTfIdfs(documents, 1, false);
            //console.log(info);
            //console.log(info.stats.words['word7']);
            console.log("Word,TF Avg,TF Min,TF Max,IDF Avg,TF.IDF Sum,TF.IDF Avg");
            _.keys(info.stats.words).forEach(function(word) {
              //console.log(">> ", info.stats.words[word]);
              console.log(word + "," + info.stats.words[word].tfAvg + "," + info.stats.words[word].tfMin + "," + info.stats.words[word].tfMax + "," +
                          info.stats.words[word].idfAvg  + ',' + info.stats.words[word].tfIdfSum + ',' + info.stats.words[word].tfIdfAvg);
            });

        });

        //geTfId(document, nbrDocsByWords, nbrDocs, stats)

});
