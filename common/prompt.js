const inquirer = require("inquirer");

/**
 * @param {string} question          - The question to be prompted to the user
 * @param {object} fnMapping         - An object containing the mapping for a menu option 
 * @param {requestCallback} callback - The function to be executed after user choice
 * @param {*=} params                - Optional function parameters    
 * @returns
 */
async function promptQuestion(question, fnMapping, callback, args) {
    return await inquirer.prompt([
        {
            type: 'list',
            name: "option",
            message: question,
            choices: Object.keys(fnMapping)
        }
    ]).then((answer) => fnMapping[answer.option](answer.option, callback, args));
}

/**
 * @param {string} question          - The question to be prompted to the user
 * @param {string[]} list            - The list the available options
 * @param {requestCallback} callback - The function to be executed after user choice
 * @returns
 */
async function promptList(question, list, callback) {
    return await inquirer.prompt([
        {
            type: 'list',
            name: "option",
            message: question,
            choices: list
        }
    ]).then((answer) => callback(answer.option));
}

module.exports = {
    question: promptQuestion,
    list: promptList
}