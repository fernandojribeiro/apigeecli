process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const fs = require("fs-extra");
const FormData = require("form-data");
const decompress = require('decompress');

const { apigee: api } = require('./apigee');
const { sleep } = require('../common/utils');
const { getGoogleAPIsApigeeHostname, getOrg, getEnv, getOutputLocation, getEnvironmentOrganization } = require("../common/globals");

const getBasePath = () => `${getGoogleAPIsApigeeHostname()}/v1/organizations/${getOrg()}/apis`;

/*----------------------------------CRUD Proxy----------------------------------*/
/**
 * @returns {JSON} {proxies: [{name: 'sProxy'}]}
 */
function getAllProxies() {
    return api
        .get(getBasePath())
        .then((response) => response.data)
        .catch((err) => {
            throw err;
        });
}

/**
 * @param {string} sProxy
 * @returns {JSON} 
 */
function getProxy(sProxy) {
    return api
        .get(`${getBasePath()}/${sProxy}`)
        .then((response) => response.data)
        .catch((err) => {
            throw err;
        });
}

/**
 * Create revision
 * @param {string} sProxy - The name of the proxy
 * @param {string} pathToResource - Path to the bundle location
 * @returns {JSON}
 */
 async function exportProxyBundle(sProxy, sEnvironment, pathToResource = "./bundles/proxies") {
    const form = new FormData();
    let resourcePath = `${pathToResource}/${sProxy}`;

    try {
        const reader = fs.createReadStream(resourcePath + '.zip');
        form.append(sProxy, reader, `${sProxy}.zip`);

        const reqPath = `${getGoogleAPIsApigeeHostname()}/v1/organizations/${getEnvironmentOrganization(sEnvironment)}/apis`;
        const response = await api.post(`${reqPath}?name=${sProxy}&action=import`, form, 
        {
            headers: { "Content-Type": `multipart/form-data; boundary=${form.getBoundary()}`},
        })

        if(response?.data)
            console.log(`> ${sProxy} sucessfully exported`)

        return response.data;

    } catch (error) {
        console.log(error?.response?.data);
    }
}

/**
 * 
 * @param {string} sProxy 
 * @returns 
 */
function getProxyDeployedRevision(sProxy) {
    return getProxyDeployments(sProxy).then((response) => {
        if (response.deployments) {
            let proxy = response.deployments[0].apiProxy;
            let revision = response.deployments[0].revision;
            getProxyRevision(proxy, revision).then((response) => response);
        }
    });
}


/**
 * @param {string} sProxy
 * @returns {JSON} proxy metadata
 */
function deleteProxy(sProxy) {
    return api
        .delete(`${getBasePath()}/${sProxy}`)
        .then((response) => response.data)
        .catch((err) => {
            throw err;
        });
}


function getProxyDeployments(sProxy) {
    return api
        .get(`${getBasePath()}/${sProxy}/deployments`)
        .then((response) => response.data)
        .catch((err) => {
            throw err;
        });
}

/*----------------------------------CRUD Revisions----------------------------------*/
/**
 * @param {string} sProxy
 * @returns {Array} Array object 
 */
async function getProxyRevisionList(sProxy, sEnvironment) {
    try {
        if(!sEnvironment)
            sEnvironment = getEnv();
    
        const reqPath = `${getGoogleAPIsApigeeHostname()}/v1/organizations/${getEnvironmentOrganization(sEnvironment)}/apis`;
        const response = await api.get(`${reqPath}/${sProxy}/revisions`)
        if(!response)
            return;
        
        return response?.data;

    } catch (error) {
        console.log('------------------------------------------------------------------------')
        console.log(`=> Error: Unable to retrieve revisions of ${sProxy} from ${sEnvironment}`);
        console.log('------------------------------------------------------------------------')
    }
}

async function getLatestRevisionNumber(sProxy, sEnvironment) {
    try {
        if(!sEnvironment)
            sEnvironment = getEnv();

        const response = await getProxyRevisionList(sProxy, sEnvironment);
        if(!response)
            return;

        let latestRevision = response?.sort((a, b) =>  b - a)[0]
        return latestRevision;

    } catch (error) {
        console.log(error?.response?.data?.error);
    }
}

/**
 * @param {!String} sProxy Proxy name
 * @param {!String} sRevision Proxy revision
 * @param {?('string'|'zip')} sOutputFormat Determine the output format for this function
 * @returns {(JSON|String)}
 */
async function getProxyRevision(sProxy, sRevision, sOutputFormat) {
    const filename = sProxy;
    const bundlesLocation = "./bundles/proxies";
    let reqPath = `${getBasePath()}/${sProxy}/revisions/${sRevision}`;

    if (sOutputFormat === "string")
        return api.get(reqPath).then((response) => response.data).catch((err) => { throw err });

    const writer = fs.createWriteStream(`${bundlesLocation}/${filename}.zip`, { flags: 'w' });    
    writer.on('error', (e) => { 
        console.error(e); 
    });

    try {
        const response = await api.get(`${reqPath}?format=bundle`, { responseType: "stream" })
        response.data.pipe(writer);
        await sleep(2000);
    
        decompress(`${bundlesLocation}/${filename}.zip`, `${getOutputLocation()}/${filename}`)
            .then(() => {
                console.log(`\n> ${filename} revision ${sRevision} successfully downloaded`);
                //fs.unlinkSync(`${getOutputLocation()}/${filename}.zip`);
            })
            .catch((err) => console.log(err));
        return ; 
    } catch (err) {
        throw err;
    }
}

function importProxiesIndex() {
    return getAllProxies().then((response) => {
        return response.proxies?.map((proxyObj) => proxyObj.name)
    })
    .catch((err) => console.log(err));
}

function importAllProxies() {
    return getAllProxies().then((response) => {
        response.proxies?.forEach(proxy => {
            getProxyDeployments(proxy.name).then((response) => {
                if (response.deployments) {
                    let proxy = response.deployments[0].apiProxy;
                    let revision = response.deployments[0].revision;
                    getProxyRevision(proxy, revision).then((response) => response);
                }
            }).catch((err) => { throw err })
        })
    }).catch((err) => { throw err })
}

/**
 * @param {string} sProxy
 * @returns {JSON} proxy metadata
 */
 function deleteProxyRevision(sProxy, sRevision) {
    return api
        .delete(`${getBasePath()}/${sProxy}/revisions/${sRevision}`)
        .then((response) => response.data)
        .catch((err) => {
            throw err;
        });
}

module.exports = {
    getAll: getAllProxies,
    get: getProxy,
    getRevision: getProxyRevision,
    getLatestRevisionNumber,
    getDeployments: getProxyDeployments,
    getRevisionList: getProxyRevisionList,
    getDeployedRevision: getProxyDeployedRevision,
    exportBundle: exportProxyBundle,
    importAll: importAllProxies,
    importProxiesIndex: importProxiesIndex,
    deleteRevision: deleteProxyRevision
};
