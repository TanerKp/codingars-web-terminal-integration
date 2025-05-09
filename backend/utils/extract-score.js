/**
 * Extrahiert Scores im Format X/Y, wobei das Schlüsselwort "Score" vorhanden sein muss.
 * Die Funktion erkennt "Score" in verschiedenen Kontexten, mit beliebigem Text dazwischen 
 * und ignoriert Markdown-Formatierungen.
 * 
 * Anwendungsbeispiele:
 * - "Score: 8/10"
 * - "Final Score: 10/10"
 * - "**Score:** 9/10"
 * - "_Score: 9/10_\nMore Text"
 * - "Some Text\nScore (on a scale of 10): 8/10"
 */

//const scoreRegex = /\bScore\b[\s\S]*?(\d+(?:[.,]\d+)?)[\s\S]*?(?:\/|／|⁄|\\)[\s\S]*?(\d+(?:[.,]\d+)?)/i;
const scoreRegex = /Score(?:[^0-9]|_)*?(\d+(?:[.,]\d+)?)(?:[^0-9]|_)*?(?:\/|／|⁄|\\|out of|von|from)(?:[^0-9]|_)*?(\d+(?:[.,]\d+)?)/i;

module.exports = (text) => {
    // Alle Vorkommen finden, nicht nur das erste
    const matches = [...text.matchAll(new RegExp(scoreRegex, 'gi'))];
    
    if (matches.length > 0) {
        // Das letzte Vorkommen verwenden
        const lastMatch = matches[matches.length - 1];
        
        // Ersetze Kommas durch Punkte für die korrekte Umwandlung in Zahlen
        const valueA = parseFloat(lastMatch[1].replace(',', '.'));
        const valueB = parseFloat(lastMatch[2].replace(',', '.'));
        
        return {
            a: valueA,
            b: valueB,
            ratio: valueA / valueB
        };
    }
    
    return null;
};