#!/usr/bin/env node
/* global process, __dirname */

var config = require('./config/config');
var callNextTick = require('call-next-tick');
var Twit = require('twit');
var waterfall = require('async-waterfall');
var createChronicler = require('basicset-chronicler').createChronicler;
var shouldReplyToTweet = require('./should-reply-to-tweet');
var ComposeKilwalaReply = require('./compose-kilwala-reply');

var dryRun = false;
if (process.argv.length > 2) {
  dryRun = process.argv[2].toLowerCase() == '--dry';
}

var chronicler = createChronicler({
  dbLocation: __dirname + '/data/kilwala-chronicler.db'
});

var composeKilwalaReply = ComposeKilwalaReply({
  db: chronicler.getLevelDB()
});

var twit = new Twit(config.twitter);
var streamOpts = {
  replies: 'all'
};
var stream = twit.stream('user', streamOpts);

stream.on('tweet', respondToTweet);
stream.on('error', logError);

function respondToTweet(tweet) {
  waterfall(
    [checkIfWeShouldReply, composeReply, postTweet, recordThatReplyHappened],
    wrapUp
  );

  function checkIfWeShouldReply(done) {
    var opts = {
      tweet: tweet,
      chronicler: chronicler
    };
    shouldReplyToTweet(opts, done);
  }

  function composeReply(done) {
    composeKilwalaReply(tweet, done);
  }

  function postTweet(text, done) {
    if (dryRun) {
      console.log('Would have tweeted:', text);
      var mockTweetData = {
        user: {
          id_str: 'mockuser'
        }
      };
      callNextTick(done, null, mockTweetData);
    } else {
      var body = {
        status: text,
        in_reply_to_status_id: tweet.id_str
      };
      twit.post('statuses/update', body, done);
    }
  }
}

function recordThatReplyHappened(tweetData, response, done) {
  var userId = tweetData.user.id_str;
  chronicler.recordThatUserWasRepliedTo(userId, done);
}

function wrapUp(error, data) {
  if (error) {
    console.log(error, error.stack);

    if (data) {
      console.log('data:', data);
    }
  }
}

function logError(error) {
  console.log(error);
}
