/**
 * General Usage:
 * import { translator } from "../language";
 * 
 * const translate = translator(options.language);
 * console.log(translate('SOME_STR'));
 * 
 * ... or ...
 * 
 * import { translate } from "../language";
 * 
 * console.log(translate(options.language, 'SOME_STR'));
 */

const texts = {
    'de': {
        'COULD_NOT_FIND_TASK_COLLECTION': "Konnte Aufgabensammlung nicht laden",
        'COULD_NOT_START_TASK': "Konnte Aufgabe nicht starten, Aufgabenname fehlt!",
        'COULD_NOT_LOAD_TASK': "Konnte Aufgabe nicht laden",
        'NO_OUTPUT': "Keine Ausgaben...",
        'ERROR_WHILE_RUNNING_CODE': 'Fehler beim Ausführen des Codes',
        'ERROR_WHILE_TESTING_CODE': 'Fehler beim Testen des Codes',
        'COULD_NOT_LOAD_SAMPLE_SOLUTION': 'Musterlösung konnten nicht geladen werden.',
        'OWN_SOLUTION_REQUIRED': 'Lösungen können erst geladen werden, wenn eine eigene Lösung bereit liegt.',
        'NO_SAMPLE_SOLUTION': 'Lösungen konnten nicht geladen werden.',
        'ERROR_WHILE_GRADING': 'Fehler beim Bewerten der Lösung',
        'START': "Starten",
        'JOIN': "Beitreten",
        'NO_KEY_PROVIDED': 'Kein Key eingegeben?',
        'DESCRIPTION': 'Beschreibung',
        'CONSOLE': 'Konsole',
        'TERMINAL': 'Terminal',
        'TESTS': 'Tests',
        'SAMPLE_SOLUTION': 'Musterlösung',
        'ASK_FOR_SHOW_SAMPLE_SOLUTION': "Wirklich die Musterlösung anzeigen, bevor eine eigene Lösung umgesetzt wurde?",
        'SHOW': "Anzeigen",
        'SOLUTIONS': "Lösungen",
        'RESET_CURRENT_SOLUTION': 'Aktuellen Stand wirklich zurücksetzen?',
        'ALREADY_TESTED': 'Bereits erfolgreich getestet!',
        'SUCCESS_MSG_TESTS': "Gratulation, die Tests waren erfolgreich",
        'FAILED_MSG_TESTS': "Etwas stimmt noch nicht, prüfe deine Lösung",
        'COMPILE_ERROR_MSG': "Compiler-Fehler, prüfe deinen Quellcode",
        'SUCCESS_MSG_RUN': "Gratulation, die Lösung konnte ausgeführt werden.",
        'RESULT_IS': "Ergebnis ist",
        'EXPECTED_WAS': "ewartet war jedoch",
        'THE_RESULT_WAS': "Das Ergebnis ist",
        'SEND': "Senden",
        'START_HELP': "Senden",
        'START_CODE_REVIEW': "Starte Code-Review",
        'CODE_REVIEW': "Code-Review",
        'CODE_REVIEW_NOTE': "Deine Lösung ist bereit für einen Review. Starte den Code-Review, um deine Lösung einzusenden.",
        'CODE_HELP': "Hilfe zur Aufgabe",
        'CODE_HELP_NOTE': "Deine Lösung ist noch nicht fertig. Wenn du hilfe brauchst, frag danach.",
        'CODE_HELP_PLACEHOLDER': "Was stimmt nicht mit meiner Lösung?",
        'CODE_ADDITIONAL_QUESTION_PLACEHOLDER': "Kannst du das weiter erklären?",
        'RESULT': "Ergebnis",
        'ERROR_WHILE_LOADING_CODE_REVIEW': "Konnte Code-Review nicht laden",
        'I_DONT_WANT_TO_USE_CODE_REVIEW': "Ich möchte kein Code-Review nutzen",
        'I_DONT_WANT_TO_USE_CODE_REVIEW_TEXT': "Soll wirklich auf das Code-Review verzichtet werden? Die Lösung wird eingesendet, hinterlegt und von einem Dozierenden bewertet.",
        'CODE_REVIEW_TERMS': "Hinweise zum Datenschutz",
        'CODE_REVIEW_TERMS_TEXT': "Bei dieser Anwendung wird großer Wert auf den Schutz von Daten gelegt. Die Plattform ermöglicht es, Code-Aufgaben direkt im Browser zu lösen und die Ergebnisse zur Überprüfung an einen KI-Assistenten (wie Claude oder ChatGPT) zu senden, wobei anschließend Fragen zum Code gestellt werden können.\n\nDer eingegebene Code sowie alle Fragen werden an den KI-Assistenten übermittelt. Es ist wichtig zu beachten, dass keine personenbezogenen Daten in den Code oder die Fragen eingegeben werden sollten. Dies umfasst vollständige Namen, Kontaktdaten, Zugangsdaten, Passwörter, finanzielle Informationen oder andere identifizierende Informationen.\n\nDie KI-Assistenten werden von Drittanbietern bereitgestellt, und die Verarbeitung der übermittelten Daten erfolgt gemäß deren Datenschutzrichtlinien. Der Code und die Kommunikation mit dem KI-Assistenten können für Verbesserungen des Dienstes gespeichert werden.\n\nEs wird empfohlen, in Beispiel-Codes keine realen Zugangsdaten oder sensiblen Informationen zu verwenden, keinen Code zu schreiben, der auf personenbezogene oder vertrauliche Daten zugreift, und die Weitergabe von Informationen zu vermeiden, die Rückschlüsse auf die Identität zulassen können.",
        'ABORT': "Abbrechen",
        'CONFIRM': "Bestätigen",
        'NEW_SOLUTION_SUBMITTED': "Neue Lösung eingereicht, bitte Code-Review starten.",
        'SUBMITTED_SOLUTION_SUCCESSFUL': "Ihre Lösung wurde erfolgreich eingereicht.",
        'SUBMITTED_SOLUTION_WITH_NO_CODE_REVIEW': "Ihre Lösung wurde eingereicht, ohne Code-Review.",
        'SUBMITTED_SOLUTION_WITH_BAD_SCORE': "Ihre Lösung wurde eingereicht, aber die Bewertung ist nicht gut genug (min. {{score}}).",
        'CODE_REVIEW_FAILED': "Fehler bei Code-Review, bitte noch einmal versuchen",
        'THIS_IS_A_BAD_REVIEW': "Der Review stimmt nicht",
        'THIS_IS_A_BAD_REVIEW_TEXT': "Der Review scheint nicht zu stimmen. Bitte prüfe meine Lösung und diesen Review.",
        'THIS_IS_A_BAD_REVIEW_PLACEHOLDER': "Was stimmt nicht?",
        'MAX_CODE_REVIEW_NOTE': "Sie haben die maximale Anzahl an Fragen erreicht.",
        'SUBMITTED_SOLUTION_MISSING_CODE_REVIEW': "Lösung wurde eingereicht, aber ohne Code-Review. Bitte Code erneut ausführen.",
        'PLEASE_RUN_CODE_AGAIN': "Bitte führen Sie Ihren Code erneut aus und starten Sie den Code-Review.",
        'MIN_SCORE_NOTE': "Für diese Aufgabe ist ein Review notwendig, der Score sollte dabei mindestens {{score}} betragen. Wenn die Aufgabe erfolgreich ausgeführt wurde, starte den Code-Review.",
    },
    'en': {
        'COULD_NOT_FIND_TASK_COLLECTION': "Could not load task collection",
        'COULD_NOT_START_TASK': "Could not start task, task name is missing!",
        'COULD_NOT_LOAD_TASK': "Could not load task",
        'NO_OUTPUT': "No outputs...",
        'ERROR_WHILE_RUNNING_CODE': 'Error when running the code',
        'ERROR_WHILE_TESTING_CODE': 'Error when testing the code',
        'COULD_NOT_LOAD_SAMPLE_SOLUTION': 'Sample solution could not be loaded.',
        'OWN_SOLUTION_REQUIRED': 'Solutions can only be loaded when a personal solution is ready.',
        'NO_SAMPLE_SOLUTION': 'Solutions could not be loaded.',
        'ERROR_WHILE_GRADING': 'Error when grading the solution',
        'START': "Start",
        'JOIN': "Join",
        'NO_KEY_PROVIDED': 'No key provided?',
        'DESCRIPTION': 'Description',
        'CONSOLE': 'Console',
        'TERMINAL': 'Terminal',
        'TESTS': 'Tests',
        'SAMPLE_SOLUTION': 'Sample Solution',
        'ASK_FOR_SHOW_SAMPLE_SOLUTION': "Do you really want to display the sample solution before providing your own solution?",
        'SHOW': "Show",
        'SOLUTIONS': "Solutions",
        'RESET_CURRENT_SOLUTION': 'Really reset the current status?',
        'ALREADY_TESTED': 'Already successfully tested!',
        'SUCCESS_MSG_TESTS': "Congratulations, the tests were successful",
        'FAILED_MSG_TESTS': "Something is still wrong, check your solution",
        'COMPILE_ERROR_MSG': "Compiler errors, check your source code",
        'SUCCESS_MSG_RUN': "Congratulations, the solution has been successfully executed.",
        'RESULT_IS': "The result is",
        'EXPECTED_WAS': "but should be",
        'THE_RESULT_WAS': "The result was",
        'SEND': "Send",
        'START_HELP': "Send",
        'START_CODE_REVIEW': "Start Code Review",
        'CODE_REVIEW': "Code Review",
        'CODE_REVIEW_NOTE': "Your current solution is ready for review. Start the code review, to submit your solution.",
        'CODE_HELP': "Help with this Task",
        'CODE_HELP_NOTE': "Your current solution is not ready for review. If you need help, ask for it.",
        'CODE_HELP_PLACEHOLDER': "What do i miss with my current solution?",
        'CODE_ADDITIONAL_QUESTION_PLACEHOLDER': "Can you explain this further?",
        'RESULT': "Result",
        'ERROR_WHILE_LOADING_CODE_REVIEW': "Could not load code review",
        'I_DONT_WANT_TO_USE_CODE_REVIEW': "I don't want to use code review",
        'I_DONT_WANT_TO_USE_CODE_REVIEW_TEXT': "Do you really want to do without the code review? The solution is sent in, stored and assessed by a lecturer.",
        'CODE_REVIEW_TERMS': "Privacy Notice",
        'CODE_REVIEW_TERMS_TEXT': "This application places great importance on data protection. The platform allows users to solve coding tasks directly in the browser and send the results to an AI assistant (such as Claude or ChatGPT) for review, after which questions about the code can be asked.\n\nThe entered code and all questions are transmitted to the AI assistant. It is important to note that no personal data should be entered into the code or questions. This includes full names, contact details, access data, passwords, financial information, or other identifying information.\n\nThe AI assistants are provided by third-party vendors, and the processing of submitted data is carried out in accordance with their privacy policies. The code and communication with the AI assistant may be stored for service improvements.\n\nIt is recommended not to use real access data or sensitive information in example code, not to write code that accesses personal or confidential data, and to avoid sharing information that could allow conclusions about one's identity.",
        'ABORT': "Abort",
        'CONFIRM': "Confirm",
        'NEW_SOLUTION_SUBMITTED': "New solution submitted, start code review.",
        'SUBMITTED_SOLUTION_SUCCESSFUL': "Your solution has been submitted successfully.",
        'SUBMITTED_SOLUTION_WITH_NO_CODE_REVIEW': "Your solution has been submitted successfully with no code review.",
        'SUBMITTED_SOLUTION_WITH_BAD_SCORE': "Your solution has been submitted but the score is not good enough (min. {{score}}).",
        'THIS_IS_A_BAD_REVIEW': "Review seems to be bad",
        'THIS_IS_A_BAD_REVIEW_TEXT': "The review seems to be bad. Please check my solution and this review.",
        'THIS_IS_A_BAD_REVIEW_PLACEHOLDER': "What is wrong?",
        'MAX_CODE_REVIEW_NOTE': "You have reached the maximum number of questions.",
        'SUBMITTED_SOLUTION_MISSING_CODE_REVIEW': "Solution has been submitted, but no code review. Please run code again.",
        'PLEASE_RUN_CODE_AGAIN': "Please run code your again and trigger code review.",
        'MIN_SCORE_NOTE': "For this task, a review is required, the score should be at least {{score}}. If the task was successfully executed, start the code review.",
    }
}

export function translate(language, name, _default = "", replacements = undefined) {
    let text = texts[language] && texts[language][name] ? texts[language][name] : (_default || name);
    if(replacements) {
        for (const [key, value] of Object.entries(replacements)) {
            text = text.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
    }
    return text;
}

export function translator(language) {
    return (name, _default, args = undefined) => translate(language, name, _default, args);
}