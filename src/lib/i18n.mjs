import process from "node:process";

/**
 * The few sentences devia says to a **human** rather than to an agent.
 *
 * The standard, the rules and every memory file stay in English: they are read by agents, cited
 * by identifier, and a translated rule is a second wording of an obligation — which is how two
 * projects end up enforcing subtly different things under one ID.
 *
 * What is translated is the handful of lines that are a message to the person at the terminal:
 * a newer version exists, here is what it brings, here is the command — you decide. Telling
 * somebody in a language they do not read that an update is waiting is telling them nothing.
 *
 * Six languages, and English as the fallback, because a language ships only when the wording can
 * be written properly. A machine-translated CLI is worse than an English one.
 */

export const LANGUAGES = ["en", "fr", "es", "de", "it", "pt"];

/**
 * The language to speak, most explicit source first.
 *
 * `DEVIA_LANG` is the override. Then the POSIX locale variables, which say what the *terminal*
 * was configured for; then the system locale Node resolves, which is all Windows usually offers.
 */
export function detectLanguage(env = process.env) {
  const candidates = [
    env.DEVIA_LANG,
    env.LC_ALL,
    env.LC_MESSAGES,
    env.LANG,
    (env.LANGUAGE || "").split(":")[0],
  ];
  for (const raw of candidates) {
    const lang = normalize(raw);
    if (lang) return lang;
  }
  try {
    const lang = normalize(new Intl.DateTimeFormat().resolvedOptions().locale);
    if (lang) return lang;
  } catch {
    /* no ICU in this build: English it is */
  }
  return "en";
}

/** `fr_FR.UTF-8`, `fr-CA`, `FR` -> `fr`, when we actually speak it. */
function normalize(raw) {
  if (!raw) return null;
  const tag = String(raw).trim().toLowerCase().replace(/[_.@].*$/, "").split("-")[0];
  return LANGUAGES.includes(tag) ? tag : null;
}

const MESSAGES = {
  en: {
    newer: (latest, current) => `devia ${latest} is available. You are on ${current}.`,
    brings: (version) => `What ${version} brings:`,
    added: "Added",
    fixed: "Fixed",
    changed: "Changed",
    howTo: "Update when you decide to:",
    decide: "devia installs nothing on its own — this is yours to run.",
    current: (version) => `devia ${version} is the newest published version.`,
    ahead: (current, latest) => `devia ${current} is ahead of the newest published version (${latest}).`,
    unreachable: "Could not reach the registry. Nothing was changed.",
    noNotes: (url) => `No summary was published for this release. Changelog: ${url}`,
    willRun: "This will run:",
    installed: (version) => `devia ${version} installed.`,
    failed: "The update command failed. Nothing else was changed.",
    checkedAt: (when) => `Last checked ${when}.`,
    disabled: "Version checking is off for this repository.",
  },
  fr: {
    newer: (latest, current) => `devia ${latest} est disponible. Vous êtes en ${current}.`,
    brings: (version) => `Ce qu'apporte la version ${version} :`,
    added: "Ajouté",
    fixed: "Corrigé",
    changed: "Modifié",
    howTo: "Mettez à jour quand vous le décidez :",
    decide: "devia n'installe rien de lui-même — cette commande vous appartient.",
    current: (version) => `devia ${version} est la dernière version publiée.`,
    ahead: (current, latest) => `devia ${current} est en avance sur la dernière version publiée (${latest}).`,
    unreachable: "Registre injoignable. Rien n'a été modifié.",
    noNotes: (url) => `Aucun résumé publié pour cette version. Journal des modifications : ${url}`,
    willRun: "Ceci va exécuter :",
    installed: (version) => `devia ${version} installé.`,
    failed: "La commande de mise à jour a échoué. Rien d'autre n'a été modifié.",
    checkedAt: (when) => `Dernière vérification le ${when}.`,
    disabled: "La vérification de version est désactivée pour ce dépôt.",
  },
  es: {
    newer: (latest, current) => `devia ${latest} está disponible. Tienes la ${current}.`,
    brings: (version) => `Lo que trae la versión ${version}:`,
    added: "Añadido",
    fixed: "Corregido",
    changed: "Cambiado",
    howTo: "Actualiza cuando tú lo decidas:",
    decide: "devia no instala nada por su cuenta — este comando es tuyo.",
    current: (version) => `devia ${version} es la última versión publicada.`,
    ahead: (current, latest) => `devia ${current} va por delante de la última versión publicada (${latest}).`,
    unreachable: "No se pudo contactar con el registro. No se cambió nada.",
    noNotes: (url) => `No se publicó un resumen de esta versión. Registro de cambios: ${url}`,
    willRun: "Esto ejecutará:",
    installed: (version) => `devia ${version} instalado.`,
    failed: "El comando de actualización falló. No se cambió nada más.",
    checkedAt: (when) => `Última comprobación: ${when}.`,
    disabled: "La comprobación de versiones está desactivada en este repositorio.",
  },
  de: {
    newer: (latest, current) => `devia ${latest} ist verfügbar. Sie haben ${current}.`,
    brings: (version) => `Was Version ${version} bringt:`,
    added: "Neu",
    fixed: "Behoben",
    changed: "Geändert",
    howTo: "Aktualisieren Sie, wenn Sie es entscheiden:",
    decide: "devia installiert nichts von selbst — dieser Befehl gehört Ihnen.",
    current: (version) => `devia ${version} ist die neueste veröffentlichte Version.`,
    ahead: (current, latest) => `devia ${current} ist neuer als die neueste veröffentlichte Version (${latest}).`,
    unreachable: "Registry nicht erreichbar. Es wurde nichts geändert.",
    noNotes: (url) => `Für diese Version wurde keine Zusammenfassung veröffentlicht. Changelog: ${url}`,
    willRun: "Dies führt aus:",
    installed: (version) => `devia ${version} installiert.`,
    failed: "Der Update-Befehl ist fehlgeschlagen. Sonst wurde nichts geändert.",
    checkedAt: (when) => `Zuletzt geprüft am ${when}.`,
    disabled: "Die Versionsprüfung ist für dieses Repository deaktiviert.",
  },
  it: {
    newer: (latest, current) => `devia ${latest} è disponibile. Hai la ${current}.`,
    brings: (version) => `Cosa porta la versione ${version}:`,
    added: "Aggiunto",
    fixed: "Corretto",
    changed: "Modificato",
    howTo: "Aggiorna quando lo decidi tu:",
    decide: "devia non installa nulla da solo — questo comando è tuo.",
    current: (version) => `devia ${version} è l'ultima versione pubblicata.`,
    ahead: (current, latest) => `devia ${current} è più avanti dell'ultima versione pubblicata (${latest}).`,
    unreachable: "Registro non raggiungibile. Non è stato modificato nulla.",
    noNotes: (url) => `Nessun riepilogo pubblicato per questa versione. Changelog: ${url}`,
    willRun: "Questo eseguirà:",
    installed: (version) => `devia ${version} installato.`,
    failed: "Il comando di aggiornamento è fallito. Nient'altro è stato modificato.",
    checkedAt: (when) => `Ultimo controllo: ${when}.`,
    disabled: "Il controllo delle versioni è disattivato per questo repository.",
  },
  pt: {
    newer: (latest, current) => `devia ${latest} está disponível. Você está na ${current}.`,
    brings: (version) => `O que a versão ${version} traz:`,
    added: "Adicionado",
    fixed: "Corrigido",
    changed: "Alterado",
    howTo: "Atualize quando você decidir:",
    decide: "o devia não instala nada sozinho — este comando é seu.",
    current: (version) => `devia ${version} é a versão publicada mais recente.`,
    ahead: (current, latest) => `devia ${current} está à frente da versão publicada mais recente (${latest}).`,
    unreachable: "Não foi possível contactar o registro. Nada foi alterado.",
    noNotes: (url) => `Nenhum resumo publicado para esta versão. Changelog: ${url}`,
    willRun: "Isto vai executar:",
    installed: (version) => `devia ${version} instalado.`,
    failed: "O comando de atualização falhou. Nada mais foi alterado.",
    checkedAt: (when) => `Última verificação: ${when}.`,
    disabled: "A verificação de versão está desativada neste repositório.",
  },
};

/** The message table for a language, falling back to English key by key. */
export function messages(lang) {
  return { ...MESSAGES.en, ...(MESSAGES[lang] || {}) };
}

/** `t(lang)` reads like a translator: `t.newer(latest, current)`. */
export function t(lang = detectLanguage()) {
  return messages(lang);
}
