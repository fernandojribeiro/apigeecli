const path = require("path");
const lodash = require('lodash');
const crypto = require('crypto');

const {
    apigeeapi
} = require('./apigee');

const {
    tryStringifyJSON,
    tryParseJSON,
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
    ENDPOINT = '${HOSTNAME}/v1/organizations/${ORG}/environments/${ENV}/keyvaluemaps';
    ENDPOINT = lodash.template(ENDPOINT)({ HOSTNAME: getGoogleAPIsApigeeHostname(), ORG: org, ENV: env });
}

/*----------------------------------CRUD KVM----------------------------------*/

/**
 * @param {string} name
 * @param {boolean} encrypted
 * @returns {JSON} {name: 'kvm', encrypted: bool}
 */
async function createKVM(name, encrypted) {
    console.log(`Creating KVM '${name}': ${ENDPOINT}`);
    return (await apigeeapi())
        .post(ENDPOINT, { name: name, encrypted: encrypted })
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
async function getKVMs() {
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
 * @returns {JSON} {name: 'name', encrypted: boolean'}
 */
async function deleteKVM(name) {
    console.log(`Deleting KVM '${name}': ${ENDPOINT}/${name}`);
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

/*-------------------------------CRUD KVM ENTRY-------------------------------*/
/**
 * @param {string} name (kvm name)
 * @param {string} entry (entry name)
 * @param {string|JSON} value (entry value)
 * @returns {JSON} {name: 'kvm', value: 'value'}
 */
async function setKVMEntry(name, entry, value) {
    console.log(`Set KVM entry '${name}-${entry}': ${ENDPOINT}/${name}/entries`);
    return (await apigeeapi())
        .post(`${ENDPOINT}/${name}/entries`, { name: entry, value: value })
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
 * @param {string} entry
 * @returns {JSON} {name: 'name', value: 'value'}
 */
async function getKVMEntry(name, entry) {
    return (await apigeeapi())
        .get(`${ENDPOINT}/${name}/entries/${entry}`)
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
 * @returns {JSON} {keyValueEntries: [{name: 'name', value: 'value'}]}
 */
async function getKVMEntries(name) {
    return (await apigeeapi())
        .get(`${ENDPOINT}/${name}/entries`)
        .then((response) => response.data)
        .catch((error) => {
            if (error.response) {
                console.log(error.response?.data || error.response)
            }
            throw error;
        });

}

/**
 * @returns {JSON} {'kvm': [{name: 'name', value: 'value'}]}
 */
async function getAllKVMEntries() {
    let kvmEntries = {};
    const kvms = await getKVMs();
    for (let i = 0; i < kvms?.length; i++) {
        let kvm = kvms[i];
        let entries = await getKVMEntries(kvm);
        entries = entries?.keyValueEntries?.map(x => ({ name: x.name, value: tryParseJSON(x.value) }));
        kvmEntries[kvm] = entries;
    }
    return kvmEntries;
}

/**
 * @param {string} name
 * @param {string} entry
 * @returns {JSON} {name: 'name', value: 'value'}
 */
async function deleteKVMEntry(name, entry) {
    console.log(`Deleting KVM entry '${entry}' from kvm '${name}': ${ENDPOINT}/${name}/entries/${entry}`);
    return (await apigeeapi())
        .delete(`${ENDPOINT}/${name}/entries/${entry}`)
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
 * @returns {JSON} {'kvm': [{name: 'name', value: 'value'}]}
 */
async function getAllStateKVMEntries() {
    let kvms = {};

    const dir = `${getStateLocation()}/${getResourcePath('kvms')}`;
    const files = readDir(dir);
    for (let i = 0; i < files?.length; i++) {
        let fileName = path.join(dir, files[i]);
        // this will encrypt the file if is not alreayd and return the decrypted content. This way all secrets will be encryted.
        let file = await cryptFile(fileName, '^(value)$');
        if (!file) throw new Error(`Could not read file ${fileName}`);

        config = JSON.parse(file);
        Object.entries(config)?.forEach(([key, value]) => {
            kvms[key] = value;
        })
    }
    return kvms;
}

/*----------------------------------Import/Export----------------------------------*/

/**
 * @returns
 */
async function exportKVMs() {
    const kvms = await getKVMs();

    // To remove all old configs
    rmDir(`${getExportLocation()}/${getResourcePath('kvms')}`)

    //for(let i = 0; i < kvms?.length; i++) {
    kvms?.forEach(async kvm => {
        //let kvm = kvms[i];
        const filePath = `${getExportLocation()}/${getResourcePath('kvms')}/${kvm}.config`;
        let entries = await getKVMEntries(kvm);
        entries = entries.keyValueEntries?.map(x => ({ name: x.name, value: tryParseJSON(x.value) }));

        writeFile(filePath, JSON.stringify({ [kvm]: entries }, undefined, 2));
        await encryptFile(filePath, '^(value)$');
        console.log(`KVMs were exported to '${filePath}'`);
    });
    //};
}

/**
 * @returns
 */
async function deployKVMs() {
    const dir = `${getStateLocation()}/${getResourcePath('kvms')}`;
    readDirAsync(dir, async (error, files) => {
        if (error) {
            console.log(error);
            throw error;
        }

        let entriesDeployed = await getAllKVMEntries();
        files?.forEach(async (fileName) => {
            let changed = false;

            let filePath = path.join(dir, fileName);
            // this will encrypt the file if is not alreayd and return the decrypted content. This way all secrets will be encryted.
            let file = await cryptFile(filePath, '^(value)$');
            if (!file) throw new Error(`Could not read file ${filePath}`);

            config = JSON.parse(file);

            Object.keys(config)?.forEach(async (kvm) => {
                // remove irrelevant fields if exists
                delete config[kvm]?.createdAt;
                delete config[kvm]?.lastModifiedAt;

                if (!(kvm in entriesDeployed)) {
                    await createKVM(kvm, true);
                    changed = true;
                }

                config[kvm]?.forEach(async (entry) => {
                    let entryValueHash = entry.value ? crypto.createHash('md5').update(tryStringifyJSON(entry.value)).digest('hex') : undefined;
                    let entryValueDeployed = entriesDeployed[kvm]?.find(e => e.name === entry.name);

                    // remove irrelevant fields if exists
                    delete entryValueDeployed?.createdAt;
                    delete entryValueDeployed?.lastModifiedAt;

                    let entryHashDeployed = entryValueDeployed && 'value' in entryValueDeployed ?
                        crypto.createHash('md5').update(tryStringifyJSON(entryValueDeployed.value)).digest('hex') : undefined;
                    if (entryValueHash && entryValueHash !== entryHashDeployed) {
                        await setKVMEntry(kvm, entry.name, tryStringifyJSON(entry.value))
                        changed = true;
                    }
                });
                console.log(`KVM '${kvm}'${!changed ? " already" : ""} deployed`);
            });
        });
    });
}

/**
 * @returns
 */
async function undeployKVMs() {
    let kvmsDeployed = await getAllKVMEntries();
    let kvmsState = await getAllStateKVMEntries();

    Object.keys(kvmsDeployed)?.forEach(async (kvm) => {
        if (!(kvm in kvmsState)) {
            await deleteKVM(kvm);
            console.log(`KVM '${kvm}' undeployed`);
        } else {
            kvmsDeployed[kvm]?.forEach(async (entry) => {
                if (!(kvmsState[kvm].find((e) => e.name === entry.name))) {
                    await deleteKVMEntry(kvm, entry.name);
                    console.log(`Entry '${entry.name}' from KVM '${kvm}' was removed`);
                }
            });
        }
    });
}


module.exports = {
    setEndpointKVM: setEndpoint,
    getAllKVMEntries: getAllKVMEntries,
    getAllStateKVMEntries: getAllStateKVMEntries,
    exportKVMs: exportKVMs,
    deployKVMs: deployKVMs,
    undeployKVMs: undeployKVMs
};