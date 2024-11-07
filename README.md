# apigeecli - Apigee Client
This is a simple CLI tool to help extracting and deploying resources from Apigee X

## Dependencies
Go to tool location
```bash
cd ./apigee/apigee-cli  
```

Use the package manager [npm](https://www.npmjs.com/) to install all the necessary dependencies.
```bash
npm install
```

## Settings
Before using the tool, you will need to create a copy of 'env' file  and to rename the copy to '.env'. This file will contain the following fields:
- AUTH_TOKEN = google access token

Here you can find how to [Authenticate to your GCP project](https://cloud.google.com/sdk/gcloud/reference/auth/login) and [Generate the Access Token](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/print-access-token)

## Usage
To interact with apigee-cli, please use the arrow keys
#### Run the tool
```bash
npm start  
```

#### Choose the environment
```bash
---  Apigee cli tool ---
? Choose a environment:
> dev 
  test 
  uat
  staging
  prod
```

#### Choose the operation ([Extract](#extract) | [Deploy](#deploy))
```bash
? What do you want to do:
> Extract resources
  Deploy resources 
```

## Extract
#### Extract resource type 
```bash
? What do you want extract:
> Proxy
  Sharedflow
```

#### Set output location
```bash
? Enter the desired output location: (../resources/proxies)
> ...
```
> **Note**: Confirm to continue with default or the path you desire on your local machine

#### Choose the resources you want to extract
```bash
? Choose an option:
> Single Proxy
  All Proxies

```

#### Extract single resource
```bash
? Choose an option:
> api1
  api2
  helloWorld
  ...
    
```

#### Select a revision option
```bash
? Choose an option:
> Deployed revision
  Choose revision

```

#### Choose a revision
```bash
? Choose a revision:
> 1
  2
  3
  ...
```

```bash
helloWorld.zip revision 6 successfully downloaded
```

## Deploy
To indicate which resources should be deployed, go to 
***/apigee/resources/deployments*** folder.

This folder will contain the following JSON files 
*(both files follow the same pattern)*:
- *apiproxies.json*
- *sharedflows.json*

Now you add the resources you wish to deploy to the corresponding file:
```
# apiproxies.json
{
    "helloWorld": {
        "revision": 1     # Allowed values: (Integer || 'latest')
    },
    "tests": {
        "revision": 3
    },
    ...
}
```
> **Note**: *latest* ->  Get the latest revision of an environment

#### Set target environment
```bash
? Choose the target environment:
  dev 
> test 
  uat
  staging
  prod
```

#### Deploy resource type 
```bash
? What do you want deploy:
> Proxy
  Sharedflow
```

#### Confirm deployment to selected environment
```bash
? Confirm deployment to default-test:
> Yes
  No
```
```bash
helloWorld.zip revision 6 successfully deployed to default-test
```
