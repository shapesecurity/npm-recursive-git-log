npm-recursive-git-log
=====================

Generate a change log from git commits, including those of updated npm
dependencies, recursively. See [How Does It Work?](#how-does-it-work) for more info.

## Installation

```
npm install -g npm-recursive-git-log
```

or use it without installing via `npx` (available since `npm` 5.2.0)

```
npx npm-recursive-git-log [...args]
```

## CLI Usage

```
npm-recursive-git-log --from 10.0.0 --to 10.1.0 NPM-PACKAGE-NAME
```

* `--from` and `--to` are any published npm versions or dist-tags
* `--to` defaults to `latest`
* the positional parameter can also be given as `--package`
* `--format` may be specified as either `markdown` (the default) or `json`

### Sample Output

```sh
$ npm-recursive-git-log npm --from 5.5.0 --to 5.6.0
```

See the markdown-format [output example](./sample-output.md).

## API Usage

```js
let npmrgl = require('npm-recursive-git-log').default;
let changelog = await npmrgl('NPM-PACKAGE-NAME', '1.0.0', 'latest');
console.log(changelog);
```

The API returns a `Changelog` object of the form

```idl
interface Changelog {
  startPackageChange : DependencyChange;
  dependencyUpdates : [DependencyUpdate];
}

interface DependencyUpdate {
  pkg : string;
}

interface DependencyAddition extends DependencyUpdate {
  version : string;
}

interface DependencyChange extends DependencyUpdate {
  old : string;
  new : string;
  logEntries : [LogEntry];
}

interface DependencyDowngrade extends DependencyUpdate {
  old : string;
  new : string;
}

interface DependencyRemoval extends DependencyUpdate {
  version : string;
}

class LogEntry {
  hash : string;
  subject : string;
  author : string;
}
```

## How Does It Work?

npm-recursive-git-log clones the git repo (as specified in `package.json`) of a
package and searches for tags matching the given versions (or versions resolved
from dist-tags). If the repo does not have these tags, npm-recursive-git-log
instead uses the publish dates of the given versions of the package to bound
its git log output. As implied by the name, npm-recursive-git-log uses npm to
fetch the dependency list of the project as it was at the given versions, and
repeats this process recursively for all upgraded/added dependencies.

## License

    Copyright 2017 Shape Security, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
