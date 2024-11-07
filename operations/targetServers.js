const path = require("path");
const lodash = require('lodash');
const crypto = require('crypto');

const {
    apigeeapi
} = require('./apigee');

const {
    tryStringifyJSON,
    writeFile,
    readFile,
    readFileAsync,
    readDir,
    readDirAsync,
    rmDir
} = require('../common/utils');

const {
    getGoogleAPIsApigeeHostname,
    getResourcePath,
    getExportLocation,
    getStateLocation
} = require("../common/globals");

/*----------------------------------ENDPOINT----------------------------------*/

var ORG;
var ENV;
var ENDPOINT;

/**
 * @param {string} org
 * @param {string} env
 * @returns
 */
function setEndpoint(org, env) {
    ORG = org;
    ENV = env;
    ENDPOINT = '${HOSTNAME}/v1/organizations/${ORG}/environments/${ENV}/targetservers';
    ENDPOINT = lodash.template(ENDPOINT)({ HOSTNAME: getGoogleAPIsApigeeHostname(), ORG: org, ENV: env });
}

/*----------------------------------CRUD TARGET SERVER----------------------------------*/

/**
 * @param {JSON} config {name: 'targetserver', host: 'host', port: int, ...}
 * @returns {JSON} {name: 'targetserver', host: 'host', port: int, ...}
 */
async function createTargetServer(config) {
    console.log(`Creating Target Server '${config.name}': ${ENDPOINT}`);
    return apigeeapi
        .post(ENDPOINT, config)
        .then((response) => response.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @param {JSON} config {name: 'targetserver', host: 'host', port: int, ...}
 * @returns {JSON} {name: 'targetserver', host: 'host', port: int, ...}
 */
async function updateTargetServer(config) {
    console.log(`Updating Target Server '${config.name}': ${ENDPOINT}/${config.name}`);
    return (await apigeeapi())
        .put(`${ENDPOINT}/${config.name}`, config)
        .then((response) => response.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @returns {JSON LIST} ['name']
 */
async function getTargetServers() {
    return (await apigeeapi())
        .get(ENDPOINT)
        .then((response) => response.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @param {string} name
 * @returns {JSON} {name: 'targetserver', host: 'host', port: int, ...}
 */
async function getTargetServer(name) {
    return (await apigeeapi())
        .get(`${ENDPOINT}/${name}`)
        .then((response) => response.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @returns {JSON} {'targetserver': {name: 'targetserver', host: 'host', port: int, ...}}
 */
async function getAllTargetServers() {
    let targetServers = {};
    const servers = await getTargetServers();
    for (let i = 0; i < servers?.length; i++) {
        let server = servers[i];
        let serverState = await getTargetServer(server);
        targetServers[server] = serverState;
    }
    return targetServers;
}

/**
 * @param {string} name
 * @returns {JSON} {name: 'targetserver', host: 'host', port: int, ...}
 */
async function deleteTargetServer(name) {
    console.log(`Deleting Target Server '${name}': ${ENDPOINT}/${name}`);
    return (await apigeeapi())
        .delete(`${ENDPOINT}/${name}`)
        .then((response) => response.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/*----------------------------------State----------------------------------*/

/**
 * @returns {JSON} {'targetserver': {name: 'targetserver', host: 'host', port: int, ...}}
 */
async function getAllStateTargetServers() {
    let targetServers = {};

    const dir = `${getStateLocation()}/${getResourcePath('targetservers')}`;
    const files = readDir(dir);
    for (let i = 0; i < files?.length; i++) {
        let config = readFile(path.join(dir, files[i]));
        config = JSON.parse(config);
        Object.entries(config)?.forEach(([key, value]) => {
            targetServers[key] = value;
        })
    }
    return targetServers;
}

/*----------------------------------Import/Export----------------------------------*/

/**
 * @returns
 */
async function exportTargetServers() {
    const targetServers = await getTargetServers();

    // To remove all old configs
    rmDir(`${getExportLocation()}/${getResourcePath('targetservers')}`)

    //for(let i = 0; i < targetServers?.length; i++) {
    targetServers?.forEach(async server => {
        //let server = targetServers[i];
        const file = `${getExportLocation()}/${getResourcePath('targetservers')}/${server}.config`;
        let serverState = await getTargetServer(server);
        writeFile(file, JSON.stringify({ [server]: serverState }, undefined, 2));
        console.log(`TargetServers were exported to '${file}'`);
    });
    //};
}

/**
 * @returns
 */
async function deployTargetServers() {
    const dir = `${getStateLocation()}/${getResourcePath('targetservers')}`;
    readDirAsync(dir, async (error, files) => {
        if (error) {
            console.log(error);
            throw error;
        }

        let targetServersDeployed = await getAllTargetServers();
        files?.forEach((fileName) => {
            let changed = false;
            readFileAsync(path.join(dir, fileName), (error, config) => {
                if (error) {
                    console.log(error);
                    throw error;
                }

                config = JSON.parse(config);
                Object.keys(config)?.forEach(async (server) => {
                    // remove irrelevant fields if exists
                    delete config[server]?.createdAt;
                    delete config[server]?.lastModifiedAt;

                    if (!(server in targetServersDeployed)) {
                        await createTargetServer(config[server]);
                        changed = true;
                    } else {
                        let targetServerHash = config[server] ? crypto.createHash('md5').update(tryStringifyJSON(config[server])).digest('hex') : undefined;
                        let targetServerDeployed = targetServersDeployed[server];

                        // remove irrelevant fields if exists
                        delete targetServerDeployed?.createdAt;
                        delete targetServerDeployed?.lastModifiedAt;

                        let targetServerHashDeployed = targetServerDeployed ?
                            crypto.createHash('md5').update(tryStringifyJSON(targetServerDeployed)).digest('hex') : undefined;
                        if (targetServerHash && targetServerHash !== targetServerHashDeployed) {
                            await updateTargetServer(config[server]);
                            changed = true;
                        }
                    }
                    console.log(`Target Server '${server}'${!changed ? " already" : ""} deployed`);
                });
            });
        });
    });
}

/**
 * @returns
 */
async function undeployTargetServers() {
    let targetServersDeployed = await getAllTargetServers();
    let targetServersState = await getAllStateTargetServers();

    Object.keys(targetServersDeployed)?.forEach(async (server) => {
        if (!(server in targetServersState)) {
            await deleteTargetServer(server);
            console.log(`Target Server '${server}' undeployed`);
        }
    });
}


module.exports = {
    setEndpointTS: setEndpoint,
    getAllTargetServers: getAllTargetServers,
    getAllStateTargetServers: getAllStateTargetServers,
    exportTargetServers: exportTargetServers,
    deployTargetServers: deployTargetServers,
    undeployTargetServers: undeployTargetServers
};