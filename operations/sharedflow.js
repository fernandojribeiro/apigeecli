const { sleep } = require('../common/utils');
const { apigee: api } = require('../operations/apigee');
const { getGoogleAPIsApigeeHostname, getOrg, getOutputLocation, getEnvironmentOrganization } = require("../common/globals")

const fs = require("fs-extra");
const decompress = require('decompress');
//const FormData = require("form-data");

const getBasePath = () => `${getGoogleAPIsApigeeHostname()}/v1/organizations/${getOrg()}/sharedflows`;


/**
 * @returns {object} {sharedflows: [{name: 'sharedflow_name'}]}
 */
function getAllSharedflows() {
    return api
        .get(getBasePath())
        .then((response) => response.data)
        .catch((err) => {
            throw err;
        });
}

/**
 * @param {string} sSharedflow
 * @returns {object} 
 */
function getSharedflow(sSharedflow) {
    return api
        .get(getBasePath() + sSharedflow)
        .then((response) => response.data)
        .catch((err) => {
            throw err;
        });
}

function getSharedflowDeployments(sSharedflow) {
    return api
        .get(`${getBasePath()}/${sSharedflow}/deployments`)
        .then((response) => response.data)
        .catch((err) => {
            throw err;
        });
}

function listSharedflowRevisions(sSharedflow, sEnvironment) {
    return api
        .get(getBasePath() + sSharedflow + '/revisions')
        .then((response) => response.data)
        .catch((err) => {
            throw err;
        });
}

/**
 * @param {string} sSharedflow
 * @param {string} sEnvironment
 * @returns {Array} Array object 
 */
 async function listSharedflowRevisions(sSharedflow, sEnvironment) {
    try {
        if(!sEnvironment)
            sEnvironment = getEnv();
    
        const reqPath = `${getGoogleAPIsApigeeHostname()}/v1/organizations/${getEnvironmentOrganization(sEnvironment)}/sharedflows`;
        const response = await api.get(`${reqPath}/${sSharedflow}/revisions`)
        if(!response)
            return;
        
        return response?.data;

    } catch (error) {
        console.log('-----------------------------------------------------------------------------')
        console.log(`=> Error: Unable to retrieve revisions of ${sSharedflow} from ${sEnvironment}`);
        console.log('-----------------------------------------------------------------------------')
    }
}

async function getLatestRevisionNumber(sSharedflow, sEnvironment) {
    try {
        if(!sEnvironment)
            sEnvironment = getEnv();

        const response = await listSharedflowRevisions(sSharedflow, sEnvironment);
        if(!response)
            return;

        let latestRevision = response?.sort((a, b) =>  b - a)[0]
        return latestRevision;

    } catch (error) {
        console.log(error?.response?.data?.error);
    }
}


/**
 * 
 * @param {string} sSharedflow 
 * @returns 
 */
function getSharedflowDeployedRevision(sSharedflow) {
    return getSharedflowDeployments(sSharedflow).then((response) => {
        if (response.deployments) {
            let sharedflow = response.deployments[0].apiProxy;
            let revision = response.deployments[0].revision;
            getSharedflowRevision(sharedflow, revision).then((response) => response);
        }
    });
}

/**
 * @param {!String} sSharedflow Proxy name
 * @param {!String} sRevision Proxy revision
 * @param {?('string'|'zip')} sOutputFormat Determine the output format for this function
 * @returns {(JSON|String)}
 */
function getSharedflowRevision(sSharedflow, sRevision, sOutputFormat) {
    const filename = sSharedflow;
    const bundlesLocation = "./bundles/proxies";

    let reqPath = `${getBasePath()}/${sSharedflow}/revisions/${sRevision}`;

    if (sOutputFormat === "string")
        return api.get(reqPath).then((response) => response.data).catch((err) => { throw err });

    const writer = fs.createWriteStream(`${bundlesLocation}/${filename}.zip`, { flags: 'w' });   
    writer.on('error', (e) => { 
        console.error(e); 
    });

    return api
        .get(`${reqPath}?format=bundle`, { responseType: "stream" })
        .then(async (response) => {
            response.data.pipe(writer);
            await sleep(2000);
    
            decompress(`${bundlesLocation}/${filename}.zip`, `${getOutputLocation()}/${filename}`)
                .then(() => {
                    console.log(`\n> ${filename} revision ${sRevision} successfully downloaded`);
                    //fs.unlinkSync(`${getOutputLocation()}/${filename}.zip`);
                })
                .catch((err) => console.log(err));
        })
        .catch((err) => { throw err; });
}

function importSharedflowsIndex() {
    return getAllSharedflows().then((response) => {
        return response.sharedflows?.map((sharedflowObj) => sharedflowObj.name)
    })
        .catch((err) => console.log(err));
}

function importAllSharedflows() {
    return getAllSharedflows().then((response) => {
        response.sharedflows?.forEach(sharedflow => {
            getProxyDeployments(sharedflow.name).then((response) => {
                if (response.deployments) {
                    let sharedflow = response.deployments[0].sharedFlows;
                    let revision = response.deployments[0].revision;
                    getProxyRevision(sharedflow, revision).then((response) => response);
                }
            }).catch((err) => { throw err })
        })
    }).catch((err) => { throw err })
}

module.exports = {
    getAll: getAllSharedflows,
    get: getSharedflow,
    getRevision: getSharedflowRevision,
    getLatestRevisionNumber,
    getDeployments: getSharedflowDeployments,
    getDeployedRevision: getSharedflowDeployedRevision,
    importIndex: importSharedflowsIndex,
    importAll: importAllSharedflows,
    getRevisionList: listSharedflowRevisions
}