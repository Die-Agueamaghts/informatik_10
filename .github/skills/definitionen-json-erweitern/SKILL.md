---
name: definitionen-json-erweitern
description: "Use when neue Begriffe oder Definitionen in data/definitionen.json ergänzt, geprüft oder überarbeitet werden sollen; inklusive Duplikatprüfung, Themenzuordnung und einfachen Erklärungen für Klasse 10."
---

# Definitionen erweitern

Erweitere `data/definitionen.json` um angefragte Fachbegriffe, ohne vorhandene Inhalte unnötig zu duplizieren oder umzuschreiben.

## Ablauf

1. Lies `data/definitionen.json` vollständig und beachte die vorhandenen Kategorien, Karten und deren Reihenfolge.
2. Prüfe jeden angefragten Begriff einzeln. Suche nicht nur nach demselben Wort, sondern auch nach einer bereits vorhandenen Erklärung, Synonymen, Schreibvarianten und einer Karte, die denselben Sachverhalt abdeckt.
3. Ist der Begriff bereits verständlich erklärt, füge keine zweite Karte hinzu. Vereinfache oder präzisiere die vorhandene Karte nur, wenn sie fachlich unklar, zu kompliziert oder im falschen Kontext erklärt ist.
4. Ist der Begriff noch nicht erklärt, formuliere eine fachlich richtige, kurze und einfache Erklärung, die ein Schüler der 10. Klasse verstehen kann. Verwende nach Möglichkeit ein konkretes Beispiel aus einem vertrauten Datenbank-Szenario, etwa einer Schule, Bibliothek oder einem Onlineshop.
5. Erkläre Fachbegriffe grundsätzlich im Kontext von Datenbanken und Datenbankmodellierung. Wenn die Bedeutung im OO-Modell (objektorientiertes Modell) von der relationalen Datenbank oder vom allgemeinen OOP-Sprachgebrauch abweicht, benenne den passenden Kontext ausdrücklich und erkläre den Unterschied kurz, falls es zum Verständnis beiträgt.
6. Ordne jede neue oder überarbeitete Karte einer vorhandenen Kategorie zu, die das Thema tatsächlich abbildet. Grundlagen, Szenarien und OO-Modellierung gehören zu „Grundlagen & Modellierung“; Tabellen, Spalten, Zeilen, Schlüssel, DBMS und SQL zu relationalen Datenbanken. Nutze die tatsächlichen Kategorienamen und IDs der Datei. Lege nur dann eine Kategorie an, wenn keine vorhandene passt.
7. Sortiere Karten innerhalb ihrer Kategorie in einer nachvollziehbaren Lernreihenfolge: Grundlagen vor Details, Modellierung vor Umsetzung und Tabellenaufbau vor Verknüpfungen oder Abfragen. Verschiebe oder ändere nicht betroffene Karten nicht.
8. Verwende aussagekräftige, einheitliche Fragen als Kartentitel, zum Beispiel „Was ist ein Fremdschlüssel?“. Wenn ein Begriff mehrere gebräuchliche Namen hat, nenne diese gemeinsam in einer Karte, statt redundante Karten anzulegen.
9. Bewahre das bestehende JSON-Schema: Jede Karte hat genau die verwendeten Felder `frage` und `antwort`; Kategorien behalten `id`, `name` und `cards`. Ändere keine anderen Dateien, sofern es nicht ausdrücklich verlangt wird.
10. Validiere nach der Änderung, dass die Datei gültiges JSON ist, alle angefragten Begriffe entweder bereits sinnvoll abgedeckt oder ergänzt sind und keine neuen doppelten Fragen oder redundanten Karten entstanden sind. Nutze vorhandene Projektwerkzeuge, zum Beispiel `node` zum Parsen der JSON-Datei.

## Qualitätsmaßstab

- Schreibe kurze Sätze und erkläre notwendige Fachwörter direkt.
- Ein Beispiel ergänzt die Definition, ersetzt sie aber nicht.
- Unterscheide verwandte Begriffe sauber. Zum Beispiel kann ein Attribut im OO-Modell eine Eigenschaft eines Objekts oder einer Klasse bezeichnen; in einer relationalen Tabelle entspricht eine solche Information typischerweise einer Spalte.
- Vermeide unnötig technische Details, unbelegte Regeln und Wiederholungen bereits vorhandener Karten.
- Berichte nach der Bearbeitung knapp, welche Begriffe neu, bereits abgedeckt oder überarbeitet wurden und welche Prüfung erfolgreich war.
