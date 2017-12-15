const semver = require('semver');
const mktemp = require('mktemp');
const rootdir = require('app-root-path');
const npmLoader = require('./wrapped/npm.js');
const git = require('./wrapped/git.js');
const fs = require('fs-extra');
let npm;

const {
  Changelog,
  DependencyAddition,
  DependencyChange,
  DependencyDowngrade,
  DependencyRemoval,
  LogEntry,
  StartPackageChange,
} = require('./data.js');


const DEBUG = !!process.env.DEBUG;
const NPM_CONFIG = {};
const LOG_FORMAT = { hash: '%H', subject: '%s', author: '%an' };
const CACHE_DIR = `${rootdir}/.gitcache`;

function lastValue(obj) {
  return obj[Object.keys(obj).slice(-1)[0]];
}

function flattenArray(arrayLike) {
  return [].concat.apply([], arrayLike);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString();
}


function dedupe(versionPairsWithNull) {
  if (versionPairsWithNull.length < 2) return versionPairsWithNull;
  let sorted = versionPairsWithNull.slice().sort((a, b) =>
    a[0] == null
      ? (b[1] == null ? -1 : (semver.lt(a[1], b[1]) ? -1 : 1))
      : (b[0] == null ? 1 : (semver.lt(a[0], b[0]) ? -1 : 1))
  );
  let current = sorted[0];
  let out = [current];
  for (let pair of sorted) {
    if (current[0] !== pair[0] || current[1] !== pair[1]) {
      current = pair;
      out.push(current);
    }
  }
  return out;
}

function flatten(versionPairs) {
  let addedOrRemoved = versionPairs.filter(([a, b]) => a == null || b == null);
  let changed = versionPairs
    .filter(([a, b]) => a != null && b != null)
    .sort(([a], [b]) => semver.lt(a, b) ? -1 : 1);
  let out = dedupe(addedOrRemoved);
  for (let i = 0; i < changed.length; ++i) {
    let current = changed[i].slice();
    for (let j = i + 1; j < changed.length && semver.lt(changed[j][0], current[1]); ++j) {
      current[1] = changed[j][1];
      i = j;
    }
    out.push(current);
  }
  return out;
}

function combine(depDescA, depDescB) {
  let combined = {};
  for (let dep of Object.keys(depDescA).concat(Object.keys(depDescB))) {
    let dA = depDescA[dep], dB = depDescB[dep];
    combined[dep] = dA == null ? dB : dB == null ? dA : flatten(dA.concat(dB));
  }
  return combined;
}

async function resolve(dep, versionSpec) {
  if (DEBUG) {
    console.error(`Resolving version spec for ${dep}@${versionSpec}`);
  }
  return lastValue(await npm.view(`${dep}@${versionSpec}`, 'version')).version;
}

async function compare(from, to) {
  let memo = {};
  for (let dep of Object.keys(from).concat(Object.keys(to))) {
    if ({}.hasOwnProperty.call(memo, dep)) continue;
    let f = from[dep] == null ? null : await resolve(dep, from[dep]);
    let t = to[dep] == null ? null : await resolve(dep, to[dep]);
    memo[dep] = f === t ? [] : [[f, t]];
  }
  return memo;
}

async function getDeps(pkg, version) {
  if (DEBUG) {
    console.error(`Finding dependencies for ${pkg}@${version}`);
  }
  let depsWrapper = await npm.view(`${pkg}@${version}`, 'dependencies');
  if (depsWrapper == null) return {};
  depsWrapper = lastValue(depsWrapper);
  if (depsWrapper == null) return {};
  let deps = depsWrapper.dependencies;
  return deps == null ? {} : deps;
}

// TODO: check for circular dependencies so we don't recurse forever
async function recurse(pkg, from, to) {
  let diff = await compare(await getDeps(pkg, from), await getDeps(pkg, to));
  let depDiffs = await Promise.all(flattenArray(Object.keys(diff).map(dep =>
    diff[dep]
      .filter(([f, t]) => f != null && t != null)
      .map(([f, t]) => recurse(dep, f, t))
  )));
  return depDiffs.reduce(combine, diff);
}

async function getGitLogLines(pkg, from, to) {
  let repoDetails = await npm.view(pkg, 'repository');
  if (repoDetails == null || Object.keys(repoDetails).length < 1) {
    throw new Error(`no "repository" field in ${pkg}`);
  }
  repoDetails = lastValue(repoDetails).repository;
  if (repoDetails.type != null && repoDetails.type !== 'git') {
    throw new Error(`unsupported repository type ${JSON.stringify(repoDetails.type)} in ${pkg}`);
  }
  if (repoDetails.url == null) {
    throw new Error(`no repository URL in ${pkg}`);
  }
  let repoUrl = repoDetails.url.replace(
    /^(?:git@|(?:git\+)?https?:\/\/)([^/:]+)[/:]([^/]+)\/([^/]+\.git)$/i,
    (all, host, org, repo) => `https://${host}/${org}/${repo}`
  );

  let cacheDir = `${CACHE_DIR}/${pkg}`;
  let usingCache = await fs.exists(cacheDir);
  await fs.mkdirp(cacheDir);
  let tempDir = await mktemp.createDir(`${cacheDir}.XXXXXXXXXXXX`);
  try {
    if (usingCache) {
      if (DEBUG) {
        console.error(`Using cached clone of ${pkg}`);
      }
      await fs.copy(cacheDir, tempDir);
      await git.fetch(tempDir);
    } else {
      if (DEBUG) {
        console.error(`Cloning ${pkg} into ${cacheDir}`);
      }
      await git.clone(repoUrl, tempDir);
      await git.fetch(tempDir);
    }
    try {
      await fs.move(tempDir, cacheDir, { overwrite: true });
    } catch (unused) {}
  } finally {
    try {
      await fs.remove(tempDir);
    } catch (unused) {}
  }

  let versionTags = (await git.tags(cacheDir)).all;
  let fromTag = `v${from}`, toTag = `v${to}`;
  let hasFromTag = versionTags.includes(fromTag);
  if (!hasFromTag) {
    fromTag = from;
    hasFromTag = versionTags.includes(fromTag);
  }
  let hasToTag = versionTags.includes(toTag);
  if (!hasToTag) {
    toTag = to;
    hasToTag = versionTags.includes(toTag);
  }
  if (hasFromTag && hasToTag) {
    // console.log(`cd ${JSON.stringify(cacheDir)}; git log "refs/tags/${fromTag}..refs/tags/${toTag}"`);
    return (await git.log(cacheDir, {
      from: `refs/tags/${fromTag}`,
      to: `refs/tags/${toTag}`,
      format: LOG_FORMAT,
    })).all;
  }
  let times = lastValue(await npm.view(pkg, 'time')).time;
  if (DEBUG) {
    let msg = hasFromTag
      ? `git tag for version ${to}`
      : hasToTag
        ? `git tag for version ${from}`
        : `git tags for versions ${from} or ${to}`;
    console.error(`Could not find ${msg} of ${pkg}. Falling back to publish dates: ${formatDate(times[from])} to ${formatDate(times[to])}.`);
  }
  // console.log(`cd ${JSON.stringify(cacheDir)}; git log --after ${JSON.stringify(times[from])} --before ${JSON.stringify(times[to])}`);
  return (await git.log(cacheDir, {
    '--after': times[from],
    '--before': times[to],
    format: LOG_FORMAT,
  })).all;
}

exports.default = async function (START_PACKAGE, FROM, TO) {
  if (npm == null) npm = await npmLoader.default(NPM_CONFIG);

  if (/^\./.test(START_PACKAGE)) {
    START_PACKAGE = JSON.parse(await fs.readFile(START_PACKAGE + '/package.json')).name;
  }

  let startFrom = await resolve(START_PACKAGE, FROM);
  let startTo = await resolve(START_PACKAGE, TO);
  let startPkgLogEntries = (await getGitLogLines(START_PACKAGE, startFrom, startTo)).map(e => new LogEntry(e));
  let startPkgChanged = new StartPackageChange(START_PACKAGE, startFrom, startTo, startPkgLogEntries);

  let depDiffs = await recurse(START_PACKAGE, FROM, TO);

  let dependencyChanges = [];
  for (let dep of Object.keys(depDiffs).sort()) {
    for (let [from, to] of depDiffs[dep]) {
      if (from == null) {
        dependencyChanges.push(new DependencyAddition(dep, to));
      } else if (to == null) {
        dependencyChanges.push(new DependencyRemoval(dep, from));
      } else if (semver.lt(from, to)) {
        let logEntries = (await getGitLogLines(dep, from, to)).map(e => new LogEntry(e));
        dependencyChanges.push(new DependencyChange(dep, from, to, logEntries));
      } else {
        dependencyChanges.push(new DependencyDowngrade(dep, from, to));
      }
    }
  }

  return new Changelog(startPkgChanged, dependencyChanges);
};
