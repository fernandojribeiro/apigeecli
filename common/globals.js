const lodash = require('lodash');

var ORIGIN_ORG;
var ORIGIN_ENV;
var TARGET_ORG;
var TARGET_ENV;

var PATH_STATE = './state/${TARGET_ORG}/${TARGET_ENV}';
var PATH_EXPORT = './export/${ORIGIN_ORG}/${ORIGIN_ENV}';
var PATH_SOURCECODE = '../resources/apiproxies';

const GOOGLEAPIS_APIGEE_HOSTNAME = `https://apigee.googleapis.com`;
const WAIT_COMPLETE_MAX_ATTEMPTS = 10;
const WAIT_COMPLETE_SLEEP_MS = 500;

const resourcePath = {
    'instances':            'env/instances',
    'instanceAttachments':  'env/instanceAttachments',
    'envGroups':            'env/envGroups',
    'envGroupsAttachments': 'env/envGroupsAttachments',
    'kvms':                 'config/kvms',
    'targetServers':        'config/targetServers',
    'apiProducts':          'config/apiProducts',
    'developers':           'config/developers',
    'apps':                 'config/apps',
    'apiProxies':           'bundles/apiProxies',
    'sharedFlows':          'bundles/sharedFlows',
    'flowHooks':            'flows/flowHooks'
};

const envMapping = {
    'us:dev':       'dev',
    'us:test':      'test',
    'us:uat':       'uat',
    'us:staging':   'staging',
    'us:prod':      'prod',
    'gbl:dev':      'dev',
    'gbl:prod':     'prod'
};

const orgMapping = {
    'us:dev':       'us-apimanagement-dev',
    'us:test':      'us-apimanagement-dev',
    'us:uat':       'us-apimanagement-dev',
    'us:staging':   'us-apimanagement-prd',
    'us:prod':      'us-apimanagement-prd',
    'gbl:dev':      'gbl-apimanagement-dev',
    'gbl:prod':     'gbl-apimanagement-prd'
};

const resources = [
    'All',
    'Instances',
    'Instance Attachments',
    'EnvGroups',
    'EnvGroups Attachments',
    'KVMs',
    'Target Servers',
    'API Products',
    'Developers',
    'Apps',
    'API Proxies',
    'Shared Flows',
    'Flow Hooks'
];

const getGoogleAPIsApigeeHostname = () => {
    return GOOGLEAPIS_APIGEE_HOSTNAME;
}

const getWaitCompleteMaxAttempts = () => {
    return WAIT_COMPLETE_MAX_ATTEMPTS;
}

const getWaitCompleteSleepMs = () => {
    return WAIT_COMPLETE_SLEEP_MS;
}

const getOrgs = () => {
    return Object.values(orgMapping);
}

const getOrg = (sEnv) => {
    return orgMapping[sEnv.toLowerCase()];
}

const getOrgEnvs = () => {
    return Object.keys(envMapping);
}

const getEnvs = () => {
    return Object.values(envMapping);
}

const getEnv = (sEnv) => {
    return envMapping[sEnv.toLowerCase()];
}

const getEnvOrg = (sEnv) => {
    let env = !getEnv(sEnv) ? Object.keys(envMapping).find(k => envMapping[k] === sEnv) : sEnv;

    return orgMapping[env.toLowerCase()];
}

const getResources = () => {
    return resources;
}

const getResourcePath = (resource) => {
    return resourcePath[Object.keys(resourcePath).find(key =>
        key.toLowerCase().replace('/\s+/g','') === resource.toLowerCase().replace(/\s+/g,''))];
}

const getExportLocation = () => {
    return lodash.template(PATH_EXPORT)({ORIGIN_ORG: ORIGIN_ORG, ORIGIN_ENV: ORIGIN_ENV});
}

const getStateLocation = () => {
    return lodash.template(PATH_STATE)({TARGET_ORG: TARGET_ORG, TARGET_ENV: TARGET_ENV});
}

const getSourceCodeLocation = () => {
    return lodash.template(PATH_SOURCECODE)({TARGET_ORG: TARGET_ORG, TARGET_ENV: TARGET_ENV});
}

const getOriginOrg = () =>  { 
    return ORIGIN_ORG;
}

const getOriginEnv = () => {
    return ORIGIN_ENV;
}

const getTargetOrg = () =>  { 
    return TARGET_ORG;
}

const getTargetEnv = () => {
    return TARGET_ENV;
}

const setOriginOrg = (sOrg) => {
    ORIGIN_ORG = sOrg;
    return ORIGIN_ORG;
}

const setOriginEnv = (sEnv) => {
    ORIGIN_ENV = getEnv(sEnv) || sEnv;
    return ORIGIN_ENV;
}

const setTargetOrg = (sOrg) => {
    TARGET_ORG = sOrg;
    return TARGET_ORG;
}

const setTargetEnv = (sEnv) => {
    TARGET_ENV = getEnv(sEnv) || sEnv;
    return TARGET_ENV;
}

module.exports = {
    getGoogleAPIsApigeeHostname,
    getWaitCompleteMaxAttempts,
    getWaitCompleteSleepMs,
    getOrgs,
    getOrg,
    getOrgEnvs,
    getEnvs,
    getEnv,
    getEnvOrg,
    getResources,
    getResourcePath,
    getExportLocation,
    getStateLocation,
    getSourceCodeLocation,
    getOriginOrg,
    getOriginEnv,
    getTargetOrg,
    getTargetEnv,
    setOriginOrg,
    setOriginEnv,
    setTargetOrg,
    setTargetEnv
}