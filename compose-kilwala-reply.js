var moment = require('moment');
var probable = require('probable');

var magicTabLine = "Man, you're nosy. Here, take this.\n\n[Received 1 Magic Tab!]";

var smallTalkLines = [
  "Mountains're nice.",
  "This's the life."
];

function ComposeKilwalaReply(opts) {
  var db;

  if (opts.db) {
    db = opts.db;
  }

  function composeKilwalaReply(tweet, done) {
    var prefix = '@' + tweet.user.screen_name + ' ';

    db.get(getMagicTabDbKey(tweet), pickReply);

    function pickReply(error, lastTabDateString) {
      if (error) {
        if (error.type !== 'NotFoundError') {
          done(error);
        }
        else {
          replyWithMagicTab();
        }
      }
      else {
        var oneDayAgo = moment().subtract(1, 'day');
        var lastTabDate = moment(lastTabDateString);
        if (lastTabDate.isBefore(oneDayAgo)) {
          replyWithMagicTab();
        }
        else {
          done(null, prefix + probable.pickFromArray(smallTalkLines));
        }
      }
    }

    function replyWithMagicTab() {
      db.put(getMagicTabDbKey(tweet), (new Date()).toISOString(), sendTab);

      function sendTab(error) {
        if (error) {
          done(error);
        }
        else {
          done(null, prefix + magicTabLine);
        }
      }
    }
  }

  return composeKilwalaReply;
}

function getMagicTabDbKey(tweet) {
  return 'last-magic-tab-' + tweet.user.id_str;
}

module.exports = ComposeKilwalaReply;
