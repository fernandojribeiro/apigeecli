const prompt = require("./common/prompt");
const controller = require("./controllers/main");
const { authenticate } = require("./operations/apigee");

(async function main() {
    if (await authenticate()) {
        console.log("------------ apigeecli: Apigee Client ------------");
        return mainMenu();
    }
})();

function mainMenu() {
    let functionsMapping = {
        'Set environment': controller.setEnvironment,
        'Audit environment': controller.auditEnvironment,
        'Export resources': controller.exportResources,
        'Deploy resources': controller.deployResources,
        'Exit': () => { console.log("Bye!"); process.exit(0) }
    };
    prompt.question("What do you want to do?", functionsMapping, mainMenu);
}