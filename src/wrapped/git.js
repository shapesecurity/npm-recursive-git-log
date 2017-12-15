const { promisify } = require('sb-promisify');
const _git = require('simple-git')();
_git.silent(true);
module.exports = {
  cwd: _git.cwd.bind(_git),
  clone: promisify(_git.clone.bind(_git)),
  log: promisify(_git.log.bind(_git)),
  fetch: promisify(_git.fetch.bind(_git)),
  tags: promisify(_git.tags.bind(_git)),
};
