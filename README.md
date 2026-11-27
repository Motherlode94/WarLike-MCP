# WarLike MCP — intégration de WarLike Server

**Site :** https://warlike-mcp.pages.dev/

WarLike-MCP est une **interface MCP pour WarLike Engine**, avec **WarLike Server** comme backend central pour les sessions et la file de commandes persistée dans sa base Cloudflare **D1**. Aucun second stockage, aucune base parallèle ni extension d'exécution arbitraire.

## Architecture

```text
ChatGPT / client MCP (Bearer WARLIKE_MCP_TOKEN)
           ↓ JSON-RPC HTTPS
warlike-mcp.pages.dev/mcp  [Pages Function : proxy sans stockage]
           ↓
warlike-server.pages.dev/api/mcp [WarLike Server : auth + D1]
           ↕ polling HTTPS, clé séparée
warlike-engine.pages.dev [onglet volontairement connecté]
           ↓
GameObjects et Components du projet actuellement ouvert
```

## Configuration

1. Appliquer et valider la PR WarLike Server contenant `app/api/mcp/route.ts`. Conserver son binding `DB` D1. Le relais crée les deux tables `mcp_editor_sessions` et `mcp_editor_commands` si absentes.
2. Définir les secrets **distincts** `WARLIKE_MCP_TOKEN` et `WARLIKE_MCP_EDITOR_TOKEN` côté Server, avec au moins 32 caractères aléatoires chacun. Ne jamais les committer ni les écrire dans les journaux.
3. Déployer la branche Engine avec le panneau `⬡ MCP`. Le navigateur conserve `WARLIKE_MCP_EDITOR_TOKEN` en mémoire uniquement. La connexion reste désactivée par défaut.
4. Déployer ce dépôt sur le projet Cloudflare Pages existant `warlike-mcp`, avec Pages Functions activées. `/mcp` relaie les requêtes JSON-RPC vers WarLike Server.
5. Configurer le client MCP avec l'URL `https://warlike-mcp.pages.dev/mcp` et le bearer `WARLIKE_MCP_TOKEN`. Un client doit supporter MCP over HTTP ; le endpoint fonctionne en réponse JSON, sans SSE.

## Tools

- `warlike_list_sessions` : liste les onglets Engine connectés, leur autorisation et un identifiant de session explicite. Aucune sélection implicite du dernier onglet.
- `warlike_list_objects` : lecture seule, maximum 100 objets, avec `sessionId`.
- `warlike_select_object`, `warlike_set_transform` : sélection et édition Transform.
- `warlike_add_component`, `warlike_get_component`, `warlike_set_component_property` : composants déjà enregistrés uniquement, jamais des Prefabs.
- `warlike_command_result` : interroge une commande asynchrone avec **`commandId` et `sessionId`**, empêchant une lecture de résultat depuis un autre onglet.

## Vérification avant utilisation

Ouvrir `https://warlike-mcp.pages.dev/` et utiliser « Vérifier les outils ». Le navigateur conserve la clé uniquement en mémoire ; le diagnostic appelle `tools/list` sans effectuer de modification. Dans Engine, le bouton MCP affiche un ID de session copiable ; utiliser cet ID dans les outils. Déconnecter après chaque intervention. Trois erreurs réseau consécutives interrompent le pont de l’éditeur.

Les commandes mutantes sont interdites en Play et dans les sessions lecture seule ; les paramètres sont validés des deux côtés. Aucun accès au shell, disque local, DOM arbitraire, navigation vers d'autres sites ou évaluation de scripts.

## Limites

- **Non déployé/non validé** tant que la CI et les trois PR n'ont pas été intégrées. Avoir le site Pages existant ne signifie pas que l'endpoint MCP est opérationnel.
- Le protocole MCP JSON-RPC est minimal ; avant un lancement public, compléter les protections anti-abus, TTL/pruning D1 et tests d'intégration ainsi que les contrôles de rôles via WarLike Keys/Server.
- Ne pas configurer de tokens permanents dans un navigateur partagé. Le lien entre une session MCP et la session utilisateur WarLike n'est pas encore intégré dans le contrôle des comptes natifs ; le relais utilise des secrets d'application dédiés.

## Renforcement du relais — PR de durcissement

Le proxy `functions/mcp.js` est désormais limité à un **message JSON-RPC 2.0 par POST** (pas de batch), en JSON, et à **16 Kio d'entrée maximum**, vérifiés pendant la lecture du flux. Il impose une autorisation Bearer de forme attendue, mais **la validation cryptographique du secret et la gestion des droits restent exclusivement dans WarLike Server**.

- Aucun Cookie ou en-tête client non autorisé n'est transféré à Server.
- Délai d'attente de 15 secondes et réponses 502 contrôlées en cas d'indisponibilité ou de réponse non JSON.
- Réponses non mises en cache ; les notifications sans corps (204) sont prises en charge.
- Les requêtes OPTIONS ne permettent pas un accès CORS générique.
- GET /mcp reste informatif : il n'est pas un contrôle de santé en direct.
- Tests de transport et de comportement ajoutés sous `tests/mcp-proxy.test.mjs`.

**Compatibilité :** ce relais accepte JSON-RPC sur POST avec réponse JSON et ne fournit pas encore de session HTTP MCP complète ni de transport SSE. Certains clients MCP récents peuvent attendre d'autres fonctionnalités du protocole ; les implémenter nécessitera de coordonner le client et WarLike Server. Les commandes Engine restent soumises à son consentement, à ses validations et à son contrôle d'accès.

**Hors portée :** les cinq fournisseurs du Control Center ne sont pas branchés automatiquement par cette modification. Les adaptateurs OpenAI, Anthropic, Cloudflare, Meshy et GitHub doivent passer par des endpoints autorisés de WarLike Server. Ne jamais transformer le proxy MCP en proxy HTTP ouvert.

## Local Bridge (séparé du relais cloud)
Voir [guide d’installation local](docs/local-bridge.md). L’agent stdio requiert un client MCP local. Aucun outil de lecture du disque n’est ajouté à l’endpoint public `/mcp`.
