# WarLike MCP Local Bridge

## Windows — mise en route
Installer Node.js 22, puis cloner/télécharger WarLike-MCP après fusion des PR. Depuis le dossier du dépôt, dans PowerShell :

```powershell
node local/inspect.mjs "C:\Users\<utilisateur>\Downloads\Assets\2D"
```

Cette commande fournit un inventaire JSON local, sans envoi réseau. Pour un client MCP prenant en charge les serveurs stdio, configurer la commande node avec les arguments [chemin absolu vers local/agent.mjs, --root, chemin absolu vers le dossier choisi]. Ou lancer start-local.cmd --root "dossier". Le processus expose scope, inventory, analyze et projects. Ne jamais publier son stdin/stdout ni le convertir en endpoint HTTP public. Un client distant ChatGPT ne se connecte pas automatiquement à un agent local.

## Prévisualisation et export
Ouvrir local/preview.html, choisir le dossier, visualiser jusqu'à 100 miniatures d'images dans le navigateur. Aucun envoi automatique. Créer un selection.json avec des chemins relatifs sélectionnés, par exemple :
```json
{"paths":["Sprites/hero.png"],"author":"Unknown","license":"Unknown","collection":"My 2D assets"}
```
Remplacer les exemples par les fichiers et métadonnées réels. Exécuter :
```powershell
node local/export-pack.mjs "C:\Assets\2D" selection.json pack.json
```
Le fichier de sortie doit être nouveau ; maximum 100 fichiers / 20 Mio de données. Importer pack.json dans WarLike Library → MCP Local après déploiement de MCP07. Vérification SHA-256 et déduplication. Aucun upload R2 ni synchronisation cloud. Ne pas redistribuer sans droits.

## Sécurité et limites
Dossier choisi explicitement au démarrage, pas de racine disque ni de répertoire personnel entier, chemins relatifs, rejet des liens symboliques/jonctions visibles, formats autorisés, pas de shell ni exécution de scripts, pas de transfert de bytes via les outils MCP. Les métadonnées renvoyées au client MCP peuvent être transmises au fournisseur IA par ce client ; ne sélectionner que les dossiers destinés au partage. Le processus doit fonctionner sous un compte Windows standard ; les contrôles de chemins ne constituent pas une sandbox OS face à un processus local malveillant modifiant simultanément les dossiers. Les projets Godot/Unity sont repérés seulement ; leur import Engine dépend des importeurs existants. Tests Node Linux et Windows prévus en CI, pas de test sur le poste utilisateur ni de certification navigateur ou intégration ChatGPT effectués.
