const inquirer = require("inquirer");

const sharedflow = require("../operations/sharedflow");
const prompt = require("../common/prompt");

async function deploy() {
    let functionsMapping = {
        'Deploy to environment' : () => prompt.list('Proxy list:', proxyList, pickRevision),
        'Deployment report' :  () => proxyList?.forEach((proxy) => proxies.getDeployedRevision(proxy.name)),
    };

    return ;
}

async function extract() {
    let { sharedFlows: sharedflowList } = await sharedflow.getAll();

    let functionsMapping = {
        'Single sharedflow': (sharedflowList) => prompt.list('Sharedflows list:', sharedflowList, pickRevision),
        'All sharedflows':   (sharedflowList) => sharedflowList?.forEach((item) => sharedflow.getDeployedRevision(item.name)),
    };

    prompt.question("Choose an option:", functionsMapping, sharedflowList);
    return ;
}

async function pickRevision(sharedflowName) {

    let functionsMapping = {
        'Deployed revision': (sharedflowName) => sharedflow.getDeployedRevision(sharedflowName),
        'Choose revision':   (sharedflowName) => pickRevisionNumber(sharedflowName)
    };

    prompt.question("Choose an option:", functionsMapping, sharedflowName);
    
    return ;
}

async function pickRevisionNumber(sharedflowName) {
    let revisionList = await sharedflow.getRevisionList(sharedflowName);

    inquirer.prompt([
        {
            type: "list",
            name: "option",
            message: "Choose a revision:",
            choices:  revisionList.sort((a, b) => a - b)
        }
    ])
    .then((answer) => {
        sharedflow.getRevision(sharedflowName, answer.option, 'zip');
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
    deploy: deploy
}