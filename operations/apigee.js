process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

require("dotenv/config");

const axios = require("axios");
const hasbin = require('hasbin');

const {
    getGoogleAPIsApigeeHostname
} = require('../common/globals');

const {
    runCommand
} = require('../common/utils');

var GCLOUD_ACCESS_TOKEN = process.env.AUTH_TOKEN;

async function verifyAuth(silent = false) {
    return await axios.get(`${getGoogleAPIsApigeeHostname()}/v1/organizations`, { headers: { Authorization: "Bearer " + GCLOUD_ACCESS_TOKEN } })
        .then(() => true)
        .catch(err => {
            if (!silent) console.error(`=> Error: ${err?.response?.statusText || err?.response || err}`);
            return false;
        });
}

async function authenticate() {
    let auth = await verifyAuth(true);
    if (!GCLOUD_ACCESS_TOKEN || !auth) {
        let redirect = process.platform === "win32" ? '2>nul' : "2>/dev/null";
        if (hasbin.sync('gcloud')) {
            // iterate 2 times to get access token after login if the access token is not returned for the first time
            for (let i = 0; i < 2; i++) {
                let accessToken = runCommand(`gcloud auth print-access-token ${redirect}`)?.stdout?.trim();
                if (!accessToken) {
                    runCommand(`gcloud auth login ${redirect}`);
                } else {
                    GCLOUD_ACCESS_TOKEN = accessToken;
                    break;
                }
            }
        }
    }

    return auth ? auth : GCLOUD_ACCESS_TOKEN ? await verifyAuth() : false;
}

async function apigeeapi() {
    if (GCLOUD_ACCESS_TOKEN && await verifyAuth()) {
        return axios.create({ headers: { Authorization: "Bearer " + GCLOUD_ACCESS_TOKEN } });
    }
}

module.exports = {
    authenticate: authenticate,
    apigeeapi: apigeeapi
};
