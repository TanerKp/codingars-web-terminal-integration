import { translator } from "../../language";

export function testResultViewElement(options) {
    const translate = translator(options.language);
    const successMessage = (type, message, expected, actual) => {
        if(type == "fail" || type == "assertTrue") {
            return message;
        }
        return `${message}: ${translate('RESULT_IS')} "${expected}"`
    }
    const failedMessage = (type, message, expected, actual) => {
        if(type == "fail" || type == "assertTrue") {
            return message;
        }
        return `${message}: ${translate('THE_RESULT_WAS')} "${actual}", ${translate('EXPECTED_WAS')} "${expected}"`;
    }
    
    const container = document.createElement("div");
    container.classList.add('coding-ars-test-results');

    container.controller = {};
    container.controller.addResult = (result) => {
        const element = document.createElement("div");
        if(result.failed && result.missing) {
            element.classList.add('coding-ars-assert-missing');
            element.textContent = failedMessage(result.type, result.message, result.expected, result.actual || "");
        } else if(result.failed) {
            element.classList.add('coding-ars-assert-failed');
            element.textContent = failedMessage(result.type, result.message, result.expected, result.actual || "");
        } else {
            element.classList.add('coding-ars-assert-success');
            element.textContent = successMessage(result.type, result.message, result.expected, result.actual || "");
        }
        container.appendChild(element);
    }
    container.controller.replaceResults = (results) => {
        container.innerHTML = "";
        for(let i = 0; i < results.length; ++ i) {
            container.controller.addResult(results[i]);
        }
    }

    return container;
}

// {
//     "compileResults": [],
//     "message": "",
//     "testOutput": {
//         "message": "2 error(s)!",
//         "errors": [],
//         "testResults": [
//             {
//                 "failed": true,
//                 "type": "assertEqualsString",
//                 "message": "(REF00)",
//                 "expected": "Wuff",
//                 "actual": "",
//                 "file": "NativeMethodAccessorImpl.java",
//                 "line": 62
//             },
//             {
//                 "failed": true,
//                 "type": "assertEqualsString",
//                 "message": "(REF01)",
//                 "expected": "Miau",
//                 "actual": "",
//                 "file": "NativeMethodAccessorImpl.java",
//                 "line": 62
//             }
//         ]
//     }
// }