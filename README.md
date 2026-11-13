# Wallet Atelier — Pass Designer

Application web responsive en français pour créer, sauvegarder, personnaliser et exporter des cartes génériques de fidélité ou d'adhésion. L'éditeur fonctionne localement dans le navigateur, sans compte et sans dépendance externe.

## Démarrage rapide

Prérequis : Node.js 18+ et OpenSSL. Pour exporter des passes Apple Wallet signés, `zip` doit également être installé.

```bash
node server.js
```

Ouvrir ensuite http://127.0.0.1:4173 dans Safari, Chrome ou Firefox. L'app fonctionne également comme interface de création en mode statique via `index.html`; dans ce cas, l'API de signature n'est pas disponible.

## Fonctions

- Éditeur live et huit thèmes de départ.
- Personnalisation du nom, membre, identifiant, niveau, description, couleurs et symbole.
- Import de logo local (pour la personnalisation graphique de l'éditeur).
- Enregistrement local, édition, suppression et import/export JSON.
- Export PNG et impression / PDF.
- PWA avec cache offline.
- Route serveur optionnelle pour fabriquer et signer un pass Wallet générique `.pkpass`.

## Activer la génération `.pkpass`

Un pass Apple Wallet doit être signé avec un certificat Apple Wallet correspondant à un Pass Type ID. Cette app ne peut pas fabriquer de certificat Apple et ne modifie pas les cartes bancaires Apple Pay.

1. Créer un Pass Type ID et un certificat Pass Type ID dans le compte Apple Developer de l'émetteur.
2. Exporter le certificat et sa clé privée en fichier `.p12` et récupérer le certificat intermédiaire Apple WWDR à jour depuis Apple Developer.
3. Copier `.env.example` vers `.env`, compléter les valeurs, puis charger les variables d'environnement avant de lancer le serveur. Exemple :

```bash
set -a
. ./.env
set +a
node server.js
```

`CERT_P12_PATH` et `WWDR_CERT_PATH` doivent pointer vers des fichiers lisibles par le processus Node. Ne jamais publier `.env`, le fichier `.p12`, le mot de passe ou les clés privées. Utiliser HTTPS et une authentification avant d'exposer le serveur sur Internet.

Le générateur produit exclusivement le type de pass générique `generic` avec champs d'adhésion. Il ne contient pas de données bancaires, de jeton de paiement ni de fonctionnalité de paiement. Il doit utiliser le certificat et le Pass Type ID de l'organisation qui émet réellement le pass.

## Vie privée

Les designs sont sauvegardés dans `localStorage` du navigateur. Le serveur n'enregistre pas les créations. Lors de la génération `.pkpass`, seules les données du design et l'image exportée sont transmises au serveur de signature.

## Lancement simple

- Windows : double-cliquer `start.bat`.
- macOS : double-cliquer `start.command` (au besoin autoriser l'exécution dans les paramètres), ou lancer `node server.js`.
- iPhone : ouvrir l'URL HTTPS du serveur dans Safari et choisir « Ajouter à l'écran d'accueil ».

## Test technique

Avec le serveur lancé :

```bash
node tests-smoke.js
```

Le test vérifie le chargement de l'app, du service worker et des routes API. La signature Apple ne peut pas être testée sans un véritable certificat émetteur.
