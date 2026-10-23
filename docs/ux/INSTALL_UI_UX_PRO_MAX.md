# UI/UX Pro Max — installation et usage dans AI Interview Platform

Source : https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (licence du fournisseur à respecter). Le 23 octobre 2026, l'outil CLI `ui-ux-pro-max-cli@2.15.0` a été installé **sur le Mac local** dans le dépôt, pour Claude Code (`.claude/skills/ui-ux-pro-max`) et les agents universels (`.agents/skills/ui-ux-pro-max`).

Réinstaller sur une autre machine :

```bash
npm install -g ui-ux-pro-max-cli@2.15.0
cd /chemin/vers/ai-interview-platform
uipro init --ai claude
uipro init --ai universal
```

Recherche validée utilisée pour concevoir la première orientation :

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "AI interview preparation career coaching SaaS premium modern trustworthy mobile-first" \
  --design-system --persist -p "AI Interview Platform" \
  --output-dir "$PWD" --variance 5 --motion 4 --density 4
```

Le fichier `design-system/ai-interview-platform/MASTER.md` sauvegarde **la proposition brute de la skill**. Le document `docs/ux/UX-01_CANDIDATE_JOURNEY_AND_DESIGN_DIRECTION.md` décrit les arbitrages **adaptés à notre brief** (Apple/Vercel, expérience candidat, sobriété, accessibilité et mobile-first), qui font foi comme proposition de travail jusqu'à validation. Les recommandations automatiques ne remplacent jamais une revue produit.

Les répertoires vendor installés localement ne sont pas recopiés dans GitHub pour limiter le dépôt et éviter deux copies lourdes du même outil ; le guide est reproductible.
