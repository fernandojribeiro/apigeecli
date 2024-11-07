const inquirer = require("inquirer");
const proxiesAPI = require("../operations/proxy");
const prompt = require("../common/prompt");

async function extract() {
    let { proxies: proxyList } = await proxiesAPI.getAll();

    let functionsMapping = {
        'Single proxy' : (proxyList) => prompt.list('Proxy list:', proxyList, pickRevision),
        'All proxies' :  (proxyList) => proxyList?.forEach((proxy) => proxiesAPI.getDeployedRevision(proxy.name)),
    };

    prompt.question("Choose an option:", functionsMapping, proxyList)
      
    return ;
}

async function pickRevision(proxyName) {
  let functionsMapping = {
    "Deployed revision": (proxyName) => proxiesAPI.getDeployedRevision(proxyName),
    "Choose revision": (proxyName) => pickRevisionNumber(proxyName),
  };

  prompt
    .question("Choose an option:", functionsMapping, proxyName)
    .finally(() => close());

  return;
}

async function pickRevisionNumber(proxyName) {
    let revisionList = await proxiesAPI.getRevisionList(proxyName);

    inquirer.prompt([
        {
            type: "list",
            name: "option",
            message: "Choose a revision:",
            choices:  revisionList.sort((a, b) => a - b)
        }
    ])
    .then((answer) => {
        proxiesAPI.getRevision(proxyName, answer.option, 'zip');
        return close();
    });
}


async function close(){
    let functionsMapping = {
        'Continue extracting': extract,
        'Close tool': () => process.exit(0)
    };

    prompt.question("Choose an option:", functionsMapping);
    return ;
}


module.exports = {
    extract: extract,
}