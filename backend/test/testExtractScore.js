const { expect } = require('chai');
const extractScore = require('../utils/extract-score');

describe('extractScore', () => {
  // Grundlegende Funktionalität
  it('sollte korrekte Zahlen mit Punkten als Dezimaltrennzeichen extrahieren', () => {
    const result = extractScore('Der Test ergab: Score: 8.5/10');
    expect(result).to.deep.equal({
      a: 8.5,
      b: 10,
      ratio: 0.85
    });
  });

  it('sollte korrekte Zahlen mit Kommas als Dezimaltrennzeichen extrahieren', () => {
    const result = extractScore('Der Test ergab: Score: 8,5/10');
    expect(result).to.deep.equal({
      a: 8.5,
      b: 10,
      ratio: 0.85
    });
  });

  it('sollte korrekte ganzzahlige Scores extrahieren', () => {
    const result = extractScore('Der Test ergab: Score: 8/10');
    expect(result).to.deep.equal({
      a: 8,
      b: 10,
      ratio: 0.8
    });
  });

  it('sollte korrekte ganzzahlige Scores extrahieren mit Backslash', () => {
    const result = extractScore('Der Test ergab: Score: 7\\10');
    expect(result).to.deep.equal({
      a: 7,
      b: 10,
      ratio: 0.7
    });
  });

  it('sollte korrekte ganzzahlige Scores extrahieren mit "from"', () => {
    const result = extractScore('Der Test ergab: Score: 7 from 10');
    expect(result).to.deep.equal({
      a: 7,
      b: 10,
      ratio: 0.7
    });
  });

  it('sollte korrekte ganzzahlige Scores extrahieren mit "out of"', () => {
    const result = extractScore('Der Test ergab: Score: 7 out of 10');
    expect(result).to.deep.equal({
      a: 7,
      b: 10,
      ratio: 0.7
    });
  });

  it('sollte korrekte ganzzahlige Scores extrahieren mit "von"', () => {
    const result = extractScore('Der Test ergab: Score: 7 von 10');
    expect(result).to.deep.equal({
      a: 7,
      b: 10,
      ratio: 0.7
    });
  });

  // Varianten der Formatierung
  it('sollte Scores ohne Leerzeichen zwischen "Score:" und den Zahlen erkennen', () => {
    const result = extractScore('Score:8/10');
    expect(result).to.deep.equal({
      a: 8,
      b: 10,
      ratio: 0.8
    });
  });

  it('sollte Scores mit mehreren Leerzeichen erkennen', () => {
    const result = extractScore('Score:    8/10');
    expect(result).to.deep.equal({
      a: 8,
      b: 10,
      ratio: 0.8
    });
  });

  it('sollte Scores ohne das Wort "Score" erkennen', () => {
    const result = extractScore('Die Bewertung: 7/10');
    expect(result).to.be.null;
  });

  it('sollte Scores mit dem Wort "Score" ohne Doppelpunkt erkennen', () => {
    const result = extractScore('Score 8/10');
    expect(result).to.deep.equal({
      a: 8,
      b: 10,
      ratio: 0.8
    });
  });

  // Dezimalzahlen in verschiedenen Formaten
  it('sollte Dezimalzahlen im Zähler und Nenner erkennen', () => {
    const result = extractScore('Score: 8.5/10.0');
    expect(result).to.deep.equal({
      a: 8.5,
      b: 10.0,
      ratio: 0.85
    });
  });

  it('sollte Dezimalzahlen mit Komma im Zähler und Nenner erkennen', () => {
    const result = extractScore('Score: 8,5/10,0');
    expect(result).to.deep.equal({
      a: 8.5,
      b: 10.0,
      ratio: 0.85
    });
  });

  it('sollte gemischte Dezimaltrennzeichen (Komma/Punkt) korrekt verarbeiten', () => {
    const result = extractScore('Score: 8,5/10.0');
    expect(result).to.deep.equal({
      a: 8.5,
      b: 10.0,
      ratio: 0.85
    });
  });

  // Edge Cases
  it('sollte null zurückgeben, wenn kein Score gefunden wird', () => {
    const result = extractScore('Dieser Text enthält keinen Score');
    expect(result).to.be.null;
  });

  it('sollte null zurückgeben, wenn das Format nicht stimmt', () => {
    const result = extractScore('Score: 8-10');
    expect(result).to.be.null;
  });

  it('sollte bei Scores größer als 1 korrekt arbeiten', () => {
    const result = extractScore('Score: 15/10');
    expect(result).to.deep.equal({
      a: 15,
      b: 10,
      ratio: 1.5
    });
  });

  it('sollte mit Scores umgehen können, die im Text eingebettet sind', () => {
    const result = extractScore('Die Bewertung für das Produkt ist Score: 9/10 und wurde gestern vergeben.');
    expect(result).to.deep.equal({
      a: 9,
      b: 10,
      ratio: 0.9
    });
  });

  it('sollte bei mehreren Scores im Text nur den letzten extrahieren', () => {
    const result = extractScore('Score: 8/10 ist die erste Bewertung und Score: 9/10 ist die zweite');
    expect(result).to.deep.equal({
      a: 9,
      b: 10,
      ratio: 0.9
    });
  });

  // Grenzfälle der Zahlen
  it('sollte mit sehr kleinen Dezimalzahlen umgehen können', () => {
    const result = extractScore('Score: 0.001/1');
    expect(result).to.deep.equal({
      a: 0.001,
      b: 1,
      ratio: 0.001
    });
  });

  it('sollte mit großen Zahlen umgehen können', () => {
    const result = extractScore('Score: 9999/10000');
    expect(result).to.deep.equal({
      a: 9999,
      b: 10000,
      ratio: 0.9999
    });
  });

  it('sollte "Final Score" mit Markdown-Formatierung für Fettdruck erkennen (1)', () => {
    const result = extractScore('**Final Score: 10/10**\n\nDie Lösung ist korrekt.');
    expect(result).to.deep.equal({
      a: 10,
      b: 10,
      ratio: 1
    });
  });

  it('sollte "Final Score" mit Markdown-Formatierung für Fettdruck erkennen (2)', () => {
    const result = extractScore('**Final Score:** 10/10\n\nDie Lösung ist korrekt.');
    expect(result).to.deep.equal({
      a: 10,
      b: 10,
      ratio: 1
    });
  });

  it('sollte "Score" mit Markdown-Formatierung für Fettdruck erkennen', () => {
    const result = extractScore('**Score:** 10/10\n\nDie Lösung ist korrekt.');
    expect(result).to.deep.equal({
      a: 10,
      b: 10,
      ratio: 1
    });
  });

  it('sollte "Score" mit Markdown-Formatierung für Kursiv erkennen (1)', () => {
    const result = extractScore('_Score: 10/10_\n\nDie Lösung ist korrekt.');
    expect(result).to.deep.equal({
      a: 10,
      b: 10,
      ratio: 1
    });
  });

  it('sollte "Score" mit Markdown-Formatierung für Kursiv erkennen (2)', () => {
    const result = extractScore('_Score:_ 10/10\n\nDie Lösung ist korrekt.');
    expect(result).to.deep.equal({
      a: 10,
      b: 10,
      ratio: 1
    });
  });

  it('sollte "Score" mit Emoji erkennen', () => {
    const result = extractScore('Score: 8/10 ✅');
    expect(result).to.deep.equal({
      a: 8,
      b: 10,
      ratio: 0.8
    });
  });
  
  it('sollte "Score" mit UTF-8 Checkmark erkennen', () => {
    const result = extractScore('Score: 9/10 ✓');
    expect(result).to.deep.equal({
      a: 9,
      b: 10,
      ratio: 0.9
    });
  });
  
  it('sollte "Score" mit Emoji im Text erkennen', () => {
    const result = extractScore('Die Bewertung: Score: 7/10 👍 Gut gemacht!');
    expect(result).to.deep.equal({
      a: 7,
      b: 10,
      ratio: 0.7
    });
  });
  
  it('sollte "Score" mit mehreren UTF-8 Sonderzeichen erkennen', () => {
    const result = extractScore('Final Score: 10/10 ✓ ✔ ☑ ✅');
    expect(result).to.deep.equal({
      a: 10,
      b: 10,
      ratio: 1
    });
  });
  
  it('sollte "Score" am Ende des Texts mit Emoji erkennen', () => {
    const result = extractScore('Ausführliche Bewertung...\n\nScore: 6/10 🔍');
    expect(result).to.deep.equal({
      a: 6,
      b: 10,
      ratio: 0.6
    });
  });
});