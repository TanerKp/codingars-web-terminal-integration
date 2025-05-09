

// Modifications to source files, based on filePattern
const CLEAN_REGEX_LIB = [
    // PHP and HTML Files (requires both: PHP, HTML and JS)
    {filePattern: /.*?\.(html|php)$/, list: [
        {match: /\<\!\-\-\s*replace\s*\-\-\>([\s\S]*?)\<\!\-\-\s*with:\s*([\s\S]*?)\s*\-\-\>/gm, exercise: "$2", solution: "$1"},
        {match: /\<\!\-\-\s*clean\s*\-\-\>([\s\S]*?)\<\!\-\-\s*\/clean\s*\-\-\>/gm, exercise: "", solution: "$1"},
        {match: /^(\s*)(.*?)\<\!\-\-comment\-\-\>$/gm, exercise: "$1// $2", solution: "$1$2"},
        {match: /\/\*\s*replace\s*\*\/([\s\S]*?)\/\*\s*with:\s*([\s\S]*?)\s*\*\//gm, exercise: "$2", solution: "$1"},
        {match: /\/\*\s*clean\s*\*\/([\s\S]*?)\/\*\s*\/clean\s*\*\//gm, exercise: "", solution: "$1"},
        {match: /^(\s*)(.*?)\/\*comment\*\/$/gm, exercise: "$1// $2", solution: "$1$2"}
    ]},
    // Python Files
    {filePattern: /.*?\.(py)$/, list: [
        {match: /\#\s*clean([\s\S]*?)\#\s*\/clean/gm, exercise: "", solution: "$1"},
        {match: /^(\s*)(.*?)\#\s*comment$/gm, exercise: "$1# $2", solution: "$1$2"}
    ]},
    // Maven pom.xml
    {filePattern: /.*?\/pom.xml/, list: [
        {match: /(\<modelVersion\>.*?\<\/modelVersion\>\s*(\<groupId\>.*?\<\/groupId\>\s*|\<version\>.*?\<\/version\>\s*|\<name\>.*?\<\/name\>\s*)*)\<artifactId\>(.*?)\<\/artifactId\>/gm, exercise: "$1<artifactId>$3-exercise</artifactId>", solution: "$1<artifactId>$3</artifactId>"}
    ]},
    // Default (e.g. java, js, css)
    {filePattern: /.*/, list: [
        {match: /\/\*\s*replace\s*\*\/([\s\S]*?)\/\*\s*with:\s*([\s\S]*?)\s*\*\//gm, exercise: "$2", solution: "$1"},
        {match: /\/\*\s*clean\s*\*\/([\s\S]*?)\/\*\s*\/clean\s*\*\//gm, exercise: "", solution: "$1"},
        {match: /^(\s*)(.*?)\/\*comment\*\/$/gm, exercise: "$1// $2", solution: "$1$2"}
    ]}
];

module.exports = (file, content, clean) => {
    // Buffers?
    content = content.toString();
    
    // Handle file clean up
    for(var i in CLEAN_REGEX_LIB) {
        var cleaner = CLEAN_REGEX_LIB[i];
        if(file.match(cleaner.filePattern)) {
            cleaner.list.forEach(el => content = content.replace(el.match, clean ? el.exercise : el.solution));
            break;
        }
    }
    
    // Trim file to remove whitespaces
    content = content.trim();
    return content;
}