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
    ENDPOINT = '${HOSTNAME}/v1/organizations/${ORG}/developers';
    ENDPOINT = lodash.template(ENDPOINT)({ HOSTNAME: getGoogleAPIsApigeeHostname(), ORG: org, ENV: env });
}

/*----------------------------------CRUD DEVELOPER----------------------------------*/

/**
 * @param {JSON} config {email: 'email', firstName: 'firstname', lastname: 'lastname', username: 'username',...}
 * @returns {JSON} {email: 'email', firstName: 'firstname', lastname: 'lastname', username: 'username',...}
 */
async function createDeveloper(config) {
    console.log(`Creating Developer '${config.email}': ${ENDPOINT}`);
    return (await apigeeapi())
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
 * @param {JSON} config {email: 'email', firstName: 'firstname', lastname: 'lastname', username: 'username',...}
 * @returns {JSON} {email: 'email', firstName: 'firstname', lastname: 'lastname', username: 'username',...}
 */
async function updateDeveloper(config) {
    console.log(`Updating Developer '${config.email}': ${ENDPOINT}/${config.email}`);
    return (await apigeeapi())
        .put(`${ENDPOINT}/${config.email}`, config)
        .then((response) => response.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @param {GUID} id "developerId"
 * @param {string} status [active|inactive]
 * @returns
 */
async function updateDeveloperStatus(id, status) {
    console.log(`Updating Developer Status '${id}-${status}': ${ENDPOINT}/${id}?action=${status}`);
    return (await apigeeapi())
        .post(`${ENDPOINT}/${id}?action=${status}`, undefined, { headers: { 'Content-Type': 'application/octet-stream' } })
        .then((response) => response.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @param {boolean} expand
 * @returns {JSON LIST} ['name']|[{email: 'email', firstName: 'firstname', lastname: 'lastname', developerId: 'GUID\',...}]
 */
async function getDevelopers(expand = false) {
    return (await apigeeapi())
        .get(`${ENDPOINT}?expand=${expand}`)
        .then((response) => expand ? response?.data?.developer : response?.data?.developer?.map((developer) => developer.email))
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @param {string} id developerId|email
 * @returns {JSON} {email: 'email', firstName: 'firstname', lastname: 'lastname', developerId: 'GUID\',...}
 */
async function getDeveloper(id) {
    return (await apigeeapi())
        .get(`${ENDPOINT}/${id}`)
        .then((response) => response.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @returns {JSON} {'developer': {email: 'email', firstName: 'firstname', lastname: 'lastname', username: 'username',...}}
 */
async function getAllDevelopers(removeIrrelevantFields) {
    let developers = {};
    const devs = await getDevelopers(true);
    for (let i = 0; i < devs?.length; i++) {
        let developer = devs[i];
        if(removeIrrelevantFields) {
            delete developer.createdAt;
            delete developer.developerId;
            delete developer.lastModifiedAt;
            delete developer.organizationName;
            delete developer.apps;
        }
        developers[developer.email] = developer;
    }
    return developers;
}

/**
 * @param {string} id developerid|email
 * @returns {JSON} {email: 'email', firstName: 'firstname', lastname: 'lastname', username: 'username',...}
*/
async function deleteDeveloper(id) {
    console.log(`Deleting Developer '${id}': ${ENDPOINT}/${id}`);
    return (await apigeeapi())
        .delete(`${ENDPOINT}/${id}`)
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
 * @param {boolean} removeIrrelevantFields
 * @returns {JSON} {'developer': {email: 'email', firstName: 'firstname', lastname: 'lastname', username: 'username',...}}
 */
async function getAllStateDevelopers(removeIrrelevantFields) {
    let developers = {};

    const dir = `${getStateLocation()}/${getResourcePath('developers')}`;
    const files = readDir(dir);
    for (let i = 0; i < files?.length; i++) {
        let config = readFile(path.join(dir, files[i]));
        config = JSON.parse(config);
        Object.entries(config)?.forEach(([key, value]) => {
            if(removeIrrelevantFields) {
                delete value.createdAt;
                delete value.developerId;
                delete value.lastModifiedAt;
                delete value.organizationName;
                delete value.apps;
            }
            developers[key] = value;
        });
    }
    return developers;
}

/*----------------------------------Import/Export----------------------------------*/

/**
 * @returns
 */
async function exportDevelopers() {
    const developers = await getDevelopers(true);

    // To remove all old configs
    rmDir(`${getExportLocation()}/${getResourcePath('developers')}`)

    //for(let i = 0; i < developers?.length; i++) {
    developers?.forEach(async developer => {
        //let developer = developers[i];
        const file = `${getExportLocation()}/${getResourcePath('developers')}/${developer.email}.config`;
        writeFile(file, JSON.stringify({ [developer.email]: developer }, undefined, 2));
        console.log(`Developers were exported to '${file}'`);
    });
    //};
}

/**
 * @returns
 */
async function deployDevelopers() {
    const dir = `${getStateLocation()}/${getResourcePath('developers')}`;
    readDirAsync(dir, async (error, files) => {
        if (error) {
            console.log(error);
            throw error;
        }

        let developersDeployed = await getAllDevelopers(false);
        files?.forEach((fileName) => {
            let changed = false;
            readFileAsync(path.join(dir, fileName), (error, config) => {
                if (error) {
                    console.log(error);
                    throw error;
                }

                config = JSON.parse(config);
                Object.keys(config)?.forEach(async (developer) => {
                    // remove irrelevant fields if exists
                    delete config[developer]?.developerId;
                    delete config[developer]?.organizationName;
                    delete config[developer]?.createdAt;
                    delete config[developer]?.lastModifiedAt;

                    if (!(developer in developersDeployed)) {
                        await createDeveloper(config[developer]);
                        changed = true;
                    } else {
                        let developerHash = config[developer] ?
                            crypto.createHash('md5').update(tryStringifyJSON(config[developer])).digest('hex') : undefined;
                        let developerDeployed = developersDeployed[developer];
                        let developerId = developerDeployed.developerId;

                        // remove irrelevant fields if exists
                        delete developerDeployed?.developerId;
                        delete developerDeployed?.organizationName;
                        delete developerDeployed?.createdAt;
                        delete developerDeployed?.lastModifiedAt;
                        delete developerDeployed?.apps; // this element is purely informative, not relevant for deployment

                        let developerHashDeployed = developerDeployed ?
                            crypto.createHash('md5').update(tryStringifyJSON(developerDeployed)).digest('hex') : undefined;

                        if (developerHash && developerHash !== developerHashDeployed) {
                            await updateDeveloper(config[developer]);
                            if (config[developer]?.status) {
                                await updateDeveloperStatus(developerId, config[developer].status);
                            }
                            changed = true;
                        }
                    }
                    console.log(`Developer '${developer}'${!changed ? " already" : ""} deployed`);
                });
            });
        });
    });
}

/**
 * @returns
 */
async function undeployDevelopers() {
    let developersDeployed = await getAllDevelopers(true);
    let developersState = await getAllStateDevelopers(true);

    Object.keys(developersDeployed)?.forEach(async (developer) => {
        if (!(developer in developersState)) {
            await deleteDeveloper(developer);
            console.log(`Developer '${developer}' undeployed`);
        }
    });
}


module.exports = {
    setEndpointDEV: setEndpoint,
    getAllDevelopers: getAllDevelopers,
    getAllStateDevelopers: getAllStateDevelopers,
    getDeveloper: getDeveloper,
    exportDevelopers: exportDevelopers,
    deployDevelopers: deployDevelopers,
    undeployDevelopers: undeployDevelopers
};