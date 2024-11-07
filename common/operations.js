const {
    getOriginOrg,
    getOriginEnv,
    getTargetOrg,
    getTargetEnv,
    setOriginOrg,
    setOriginEnv,
    setTargetOrg,
    setTargetEnv
} = require("../common/globals");

const {
    compare
} = require("../common/utils");

const {
    setEndpointKVM,
    getAllKVMEntries,
    getAllStateKVMEntries,
    exportKVMs,
    deployKVMs,
    undeployKVMs
} = require("../operations/kvm");

const {
    setEndpointTS,
    getAllTargetServers,
    getAllStateTargetServers,
    exportTargetServers,
    deployTargetServers,
    undeployTargetServers
} = require("../operations/targetServers");

const {
    setEndpointAP,
    getAllEnvApiProducts,
    getAllStateApiProducts,
    exportApiProducts,
    deployApiProducts,
    undeployApiProducts
} = require("../operations/apiProducts");

const {
    setEndpointDEV,
    getAllDevelopers,
    getAllStateDevelopers,
    exportDevelopers,
    deployDevelopers,
    undeployDevelopers
} = require("../operations/developers");

const {
    setEndpointAPP,
    getAllApps,
    getAllStateApps,
    exportApps,
    deployApps,
    undeployApps
} = require("../operations/apps");

const resourceExport = {
    'instances':            undefined,
    'instanceAttachments':  undefined,
    'envGroups':            undefined,
    'envGroupsAttachments': undefined,
    'kvms':                 async (org, env) => {
                                setOriginOrg(org);
                                setOriginEnv(env);
                                setEndpointKVM(org, env);
                                await exportKVMs();
                            },
    'targetServers':        async (org, env) => {
                                setOriginOrg(org);
                                setOriginEnv(env);
                                setEndpointTS(org, env);
                                await exportTargetServers();
                            },
    'apiProducts':        async (org, env) => {
                                setOriginOrg(org);
                                setOriginEnv(env);
                                setEndpointAP(org, env);
                                await exportApiProducts();
                            },
    'developers':         async (org, env) => {
                                setOriginOrg(org);
                                setOriginEnv(env);
                                setEndpointDEV(org, env);
                                await exportDevelopers();
                            },
    'apps':                 async (org, env) => {
                                setOriginOrg(org);
                                setOriginEnv(env);
                                setEndpointAP(org, env);
                                setEndpointAPP(org, env);
                                await exportApps();
                            },
    'apiProxies':              undefined,
    'sharedFlows':          undefined,
    'flowHooks':            undefined
};

const resourceAudit = {
    'instances':            undefined,
    'instanceAttachments':  undefined,
    'envGroups':            undefined,
    'envGroupsAttachments': undefined,
    'kvms':                 async (useLocalState) => {
                                let originKVMs;
                                if(useLocalState) {
                                    originKVMs = await getAllStateKVMEntries();
                                } else {
                                    setEndpointKVM(getOriginOrg(), getOriginEnv());
                                    originKVMs = await getAllKVMEntries();
                                }
                                setEndpointKVM(getTargetOrg(), getTargetEnv());
                                let targetKVMs = await getAllKVMEntries();
                                compare(originKVMs, targetKVMs, 'KVMs', 'json');
                            },
    'targetServers':        async (useLocalState) => {
                                let originServers;
                                if(useLocalState) {
                                    originServers = await getAllStateTargetServers();
                                } else {
                                    setEndpointTS(getOriginOrg(), getOriginEnv());
                                    originServers = await getAllTargetServers();
                                }
                                setEndpointTS(getTargetOrg(), getTargetEnv());
                                let targetServers = await getAllTargetServers();
                                compare(originServers, targetServers, 'Target Servers', 'json');
                            },
    'apiProducts':          async (useLocalState) => {
                                let originApiProducts;
                                if(useLocalState) {
                                    originApiProducts = await getAllStateApiProducts(true);
                                } else {
                                    setEndpointAP(getOriginOrg(), getOriginEnv());
                                    originApiProducts = await getAllEnvApiProducts(true);
                                }
                                setEndpointAP(getTargetOrg(), getTargetEnv());
                                let targetApiProducts = await getAllEnvApiProducts(true);
                                compare(originApiProducts, targetApiProducts, 'API Products', 'json');
                            },
    'developers':           async (useLocalState) => {
                                let originDevelopers;
                                if(useLocalState) {
                                    originDevelopers = await getAllStateDevelopers(true);
                                } else {
                                    setEndpointDEV(getOriginOrg(), getOriginEnv());
                                    originDevelopers = await getAllDevelopers(true);
                                }
                                setEndpointDEV(getTargetOrg(), getTargetEnv());
                                let targetDevelopers = await getAllDevelopers(true);
                                compare(originDevelopers, targetDevelopers, 'Developers', 'json');
                            },
    'apps':                 async (useLocalState) => {
                                let originApps;
                                if(useLocalState) {
                                    originApps = await getAllStateApps(true);
                                } else {
                                    setEndpointAPP(getOriginOrg(), getOriginEnv());
                                    originApps = await getAllApps(true);
                                }
                                setEndpointAPP(getTargetOrg(), getTargetEnv());
                                let targetApps = await getAllApps(true);
                                compare(originApps, targetApps, 'Apps', 'json');
                            },
    'apiProxies':              undefined,
    'sharedFlows':          undefined,
    'flowHooks':            undefined
};

const resourceDeploy = {
    'instances':            undefined,
    'instanceAttachments':  undefined,
    'envGroups':            undefined,
    'envGroupsAttachments': undefined,
    'kvms':                 async (org, env) => {
                                setTargetOrg(org);
                                setTargetEnv(env);
                                setEndpointKVM(org, env);
                                await deployKVMs();
                            },
    'targetServers':        async (org, env) => {
                                setTargetOrg(org);
                                setTargetEnv(env);
                                setEndpointTS(org, env);
                                await deployTargetServers();
                            },
    'apiProducts':          async (org, env) => {
                                setTargetOrg(org);
                                setTargetEnv(env);
                                setEndpointAP(org, env);
                                await deployApiProducts();
                            },
    'developers':           async (org, env) => {
                                setTargetOrg(org);
                                setTargetEnv(env);
                                setEndpointDEV(org, env);
                                await deployDevelopers();
                            },
    'apps':                 async (org, env) => {
                                setTargetOrg(org);
                                setTargetEnv(env);
                                setEndpointAPP(org, env);
                                await deployApps();
                            },
    'apiProxies':              undefined,
    'sharedFlows':          undefined,
    'flowHooks':            undefined
};

const resourceUndeploy = {
    'instances':            undefined,
    'instanceAttachments':  undefined,
    'envGroups':            undefined,
    'envGroupsAttachments': undefined,
    'kvms':                 async (org, env) => {
                                setTargetOrg(org);
                                setTargetEnv(env);
                                setEndpointKVM(org, env);
                                await undeployKVMs();
                            },
    'targetServers':        async (org, env) => {
                                setTargetOrg(org);
                                setTargetEnv(env);
                                setEndpointTS(org, env);
                                await undeployTargetServers();
                            },
    'apiProducts':          async (org, env) => {
                                setTargetOrg(org);
                                setTargetEnv(env);
                                setEndpointAP(org, env);
                                await undeployApiProducts();
                            },
    'developers':           async (org, env) => {
                                setTargetOrg(org);
                                setTargetEnv(env);
                                setEndpointDEV(org, env);
                                await undeployDevelopers();
                            },
    'apps':                 async (org, env) => {
                                setTargetOrg(org);
                                setTargetEnv(env);
                                setEndpointAPP(org, env);
                                await undeployApps();
                            },
    'apiProxies':              undefined,
    'sharedFlows':          undefined,
    'flowHooks':            undefined
};

const getResourceExport = (resource) => {
    return resourceExport[Object.keys(resourceExport).find(key =>
        key.toLowerCase().replace(/\s+/g,'') === resource.toLowerCase().replace(/\s+/g,''))];
}

const getResourceAudit = (resource) => {
    return resourceAudit[Object.keys(resourceAudit).find(key =>
        key.toLowerCase().replace(/\s+/g,'') === resource.toLowerCase().replace(/\s+/g,''))];
}

const getResourceDeploy = (resource) => {
    return resourceDeploy[Object.keys(resourceDeploy).find(key =>
        key.toLowerCase().replace(/\s+/g,'') === resource.toLowerCase().replace(/\s+/g,''))];
}

const getResourceUndeploy = (resource) => {
    return resourceUndeploy[Object.keys(resourceUndeploy).find(key =>
        key.toLowerCase().replace(/\s+/g,'') === resource.toLowerCase().replace(/\s+/g,''))];
}

module.exports = {
    getResourceExport,
    getResourceAudit,
    getResourceDeploy,
    getResourceUndeploy,
}