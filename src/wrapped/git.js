const simplegit = require('simple-git');
const { promisify } = require('sb-promisify');

module.exports = {
  clone(...args) {
    const git = simplegit();
    return promisify(git.clone.bind(git))(...args);
  },
};

['log', 'fetch', 'tags'].forEach(m => {
  module.exports[m] = (repoPath, ...args) => {
    const git = simplegit();
    git.cwd(repoPath);
    return promisify(git[m].bind(git))(...args);
  };
});
