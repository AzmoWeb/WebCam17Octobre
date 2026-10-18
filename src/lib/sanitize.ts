// Nettoyage des textes saisis par les utilisateurs (côté serveur, avant écriture en base).
// L'affichage passe toujours par React, qui échappe le HTML : ceci retire en plus
// les caractères de contrôle et invisibles utilisés pour tromper la lecture.

// Contrôles C0/C1 (sauf saut de ligne), zéro-largeur, marques bidi, BOM.
const INVISIBLE = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F​-‏‪-‮⁠-⁩﻿]/g;

/** Texte sur une ligne : invisibles retirés, espaces fusionnés. */
export function cleanLine(input: string) {
  return input.normalize("NFC").replace(INVISIBLE, "").replace(/\s+/g, " ").trim();
}

/** Texte multiligne : invisibles retirés, 2 lignes vides au maximum. */
export function cleanText(input: string) {
  return input
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(INVISIBLE, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
