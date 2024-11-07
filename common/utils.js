require("dotenv/config");

const fs = require('fs');
const path = require('path');
const diff = require('diff');
const colors = require('colors');
const shell = require('shelljs');
const dircompare = require('dir-compare');
const lockedSync = require('locked-sync');

colors.setTheme({
    removed: ['red', 'bgYellow', 'bold'],
    added: ['green', 'bgWhite', 'bold'],
    different: ['yellow', 'underline'],
    equal: ['white']
});

const sync = lockedSync();

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isArray(object) {
    return Array.isArray(object) || object.constructor === [].constructor;
}

function isJSON(object) {
    return object.constructor === ({}).constructor;
}

function tryParseJSON(data) {
    try {
        for (let i = 0; i < 5; i++) {
            data = JSON.parse(data);
        }
    } catch {
        return data;
    }
}

function tryStringifyJSON(object) {
    if (object === Object(object)) {
        return JSON.stringify(object);
    }
    return object;
}

function writeFile(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
}

function readFile(filePath) {
    return fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
}

function readFileAsync(filePath, callback) {
    return fs.readFile(filePath, { encoding: 'utf8', flag: 'r' }, callback);
}

function readDir(path) {
    return fs.readdirSync(path);
}

function readDirAsync(path, callback) {
    fs.readdir(path, callback);
}

function rmDir(path, options = { recursive: true }) {
    return fs.rmdirSync(path, options);
}

function runCommand(command, silent = false) {
    var output = shell.exec(command, { silent: true });

    if (!silent && output.stderr) {
        console.log(command);
        console.error(output.stderr);
    }

    return output;
}

async function cryptFile(filePath, cryptRegex, outputResult = true, contentType = "json") {
    let content = await decryptFile(filePath, cryptRegex, true, contentType, true);

    if (!content) {
        await encryptFile(filePath, cryptRegex);
    }

    if (outputResult && !content) {
        content = await decryptFile(filePath, cryptRegex, true, contentType);
    }

    return (outputResult && content) ? content : undefined;
}

async function encryptFile(filePath, encryptedRegex, contentType = "json") {
    await sync().then(end => {
        runCommand(`sops --encrypt --encrypted-regex "${encryptedRegex}" --input-type ${contentType} --gcp-kms ${process.env.GCP_KVM} --in-place ${filePath}`);
        end();
    });
}

async function decryptFile(filePath, unencryptedRegex, outputResult = true, contentType = "json", silent) {
    let output;
    await sync().then(end => {
        output = runCommand(`sops --decrypt --unencrypted-regex "${unencryptedRegex}" ${outputResult ? "" : "--in-place"} --output-type ${contentType} ${filePath}`, silent)?.stdout;
        end();
    });
    return output;
}

function diffChecker(object1, object2, type) {
    switch (type.toLowerCase()) {
        case 'json':
            return diff.diffJson(object1, object2);
            break;
        case 'words':
            return diff.diffWords(object1, object2);
            break;
        default:
            throw new Error(`Unsuported ${type} to check for differences`);
    }
}

function diffPrinter(compare) {
    for (let i = 0; i < compare?.length; i++) {
        let part = compare[i];

        // green for additions, red for deletions and white for common parts
        const color = part.added ? 'added' : part.removed ? 'removed' : 'equal';

        // only show differences
        if ((part.removed || part.added)) console.log(part.value[color]);
    }
    return compare;
}

function compare(object1, object2, name, type) {
    console.log()
    console.log("############################################################################################################")
    console.log(`##                                           ${name}`)
    console.log("############################################################################################################")


    switch (type.toLowerCase()) {
        case 'json':
            if (isJSON(object1) && isJSON(object2)) {
                let keys1 = Object.keys(object1);
                let keys2 = Object.keys(object2);
                for (let i = 0; i < keys1?.length; i++) {
                    let key = keys1[i];
                    if (keys2.includes(key)) {
                        let compare = diffChecker(object1[key], object2[key], 'json');
                        if (compare.filter((part) => part.removed || part.added)?.length) {
                            console.log(`!= ${key}`.different);
                            diffPrinter(compare);
                        }
                    } else {
                        console.log(`-- ${key}`.removed);
                        console.log(JSON.stringify(object1[key], undefined, 2).removed);
                    }
                }
                for (let i = 0; i < keys2?.length; i++) {
                    let key = keys2[i];
                    if (!keys1.includes(key)) {
                        console.log(`++ ${key}`.added);
                        console.log(JSON.stringify(object2[key], undefined, 2).added);
                    }
                }
            } else {
                throw new Error(`Objects to compare must be JSON, not Array`)
            }
            break;
        case 'file':
            // Multiple compare strategy can be used simultaneously - compareSize, compareContent, compareDate, compareSymlink.
            // If one comparison fails for a pair of files, they are considered distinct.
            const options = { compareContent: true };

            const result = dircompare.compareSync(object1, object2, options);

            for (let i = 0; i < result?.diffSet?.length; i++) {
                let diffset = result.diffSet[i];

                if (diffset.state === 'distinct') {
                    console.log(`!= ${path.join(diffset.path1, diffset.name1)} --> ${path.join(diffset.path2, diffset.name2)}`.different);
                    const file1 = readFile(path.join(diffset.path1, diffset.name1))
                    const file2 = readFile(path.join(diffset.path2, diffset.name2))
                    diffPrinter(diffChecker(file1, file2, 'words'));
                } else if (diffset.state === 'left') {
                    console.log(`-- ${path.join(diffset.path1, diffset.name1)}`.red);
                } else if (diffset.state === 'right') {
                    console.log(`++ ${path.join(diffset.path2, diffset.name2)}`.green);
                }
            }

            break;
        default:
            throw new Error(`Invalid ${type} to compare`);
    }
}

module.exports = {
    sleep: sleep,
    tryParseJSON: tryParseJSON,
    tryStringifyJSON: tryStringifyJSON,
    writeFile: writeFile,
    readFile: readFile,
    readFileAsync: readFileAsync,
    readDir: readDir,
    readDirAsync: readDirAsync,
    rmDir: rmDir,
    runCommand: runCommand,
    cryptFile: cryptFile,
    encryptFile: encryptFile,
    decryptFile: decryptFile,
    compare: compare
}