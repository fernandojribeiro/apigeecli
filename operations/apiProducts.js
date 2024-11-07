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
    getResourcePath
    getExportLocation,
    getStateLocation,
} = require("../common/globals")

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
    ENDPOINT = '${HOSTNAME}/v1/organizations/${ORG}/apiproducts';
    ENDPOINT = lodash.template(ENDPOINT)({ HOSTNAME: getGoogleAPIsApigeeHostname(), ORG: org, ENV: env });
}

/*----------------------------------CRUD API PRODUCT----------------------------------*/

/**
 * @param {JSON} config {name: 'apiproduct', displayName: 'displayname', quota: int, ...}
 * @returns {JSON} {name: 'apiproduct', displayName: 'displayname', quota: int, ...}
 */
async function createApiProduct(config) {
    console.log(`Creating API Product '${config.name}': ${ENDPOINT}`);
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
 * @param {JSON} config {name: 'apiproduct', displayName: 'displayname', quota: int, ...}
 * @returns {JSON} {name: 'apiproduct', displayName: 'displayname', quota: int, ...}
 */
async function updateApiProduct(config) {
    console.log(`Updating API Product '${config.name}': ${ENDPOINT}/${config.name}`);
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
 * @param {JSON} attributes {attributes: [{name: 'name, value: 'value'}]}
 * @returns {JSON} {attributes: [{name: 'name, value: 'value'}]}
 */
async function updateApiProductAttributes(name, attributes) {
    console.log(`Updating API Product Attributes '${name}': ${ENDPOINT}/${name}/attributes`);
    return (await apigeeapi())
        .post(`${ENDPOINT}/${name}/attributes`, { attributes: attributes })
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
 * @returns {JSON LIST} ['name']|[{name: 'apiproduct', displayName: 'displayname', quota: int, ...}]
 */
async function getApiProducts(expand = false) {
    return (await apigeeapi())
        .get(`${ENDPOINT}?expand=${expand}`)
        .then((response) => expand ? response?.data?.apiProduct : response?.data?.apiProduct?.map((product) => product.name))
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });
}

/**
 * @param {string} name
 * @returns {JSON} {name: 'apiproduct', displayName: 'displayname', quota: int, ...}
 */
async function getApiProduct(name) {
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
 * @param {boolean} removeIrrelevantFields
 * @returns {JSON} {'apiproduct': {name: 'apiproduct', displayName: 'displayname', quota: int, ...}}
 */
async function getAllApiProducts(removeIrrelevantFields) {
    let apiProducts = {};
    const products = await getApiProducts(true);
    for (let i = 0; i < products?.length; i++) {
        let product = products[i];
        if(removeIrrelevantFields) {
            delete product.createdAt;
            delete product.lastModifiedAt;
        }
        apiProducts[product.name] = product;
    }
    return apiProducts;
}

/**
 * @param {boolean} removeIrrelevantFields
 * @returns {JSON LIST} ['apiProduct']
 */
async function getAllEnvApiProducts(removeIrrelevantFields) {
    let apiProducts = await getAllApiProducts(removeIrrelevantFields);
    // Only return APIProducts with current environment checked
    return Object.fromEntries(Object.entries(apiProducts)?.filter(([key, value]) =>
        !(apiProducts[key]?.environments?.length) || apiProducts[key].environments.includes(ENV)));
}

/**
 * @param {string} name
 * @returns {JSON} {name: 'apiproduct', displayName: 'displayname', quota: int, ...}
 */
async function deleteApiProduct(name) {
    console.log(`Deleting API Product '${name}': ${ENDPOINT}/${name}`);
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
 * @param {boolean} removeIrrelevantFields
 * @returns {JSON} {'apiproduct': {name: 'apiproduct', displayName: 'displayname', quota: int, ...}}
 */
async function getAllStateApiProducts(removeIrrelevantFields) {
    let apiProducts = {};

    const dir = `${getStateLocation()}/${getResourcePath('apiproducts')}`;
    const files = readDir(dir);
    for (let i = 0; i < files?.length; i++) {
        let config = readFile(path.join(dir, files[i]));
        config = JSON.parse(config);
        Object.entries(config)?.forEach(([key, value]) => { 
            if(removeIrrelevantFields) {
                delete value.createdAt;
                delete value.lastModifiedAt;
            }
            apiProducts[key] = value;
        });
    }

    return apiProducts;
}

/*----------------------------------Import/Export----------------------------------*/

/**
 * @returns
 */
async function exportApiProducts() {
    const apiProducts = await getApiProducts(true);

    // To remove all old configs
    rmDir(`${getExportLocation()}/${getResourcePath('apiproducts')}`)

    //for(let i = 0; i < apiProducts?.length; i++) {
    apiProducts?.forEach(async product => {
        //let product = apiProducts[i];
        if (!product?.environments?.length || product?.environments?.includes(ENV)) {
            const file = `${getExportLocation()}/${getResourcePath('apiproducts')}/${product.name}.config`;
            writeFile(file, JSON.stringify({ [product.name]: product }, undefined, 2));
            console.log(`API Products were exported to '${file}'`);
        }
    });
    //};
}

/**
 * @returns
 */
async function deployApiProducts() {
    const dir = `${getStateLocation()}/${getResourcePath('apiproducts')}`;
    readDirAsync(dir, async (error, files) => {
        if (error) {
            console.log(error);
            throw error;
        }

        let apiProductsDeployed = await getAllEnvApiProducts(true);
        files?.forEach((fileName) => {
            let changed = false;
            readFileAsync(path.join(dir, fileName), (error, config) => {
                if (error) {
                    console.log(error);
                    throw error;
                }

                config = JSON.parse(config);
                Object.keys(config)?.forEach(async (product) => {
                    // remove irrelevant fields if exists
                    delete config[product]?.createdAt;
                    delete config[product]?.lastModifiedAt;

                    if (!(product in apiProductsDeployed)) {
                        await createApiProduct(config[product]);
                        changed = true;
                    } else {
                        let apiProductHash = config[product] ?
                            crypto.createHash('md5').update(tryStringifyJSON(config[product])).digest('hex') : undefined;
                        let apiProductDeployed = apiProductsDeployed[product];
                        let apiProductHashDeployed = apiProductDeployed ?
                            crypto.createHash('md5').update(tryStringifyJSON(apiProductDeployed)).digest('hex') : undefined;
                        
                        if (apiProductHash && apiProductHash !== apiProductHashDeployed) {
                            await updateApiProduct(config[product]);
                            if (config[product]?.attributes) {
                                await updateApiProductAttributes(product, config[product].attributes);
                            }
                            changed = true;
                        }
                    }
                    console.log(`API Product '${product}'${!changed ? " already" : ""} deployed`);
                });
            });
        });
    });
}

/**
 * @returns
 */
async function undeployApiProducts() {
    let apiProductsDeployed = await getAllEnvApiProducts(true);
    let apiProductsState = await getAllStateApiProducts(true);

    Object.keys(apiProductsDeployed)?.forEach(async (apiProduct) => {
        if (!(apiProduct in apiProductsState)) {
            await deleteApiProduct(apiProduct);
            console.log(`API Product '${apiProduct}' undeployed`);
        }
    });
}


module.exports = {
    setEndpointAP: setEndpoint,
    getAllEnvApiProducts: getAllEnvApiProducts,
    getAllStateApiProducts: getAllStateApiProducts,
    exportApiProducts: exportApiProducts,
    deployApiProducts: deployApiProducts,
    undeployApiProducts: undeployApiProducts
};