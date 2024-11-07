const path = require("path");
const lodash = require('lodash');
const crypto = require('crypto');

const {
    apigeeapi
} = require('./apigee');

const {
    tryStringifyJSON,
    writeFile,
    readDir,
    readDirAsync,
    rmDir,
    cryptFile,
    encryptFile
} = require('../common/utils');

const {
    getGoogleAPIsApigeeHostname,
    getResourcePath,
    getExportLocation,
    getStateLocation
} = require("../common/globals");

const {
    getAllEnvApiProducts
} = require("./apiProducts");

const {
    getDeveloper
} = require("./developers");

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
    ENDPOINT = '${HOSTNAME}/v1/organizations/${ORG}';
    ENDPOINT = lodash.template(ENDPOINT)({ HOSTNAME: getGoogleAPIsApigeeHostname(), ORG: org, ENV: env });
}

/*----------------------------------CRUD APP----------------------------------*/

/**
 * @param {boolean} expand
 * @returns {JSON LIST} ['name']|[{name: 'name', status: 'status',...}]
 */
async function getApps(expand = false) {
    return (await apigeeapi())
        .get(`${ENDPOINT}/apps?expand=${expand}`)
        .then((response) => expand ? response?.data?.app : response?.data?.app?.map((app) => app.appId))
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @param {GUID} id appId
 * @returns {JSON} {name: 'name', status: 'status',...}
 */
async function getApp(id) {
    return (await apigeeapi())
        .get(`${ENDPOINT}/apps/${id}`)
        .then((response) => response.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/*------------------------------CRUD DEVELOPER APP----------------------------*/

/**
 * @param {string} id developerid|email
 * @param {JSON} config {name: 'name', status: 'status',...}
 * @returns {JSON} {name: 'name', status: 'status',...}
 */
async function createDeveloperApp(id, config) {
    console.log(`Creating Developer App '${id}-${config.name}': ${ENDPOINT}/developers/${id}/apps`);
    return (await apigeeapi())
        .post(`${ENDPOINT}/developers/${id}/apps`, config)
        .then((response) => response.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @param {string} id developerid|email
 * @param {JSON} config {name: 'name', status: 'status',...}
 * @returns {JSON} {name: 'name', status: 'status',...}
 */
async function updateDeveloperApp(id, config) {
    console.log(`Updating Developer App '${config.name}' for Developer '${id}': ${ENDPOINT}/developers/${id}/apps/${config.name}`);
    return (await apigeeapi())
        .put(`${ENDPOINT}/developers/${id}/apps/${config.name}`, config)
        .then((response) => response.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @param {string} id developerid|email
 * @param {string} name appName
 * @param {JSON} attributes {attributes: [{name: 'name, value: 'value'}]}
 * @returns {JSON} {attributes: [{name: 'name, value: 'value'}],...}
 */
async function updateDeveloperAppAttributes(id, name, attributes) {
    console.log(`Updating App Attributes '${name}' for Developer '${id}': ${ENDPOINT}/developers/${id}/apps/${name}`);
    return (await apigeeapi())
        .post(`${ENDPOINT}/developers/${id}/apps/${name}`, { attributes: attributes })
        .then((response) => response.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @param {string} id developerid|email
 * @param {string} name appName
 * @param {string} status [approve(d)|revoke(d)]
 * @returns
 */
async function updateDeveloperAppStatus(id, name, status) {
    let statusTranslate = { 'approved': 'approve', 'revoked': 'revoke' }
    status = statusTranslate[status] || status;
    console.log(`Updating App Status'${status}' for Developer '${id}': ${ENDPOINT}/developers/${id}/apps/${name}?action=${status}`);
    return (await apigeeapi())
        .post(`${ENDPOINT}/developers/${id}/apps/${name}?action=${status}`, undefined, { headers: { 'Content-Type': 'application/octet-stream' } })
        .then((response) => response.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @param {string} id developerid|email
 * @param {string} name appName
 * @param {JSON} apiProducts {apiProducts: ['apiProduct']}
 * @returns {JSON} {name: 'name', status: 'status',...}
 */
async function generateDeveloperAppKeyPair(id, name, apiProducts) {
    console.log(`Generating App Key Pair '${name}' for Developer '${id}': ${ENDPOINT}/developers/${id}/apps/${name}`);
    return (await apigeeapi())
        .post(`${ENDPOINT}/developers/${id}/apps/${name}`, apiProducts)
        .then((response) => response.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @param {string} id developerid|email
 * @param {string} name appName
 * @param {JSON} keyPair {consumerKey: 'key, consumerSecret: 'secret', expiresInSeconds: int}
 * @returns {JSON} {consumerKey: 'key, consumerSecret: 'secret', expiresInSeconds: int, ...}
 */
async function setDeveloperAppKeyPair(id, name, keyPair) {
    console.log(`Setting App Key Pair '${name}' for Developer '${id}': ${ENDPOINT}/developers/${id}/apps/${name}/keys`);
    return (await apigeeapi())
        .post(`${ENDPOINT}/developers/${id}/apps/${name}/keys`, keyPair)
        .then((response) => response.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @param {string} id developerid|email
 * @param {string} name appName
 * @param {string} key
 * @param {JSON} apiProducts {apiProducts: ['apiProduct']}
 * @returns {JSON} {name: 'name', status: 'status',...}
 */
async function updateDeveloperAppKeyProducts(id, name, key, apiProducts) {
    console.log(`Updating App Key Products '${name}' for Developer '${id}': ${ENDPOINT}/developers/${id}/apps/${name}/keys/${key}`);
    return (await apigeeapi())
        .post(`${ENDPOINT}/developers/${id}/apps/${name}/keys/${key}`, { apiProducts: apiProducts })
        .then((response) => response.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @param {string} id developerid|email
 * @param {string} name appName
 * @param {string} key
 * @param {string} apiProduct
 * @param {string} status [approved|revoked]
 * @returns
 */
async function updateDeveloperAppKeyProductStatus(id, name, key, apiProduct, status) {
    console.log(`Updating App Key Product Status '${name}' for Developer '${id}': ${ENDPOINT}/developers/${id}/apps/${name}/keys/${key}/apiproducts/${apiproduct}?action=${status}`);
    return (await apigeeapi())
        .post(`${ENDPOINT}/developers/${id}/apps/${name}/keys/${key}/apiproducts/${apiproduct}?action=${status}`, undefined, { headers: { 'Content-Type': 'application/octet-stream' } })
        .then((response) => response.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @param {string} id developerid|email
 * @param {boolean} expand
 * @returns {JSON LIST} ['name']|[{name: 'name', status: 'status',...}]
 */
async function getDeveloperApps(id, expand = false) {
    return (await apigeeapi())
        .get(`${ENDPOINT}/developers/${id}/apps?expand=${expand}`)
        .then((response) => expand ? response?.data?.app : response?.data?.app?.map((app) => app.email))
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @param {string} id developerid|email
 * @param {string} name appName
 * @returns {JSON} {name: 'name', status: 'status',...}
 */
async function getDeveloperApp(id, name) {
    return (await apigeeapi())
        .get(`${ENDPOINT}/developers/${id}/apps/${name}`)
        .then((response) => response?.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @param {boolean} removeIrrelevantFields
 * @returns {JSON} {'app': {name: 'name', status: 'status',...}}
 */
async function getAllApps(removeIrrelevantFields) {
    let applications = {};
    const apps = await getApps(true);
    for (let i = 0; i < apps?.length; i++) {
        let app = apps[i];
        if(app?.developerId) {
            app.developerEmail = (await getDeveloper(app?.developerId))?.email;
        }
        if(removeIrrelevantFields) {
            delete app?.appId;
            delete app?.createdAt;
            delete app?.developerId;
            delete app?.lastModifiedAt;
            delete app?.organizationName;
            app?.credentials?.forEach((credential) => {
                delete credential?.issuedAt;
            });
        }
        applications[app.name] = app;
    }
    return applications;
}

/**
 * @param {string} id developerid|email
 * @param {string} name appName
 * @param {string} key credentialKey
 * @param {string} apiProduct
 * @returns {JSON} {consumerKey: 'key, consumerSecret: 'secret', expiresAt: 'int', ...}
 */
async function deleteDeveloperAppKeyProduct(id, name, key, apiProduct) {
    console.log(`Deleting Key Product '${apiProduct}' from Developer App '${name}': ${ENDPOINT}/developers/${id}/apps/${name}/keys/${key}/apiproducts/${apiProduct}`);
    return (await apigeeapi())
        .delete(`${ENDPOINT}/developers/${id}/apps/${name}/keys/${key}/apiproducts/${apiProduct}`)
        .then((response) => response.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @param {string} id developerid|email
 * @param {string} name appName
 * @param {string} key credentialKey
 * @returns {JSON} {consumerKey: 'key, consumerSecret: 'secret', expiresAt: 'int', ...}
 */
async function deleteDeveloperAppKey(id, name, key) {
    console.log(`Deleting Developer App Key '${name}': ${ENDPOINT}/developers/${id}/apps/${name}/keys/${key}`);
    return (await apigeeapi())
        .delete(`${ENDPOINT}/developers/${id}/apps/${name}/keys/${key}`)
        .then((response) => response.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @param {string} id developerid|email
 * @param {string} name appName
 * @returns {JSON} {name: 'name', status: 'status',...}
 */
async function deleteDeveloperApp(id, name) {
    console.log(`Deleting Developer App '${name}': ${ENDPOINT}/developers/${id}/apps/${name}`);
    return (await apigeeapi())
        .delete(`${ENDPOINT}/developers/${id}/apps/${name}`)
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
 * @returns {JSON} {'app': {name: 'name', status: 'status',...}}
 */
async function getAllStateApps(removeIrrelevantFields) {
    let apps = {};

    const dir = `${getStateLocation()}/${getResourcePath('apps')}`;
    const files = readDir(dir);
    for (let i = 0; i < files?.length; i++) {
        let fileName = path.join(dir, files[i]);
        // this will encrypt the file if is not alreayd and return the decrypted content. This way all secrets will be encryted.
        let file = await cryptFile(fileName, '^(consumerKey|consumerSecret)$');
        if (!file) throw new Error(`Could not read file ${fileName}`);

        config = JSON.parse(file);
        Object.entries(config)?.forEach(([key, value]) => {
            if(removeIrrelevantFields) {
                delete value?.appId;
                delete value?.createdAt;
                delete value?.developerId;
                delete value?.lastModifiedAt;
                delete value?.organizationName;
                value?.credentials?.forEach((credential) => {
                    delete credential?.issuedAt;
                });
            }
            apps[key] = value;
        })
    }
    return apps;
}

/*----------------------------------Import/Export----------------------------------*/

/**
 * @returns
 */
async function exportApps() {
    let apiProductsDeployed = await getAllEnvApiProducts(true);
    let apps = await getApps(true);

    // To remove all old configs
    rmDir(`${getExportLocation()}/${getResourcePath('apps')}`)

    //for(let i = 0; i < apps?.length; i++) {
    apps?.forEach(async app => {
        //let app = apps[i];
        let apiProducts = app?.credentials?.map((credential) => credential.apiProducts?.map((product) => product.apiproduct))?.flat();

        // Only export if related APIProduct has current environment checked
        if (!(apiProducts?.length) || apiProducts.some(product => product in apiProductsDeployed)) {
            if(app?.developerId) {
                app.developerEmail = (await getDeveloper(app?.developerId))?.email;
            }

            const filePath = `${getExportLocation()}/${getResourcePath('apps')}/${app.name}.config`;
            writeFile(filePath, JSON.stringify({ [app.name]: app }, undefined, 2));
            await encryptFile(filePath, '^(consumerKey|consumerSecret)$');
            console.log(`Apps were exported to '${filePath}'`);
        }
    });
    //};
}

/**
 * @returns
 */
async function deployApps() {
    const dir = `${getStateLocation()}/${getResourcePath('apps')}`;
    readDirAsync(dir, async (error, files) => {
        if (error) {
            console.log(error);
            throw error;
        }

        let appsDeployed = await getAllApps(false);
        files?.forEach(async (fileName) => {
            let changed = false;
            
            let filePath = path.join(dir, fileName);
            // this will encrypt the file if is not alreayd and return the decrypted content. This way all secrets will be encryted.
            let file = await cryptFile(filePath, '^(consumerKey|consumerSecret)$');
            if (!file) throw new Error(`Could not read file ${filePath}`);

            config = JSON.parse(file);
            Object.keys(config)?.forEach(async (app) => {
                let developerEmail = config[app].developerEmail;

                // remove irrelevant fields if exists
                delete config[app]?.appId;
                delete config[app]?.createdAt;
                delete config[app]?.developerId;
                delete config[app]?.developerEmail;
                delete config[app]?.lastModifiedAt;
                delete config[app]?.organizationName;

                config[app].credentials?.forEach((credential) => {
                    delete credential?.issuedAt;
                });

                if (!(app in appsDeployed)) {
                    await createDeveloperApp(developerEmail, config[app]);
                    if (config[app].attributes) {
                        await updateDeveloperApp(developerEmail, config[app]);
                    }
                    let developerApp = await getDeveloperApp(developerEmail, app);
                    if (config[app].credentials) {
                        await deleteDeveloperAppKey(developerEmail, app, developerApp.credentials[0].consumerKey);
                        for (let i = 0; i < config[app].credentials?.length; i++) {
                            let credential = config[app].credentials[i];
                            let products = credential.apiProducts
                            if (credential) {
                                delete credential?.apiProducts
                                await setDeveloperAppKeyPair(developerEmail, app, credential);
                            }
                            if (products) {
                                await updateDeveloperAppKeyProducts(developerEmail, app, credential.consumerKey,
                                    products?.map((product) => product.apiproduct));
                            }
                        }
                    }
                    changed = true;
                } else {
                    let appHash = config[app] ? crypto.createHash('md5').update(tryStringifyJSON(config[app])).digest('hex') : undefined;
                    let appDeployed = appsDeployed[app];
                    let developerEmail = appDeployed.developerEmail;

                    // remove irrelevant fields if exists
                    delete appDeployed?.appId;
                    delete appDeployed?.createdAt;
                    delete appDeployed?.developerId;
                    delete appDeployed?.developerEmail;
                    delete appDeployed?.lastModifiedAt;
                    delete appDeployed?.organizationName;

                    appDeployed.credentials?.forEach((credential) => {
                        delete credential?.issuedAt;
                    });

                    let appHashDeployed = appDeployed ?
                        crypto.createHash('md5').update(tryStringifyJSON(appDeployed)).digest('hex') : undefined;

                    if (appHash && appHash !== appHashDeployed) {
                        await updateDeveloperApp(developerEmail, config[app]);
                        if (config[app]?.status) {
                            await updateDeveloperAppStatus(developerEmail, app, config[app].status);
                        }
                        if (config[app].attributes) {
                            await updateDeveloperAppAttributes(developerEmail, app, config[app].attributes);
                        }
                        if (config[app].credentials) {
                            let consumerKeys = appDeployed?.credentials?.map((credential) => credential.consumerKey)?.flat();
                            for (let i = 0; i < config[app].credentials?.length; i++) {
                                let credential = config[app].credentials[i];
                                let products = credential.apiProducts
                                if (credential && !consumerKeys.includes(credential.consumerKey)) {
                                    delete credential?.apiProducts
                                    await setDeveloperAppKeyPair(developerEmail, app, credential);
                                }
                                if (products) {
                                    await updateDeveloperAppKeyProducts(developerId, app, credential.consumerKey,
                                        products?.map((product) => product.apiproduct));
                                }
                            }
                        }
                        changed = true;
                    }
                }
                console.log(`App '${app}'${!changed ? " already" : ""} deployed`);
            });
        });
    });
}

/**
 * @returns
 */
async function undeployApps() {
    let appsDeployed = await getAllApps(true);
    let appsState = await getAllStateApps(true);

    Object.keys(appsDeployed)?.forEach(async (app) => {
        if (!(app in appsState)) {
            await deleteDeveloperApp(appsDeployed[app].developerId, app);
            console.log(`App '${app}' undeployed`);
        } else if (appsDeployed[app].credentials) {
            appsDeployed[app].credentials?.forEach(async (credential) => {
                if (credential.consumerKey) {
                    credentialState = appsState[app].credentials.find((c) => c.consumerKey === credential.consumerKey);
                    if (!credentialState) {
                        await deleteDeveloperAppKey(appsDeployed[app].developerId, app, credential.consumerKey);
                        console.log(`Credential '${credential.consumerKey}' from App '${app}' was removed`);
                    } else {
                        credential.apiProducts?.forEach(async (apiProduct) => {
                            if (!(credentialState.apiProducts.find((p) => p.apiproduct === apiProduct.apiproduct))) {
                                await deleteDeveloperAppKeyProduct(appsDeployed[app].developerId, app, credential.consumerKey, apiProduct.apiproduct);
                                console.log(`API Product '${apiProduct.apiproduct}' from credential '${credential.consumerKey}' in App '${app}' was removed`);
                            }
                        });
                    }
                }
            });
        }
    });
}


module.exports = {
    setEndpointAPP: setEndpoint,
    getAllApps: getAllApps,
    getAllStateApps: getAllStateApps,
    exportApps: exportApps,
    deployApps: deployApps,
    undeployApps: undeployApps
};