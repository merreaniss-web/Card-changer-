# Wallet Studio — V1.0

Application web responsive et installable (PWA) pour créer des **aperçus décoratifs** de cartes numériques.

## Fonctionnalités
- 8 thèmes visuels : American Express, HSBC, Revolut, N26, BNP Paribas, Santander, Gold Edition et Midnight.
- Modification en direct des textes, couleurs et finitions.
- Ajout d'une image de fond (PNG/JPEG/WebP, 4 Mo maximum).
- Export du design en PNG avec filigrane « APERÇU · NON PAYANT ».
- Sauvegarde locale des créations dans le navigateur (localStorage).
- Mode hors connexion après première visite sur un hébergement HTTPS.

## Lancer en local
Ouvrir `index.html` dans un navigateur moderne. Pour tester l'installation PWA et le mode hors connexion, servir le dossier via HTTPS ou un serveur local, par exemple :

```bash
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000`.

## Limite Apple Wallet / Apple Pay
Cette V1 ne modifie pas les illustrations des cartes bancaires dans Apple Pay et ne génère aucun moyen de paiement. La création et la distribution d'un véritable pass Apple Wallet nécessitent un Pass Type ID et un certificat de signature Apple Developer. Les cartes de cette application sont des maquettes graphiques, explicitement marquées comme non payantes.

## Confidentialité
Aucune donnée de paiement, numéro de carte, date d'expiration, CVV ou identifiant bancaire n'est demandée. Les créations sont stockées localement dans le navigateur de l'appareil.
