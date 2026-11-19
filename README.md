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

- `warlike_list_objects` : lecture seule, maximum 100 objets.
- `warlike_select_object`, `warlike_set_transform` : sélection et édition Transform.
- `warlike_add_component`, `warlike_get_component`, `warlike_set_component_property` : composants déjà enregistrés uniquement, jamais des Prefabs.
- `warlike_command_result` : interroge le statut d'une commande asynchrone transmise au navigateur.

Les commandes mutantes sont interdites en Play et dans les sessions lecture seule ; les paramètres sont validés des deux côtés. Aucun accès au shell, disque local, DOM arbitraire, navigation vers d'autres sites ou évaluation de scripts.

## Limites

- **Non déployé/non validé** tant que la CI et les trois PR n'ont pas été intégrées. Avoir le site Pages existant ne signifie pas que l'endpoint MCP est opérationnel.
- Le protocole MCP JSON-RPC est minimal ; avant un lancement public, compléter les protections anti-abus, TTL/pruning D1 et tests d'intégration ainsi que les contrôles de rôles via WarLike Keys/Server.
- Ne pas configurer de tokens permanents dans un navigateur partagé. Le lien entre une session MCP et la session utilisateur WarLike n'est pas encore intégré dans le contrôle des comptes natifs ; le relais utilise des secrets d'application dédiés.
