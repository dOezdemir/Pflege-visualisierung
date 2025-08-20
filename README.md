# Pflege-visualisierung

Interaktives, rein clientseitiges Web-Tool zum Zusammenstellen und Visualisieren von (Beispiel-)Pflegedaten. Elemente werden per Drag-&-Drop auf eine Arbeitsfläche gezogen und über einen Inspektor angepasst. Daten können als JSON gespeichert/geladen werden.

**Live-Demo (GitHub Pages):**  
https://doezdemir.github.io/Pflege-visualisierung/

**Quellcode (GitHub Repo):**  
https://github.com/dOezdemir/Pflege-visualisierung/

---

## Funktionen

- **Drag & Drop:** Liniendiagramm, Balkendiagramm, Kreisdiagramm, Zeitstrahl  
- **Hilfselemente:** Ampel, Trendpfeil, Icon (Font Awesome), Farbcodierung, Freitext  
- **Inspektor:** Titel, Farben, Größen, Kategorien/Tags, spezifische Optionen pro Element  
- **Beispiele:** Button zeigt Demo-Layout (nur wenn *Gruppe A* gewählt ist)  
- **Notizfeld:** Verschiebbares Panel für Anmerkungen  
- **Speichern/Laden:** Layout als `.json` exportieren/importieren  

---

## Für Tester*innen: So benutzt du das Tool

1. Öffne die **Live-Demo** (Link oben).  
2. Ziehe links ein **Element** auf die **Arbeitsfläche** (Mitte).  
3. **Klicke** ein Element an → rechts im **Inspektor** Titel, Farbe, Größe etc. einstellen.  
4. Optional: **Notiz**, **Beispiele** (nur für Gruppe A) oder **Zurücksetzen** nutzen.  
5. **Speichern** exportiert dein Layout als `layout.json`. Mit **Laden** kannst du es wieder importieren.

> Tipp: Elemente frei anordnen; `Entf` entfernt das ausgewählte Element.

---

## Projektstruktur

