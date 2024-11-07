require('colors');
const Diff = require('diff');

const one = 'beep boop\ntest';
const other = 'beep boob blah\ntets';

const diff = Diff.diffChars(one, other);

diff?.forEach((part) => {
  // green for additions, red for deletions
  // grey for common parts
  const color = part.added ? 'green' :
    part.removed ? 'red' : 'white';
  process.stderr.write(part.value[color]);
});

console.log();







/*
const colors = require('colors');
const TextFileDiff = require('text-file-diff');

const m = new TextFileDiff.default({
  //compareFn: (line1, line2) => {return line1 > line2 ? 1 : (line1 < line2 ? -1 : 0);}
});

m.on('compared', (line1, line2, compareResult, lineReader1, lineReader2) => {
  // event triggered immediately after line comparison
  // but before +- event
});

m.on('-', line => {
  // when a line is in file1 but not in file2
  console.log('- ' + line);
});

m.on('+', line => {
  // when a line is in file2 but not in file1
  console.log('+ ' + line);
});

// run the diff
const folder1 = 'compare/folder1/b.txt'
const folder2 = 'compare/folder2/b.txt';
m.diff(folder1, folder2);
//m.diffStream(stream1, stream2)
*/








/*
var coolors = require('coolors');
console.log(coolors('My cool console log', {
    text: 'yellow',
    background: 'red',
    bold: true,
    underline: true,
    inverse: true,
    strikethrough: true
}));
*/








const colors = require('colors');
colors.setTheme({
  custom: ['red', 'bold']
});
 
console.log('test'.custom);








const fs = require('fs');
const path = require('path');
const dircompare = require('dir-compare');


colors.setTheme({
  removed: ['red', 'bgYellow', 'bold'],
  added: ['green', 'bgWhite', 'dim'],
  equal: ['random']
});


const options = { compareContent: true };
// Multiple compare strategy can be used simultaneously - compareSize, compareContent, compareDate, compareSymlink.
// If one comparison fails for a pair of files, they are considered distinct.
const path1 = 'compare/folder1'
const path2 = 'compare/folder2';

// Synchronous
const res = dircompare.compareSync(path1, path2, options)

// Asynchronous
dircompare.compare(path1, path2, options)
  .then(res => print(res))
  .catch(error => console.error(error));


function print(result) {
  console.log('Directories are %s', result.same ? 'identical' : 'different')

  console.log('Statistics - equal entries: %s, distinct entries: %s, left only entries: %s, right only entries: %s, differences: %s',
    result.equal, result.distinct, result.left, result.right, result.differences)

  result.diffSet?.forEach(dif => {
    console.log('Difference - file1: %s/%s, type1: %s, file2: %s/%s, type2: %s, state: %s',
      dif.path1, dif.name1, dif.type1, dif.path2, dif.name2, dif.type2, dif.state)

    if (dif.state === 'distinct') {


      console.log(`!= '${path.join(dif.path1, dif.name1)}' --> '${path.join(dif.path2, dif.name2)}'`['yellow']);
      const one = fs.readFileSync(path.join(dif.path1, dif.name1), { encoding: 'utf8', flag: 'r' })
      const other = fs.readFileSync(path.join(dif.path2, dif.name2), { encoding: 'utf8', flag: 'r' })

      const diff2 = Diff.diffWords(one, other);

      diff2?.forEach((part) => {
        // green for additions, red for deletions
        // white for common parts
        //console.log(part)
        const color = part.added ? 'added' :
          part.removed ? 'removed' : 'equal';
        /*if ((part.removed || part.added))*/ console.log(part.value[color]);
      });
    } else if (dif.state === 'left') {
        console.log(`-- ${path.join(dif.path1, dif.name1)}`['red']);
    } else if (dif.state === 'right') {
      console.log(`++ ${path.join(dif.path2, dif.name2)}`['green']);
    }
  });
}









const childprocess = require("child_process");

function runCommand(command) {
  return childprocess.exec(command, (error, stdout, stderr) => {
      return new Promise((resolve, reject) => {
          if (error) {
              reject(error);
          } else if (stderr) {
              reject(stderr);
          } else {
              resolve(stdout);
          }
      })
  });
}


var shell = require('shelljs');
shell.exec(`gcloud auth login`, {silent:true});
var accessToken = shell.exec(`gcloud auth print-access-token`, {silent:true});
console.log(accessToken.stdout);
console.log(accessToken.stderr);
