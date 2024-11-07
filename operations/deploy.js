const axios = require("axios");
const fs = require('fs');

const { sleep } = require('../common/utils');
const { apigee: api, HOSTNAME } = require('../operations/apigee');
const { getEnvironmentOrganization } = require('../common/globals');

const proxyAPI =  require('./proxy_2');
const sharedflowAPI = require("./sharedflow");
const basePath = `${HOSTNAME}/v1`;

async function initialDeployment(sResourceName, sResourceType, sRevision, sSourceEnvironment, sTargetEnvironment) { 
    try {
        if(sResourceType === 'apis') {
            if(sRevision === 'latest')
                sRevision = await proxyAPI.getLatestRevisionNumber(sResourceName, sSourceEnvironment);

            await proxyAPI.getRevision(sResourceName, sRevision, 'zip').then(async () => {
                const exportedBundle = await proxyAPI.exportBundle(sResourceName, sTargetEnvironment);
                return exportedBundle;
            })
            .catch((error) => {
                console.log(error?.response?.data?.error)
            })
        }            
    } catch (error) {
        console.log(error?.response?.data?.error)
    }
}

async function preDeploy(sResourceName, sResourceType, sRevision, sSourceEnvironment, sTargetEnvironment) {
    try {
        
        let latestRevision; 
        if(sResourceType === 'apis') 
            latestRevision = await proxyAPI.getLatestRevisionNumber(sResourceName, sTargetEnvironment);
        if(sResourceType === 'sharedflows')
            latestRevision = await sharedflowAPI.getLatestRevisionNumber(sResourceName, sTargetEnvironment);

        // Upload a initial bundle to target environment    
        if(!latestRevision) 
            await initialDeployment(sResourceName, sResourceType, sRevision, sSourceEnvironment, sTargetEnvironment)

        // Wait for completion
        await sleep(2000)

        // Update revision number if 'latest'
        if(sRevision === 'latest' && sResourceType === 'apis') 
            sRevision = await proxyAPI.getLatestRevisionNumber(sResourceName, sTargetEnvironment);
        if(sRevision === 'latest' && sResourceType === 'sharedflows') 
            sRevision = await sharedflowAPI.getLatestRevisionNumber(sResourceName, sTargetEnvironment);

        // Wait for completion
        await sleep(2000)
        
        const reqPath = `${basePath}/organizations/${getEnvironmentOrganization(sTargetEnvironment)}/environments/${sTargetEnvironment}/${sResourceType}/${sResourceName}/revisions/${sRevision}/deployments`;
        
        let deploymentReport;
        if(sResourceType === 'apis')
            deploymentReport = await api.post(`${reqPath}:generateDeployChangeReport`)

        if(deploymentReport && deploymentReport?.data?.validationErrors) 
            return deploymentReport.data.validationErrors.violations;
        
        return [];
              
    } catch (err) {
        console.log(err?.response.data?.error)
        return [err?.response.data?.error?.message];
    }
}

/**
 * 
 * @param {Array} oResources 
 * @param {string} sResourceType 
 * @param {string} sSourceEnvironment 
 * @param {string} sTargetEnvironment 
 */
 async function deployer(sResourceName, sResourceType, sRevision, sEnvironment) {
    try {
        if(sResourceType === 'apis') 
            sRevision = await proxyAPI.getLatestRevisionNumber(sResourceName, sEnvironment);
        if(sResourceType === 'sharedflows')
            sRevision = await sharedflowAPI.getLatestRevisionNumber(sResourceName, sEnvironment);

        const reqPath = `${basePath}/organizations/${getEnvironmentOrganization(sEnvironment)}/environments/${sEnvironment}/${sResourceType}/${sResourceName}/revisions/${sRevision}/deployments`;

        const deployedResource = await api.post(`${reqPath}`)
        if(deployedResource?.data)
            console.log(`\n> ${sResourceName} revision ${sRevision} successfully deployed to ${sEnvironment}`);
        
    } catch (error) {
        const code = error?.response?.data?.error?.code
        const status = error?.response?.data?.error?.status;
        const details = JSON.stringify(error?.response?.data?.error?.details[0]?.violations);
        console.log({
            "name": sResourceName,
            "type": sResourceType,
            "errorCode": code, 
            "errorStatus": status, 
            "details": details
        });
    }


}

module.exports = {
    preDeploy,
    deployer
}