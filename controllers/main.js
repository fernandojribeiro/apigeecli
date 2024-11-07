const prompt = require("../common/prompt");
const globals = require("../common/globals");
const operations = require("../common/operations");
const colors = require('colors');

const {
    preDeploy,
    deployer
} = require("../operations/deploy");

const {
    sleep
} = require('../common/utils');

const apiDeploymentList = require('../../resources/deployments/apiproxies.json');

const sharedflowsDeploymentList = require('../../resources/deployments/sharedflows.json');

colors.setTheme({
    warning: ['red', 'bgYellow', 'bold'],
    info: ['green', 'bgWhite', 'bold']
});

/** Environment **/
async function setEnvironmentMenu(_, callback) {
    prompt.list("What is the direction of this environment?", ['Origin', 'Target'], (answer) => {
        setEnvironment(answer, callback);
    });
}

async function setEnvironment(direction, callback, showAll = false) {
    let envs = globals.getOrgEnvs();
    if (showAll) {
        let all = ['all'];
        all.push(...envs);
        envs = all;
    }

    prompt.list(`Choose the ${direction} environment:`, envs, (answer) => {
        let allEnvs = answer.toLowerCase() === 'all';
        if (!allEnvs) globals[`set${direction}Org`](globals.getEnvOrg(answer));
        if (!allEnvs) globals[`set${direction}Env`](answer);
        if (callback) callback(allEnvs);
    });
}

async function confirmEnvironment(direction, callback, showAll = false) {
    if (globals[`get${direction}Org`]() === undefined || globals[`get${direction}Env`]() === undefined) {
        console.warn(`${direction} environment is not defined, you must define one before executing this operation`);
        setEnvironment(direction, callback, showAll);
    } else {
        prompt.list(`${direction} environment is ${globals[`get${direction}Org`]()}:${globals[`get${direction}Env`]()}. Want to change?`, ['No', 'Yes'],
            (answer) => {
                if (answer.toLowerCase() === 'yes') {
                    setEnvironment(direction, callback, showAll);
                } else if (callback) {
                    callback();
                }
            });
    }
}


/** Audit **/
async function auditEnvironmentMenu(_, callback) {
    confirmEnvironment('Origin', () => confirmEnvironment('Target', () => auditEnvironments('all', callback, false)));
}

async function auditEnvironments(resource, callback, useLocalState) {
    if (resource.toLowerCase() === 'all') {
        let resources = globals.getResources();
        for (let i = 0; i < resources?.length; i++) {
            let resource = resources[i];
            if (resource.toLowerCase() !== 'all' && operations.getResourceAudit(resource)) {
                await (operations.getResourceAudit(resource))(useLocalState);
            }
        }
    } else {
        await (operations.getResourceAudit(resource))(useLocalState);
    }
    if (callback) callback();
}


/** Export **/
async function exportResourcesMenu(_, callback) {
    confirmEnvironment('Origin', (exportAllEnvs) => exportResources(callback, exportAllEnvs), true);
}

async function exportResources(callback, exportAllEnvs = false) {
    if (exportAllEnvs) {
        console.log(`Resources will be exported for all environments`);
        prompt.list(`What do you want export?`, globals.getResources(), (answer) => exportResourceAllEnv(answer, callback));
    } else {
        console.log(`Origin environment is ${globals.getOriginOrg()}:${globals.getOriginEnv()}.`);
        prompt.list(`What do you want export?`, globals.getResources(), (answer) => exportResource(answer, callback, [globals.getOriginOrg(), globals.getOriginEnv()]));
    }
}

async function exportResourceAllEnv(resource, callback) {
    let orgEnvs = globals.getOrgEnvs();
    for (let i = 0; i < orgEnvs?.length; i++) {
        let orgEnv = orgEnvs[i];
        await exportResource(resource, undefined, [globals.getOrg(orgEnv), globals.getEnv(orgEnv)]);
    }

    if (callback) callback();
}

async function exportResource(resource, callback, args) {
    if (resource.toLowerCase() === 'all') {
        let resources = globals.getResources();
        for (let i = 0; i < resources?.length; i++) {
            let resource = resources[i];
            if (resource.toLowerCase() !== 'all' && operations.getResourceExport(resource)) {
                await (operations.getResourceExport(resource))(...args);
            }
        }
    } else {
        await (operations.getResourceExport(resource))(...args);
    }
    if (callback) callback();
}


/** Deploy **/
async function deployResourcesMenu(_, callback) {
    let functionsMapping = {
        'Plan Deploy': planDeployResourcesMenu,
        'Apply Deploy': applyDeployResourcesMenu,
        'Sync Environment': syncEnvironmentResourcesMenu,
        'Clean Environment': cleanEnvironmentResourcesMenu
    };
    prompt.question("What do you want to do?", functionsMapping, callback);
}

async function planDeployResourcesMenu(_, callback) {
    console.log('INFO! This operation is going to: '.info);
    console.log(' - PLAN the deployment against the state files'.info);
    confirmEnvironment('Target', () => handleResources((answer) =>
        auditEnvironments(answer, callback, true)
    ));
}

async function applyDeployResourcesMenu(_, callback) {
    console.log('WARNING! This operation is going to: '.warning);
    console.log(' - PLAN the deployment against the state files'.warning);
    console.log(' - DEPLOY the state files to the selected environment'.warning);
    confirmEnvironment('Target', () => handleResources((answer) =>
        handleResource(answer, callback, true, false, [globals.getTargetOrg(), globals.getTargetEnv()])
    ));
}

async function syncEnvironmentResourcesMenu(_, callback) {
    console.log('WARNING! This operation is going to: '.warning);
    console.log(' - PLAN the sync against the state files'.warning);
    console.log(' - CLEAN all resources in the selected environment which are NOT IN the state files'.warning);
    confirmEnvironment('Target', () => handleResources((answer) =>
        handleResource(answer, callback, true, true, [globals.getTargetOrg(), globals.getTargetEnv()])
    ));
}

async function cleanEnvironmentResourcesMenu(_, callback) {
    console.log('WARNING! This operation is going to: '.warning);
    console.log(' - PLAN the clean against the state files'.warning);
    console.log(' - CLEAN all resources in the selected environment which are NOT IN the state files'.warning);
    confirmEnvironment('Target', () => handleResources((answer) =>
        handleResource(answer, callback, false, true, [globals.getTargetOrg(), globals.getTargetEnv()])
    ));
}

async function handleResources(callback) {
    console.log(`Target environment is ${globals.getTargetEnv()}:${globals.getTargetOrg()}.`);
    prompt.list(`What do you want deploy?`, globals.getResources(), callback);
}

async function handleResource(resource, callback, deployResources, deleteResources, args) {
    await auditEnvironments(resource, undefined, true);

    if (deployResources && deleteResources) {
        console.log("INFO: All changes (additions, updates and deletions) from state files will be deployed!".info)
    } else if (!deleteResources) {
        console.log("INFO: Only the changes and new items on state files will be deployed!".info)
    } else if (!deployResources) {
        console.log("INFO: Only the deleted items from state files will be removed!".info)
    } else {
        if (callback) callback(); 
    }

    prompt.list(`Want to proceed?`, ['No', 'Yes'],
        async (answer) => {
            if (answer.toLowerCase() === 'yes') {
                if (resource.toLowerCase() === 'all') {
                    let resources = globals.getResources();
                    for (let i = 0; i < resources?.length; i++) {
                        resource = resources[i];
                        if (resource.toLowerCase() !== 'all' && operations.getResourceDeploy(resource)) {
                            if (deployResources) await (operations.getResourceDeploy(resource))(...args);
                            if (deleteResources) await (operations.getResourceUndeploy(resource))(...args);
                        }
                    }
                } else {
                    if (deployResources) await (operations.getResourceDeploy(resource))(...args);
                    if (deleteResources) await (operations.getResourceUndeploy(resource))(...args);
                }
            }
            if (callback) callback();
    });
}








async function chooseDeploymentType(targetEnv) {
    const curEnv = getEnv();

    let functionsMapping = {
        'Proxies': async () => {
            Object.keys(apiDeploymentList)?.forEach((proxy) => {
                const revision = apiDeploymentList[proxy].revision;
                preDeploy(proxy, 'apis', revision.toString(), curEnv, targetEnv);
            })
            await sleep(3000);
            return confirmDeployment('apis', targetEnv);
        },
        'Sharedflows': async () => {
            Object.keys(sharedflowsDeploymentList)?.forEach((sharedflow) => {
                const revision = sharedflowsDeploymentList[sharedflow].revision;
                preDeploy(sharedflow, 'sharedflows', revision, curEnv, targetEnv);
            })
            await sleep(4000);
            return confirmDeployment('sharedflows', targetEnv);
        },
    };

    return await prompt.question("What you would like to deploy?", functionsMapping);
}

async function confirmDeployment(sResourceType, targetEnv) {

    sResourceType = sResourceType?.toLowerCase();
    const resources = (sResourceType === "apis" ? apiDeploymentList : sharedflowsDeploymentList);

    functionsMapping = {
        'Yes': () => Object.keys(resources)?.forEach((resource) => {
            const revision = resources[resource].revision;
            return deployer(resource, sResourceType, revision.toString(), targetEnv);
        }),
        'No': () => deployResourcesMenu()
    };

    return await prompt.question(`Confirm deployment to ${targetEnv}`, functionsMapping);
}

module.exports = {
    setEnvironment: setEnvironmentMenu,
    auditEnvironment: auditEnvironmentMenu,
    exportResources: exportResourcesMenu,
    deployResources: deployResourcesMenu
}