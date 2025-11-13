# Game Hub Implementation Guide

## Quick Start: Adding Your First Game

### Step 1: Choose a Game

Pick an open-source game from:
- [Phaser Examples](https://github.com/phaserjs/examples)
- [Lee Reilly Games](https://github.com/leereilly/games)
- [Awesome Open Source Games](https://github.com/michelpereira/awesome-open-source-games)

### Step 2: Build the Game

#### For Phaser Games:

```bash
# Clone Phaser examples
git clone https://github.com/phaserjs/examples.git
cd examples

# Install dependencies
npm install

# Build a specific game (e.g., Snake)
cd public/src/games/snake
npm run build

# Copy to your public directory
cp -r dist/* ../../../../../../public/games/snake/
```

#### For HTML5 Games:

```bash
# Clone the game repo
git clone https://github.com/leereilly/games.git
cd games/pacman

# Check for build instructions
cat README.md

# Copy to public directory
cp -r * ../../public/games/pacman/
```

### Step 3: Add to Catalog

Edit `gameCatalog.json` and add your game entry:

```json
{
  "id": "snake",
  "title": "Snake Classic",
  "description": "Classic snake game",
  "thumbnail": "/games/snake/thumbnail.png",
  "category": "arcade",
  "type": "phaser",
  "source": "https://github.com/phaserjs/examples/tree/main/public/src/games/snake",
  "embed_url": null,
  "offline_capable": true,
  "license": "MIT",
  "attribution": "Phaser Examples",
  "size_kb": 45,
  "tags": ["classic", "arcade", "snake"]
}
```

### Step 4: Test

1. Start OmniBrowser
2. Switch to Games mode
3. Find your game in the catalog
4. Click Play
5. Verify it loads correctly

## Sample Phaser Game Integration

Here's a minimal Phaser game you can use as a template:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Sample Game</title>
    <script src="https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js"></script>
</head>
<body>
    <div id="game-container"></div>
    <script>
        const config = {
            type: Phaser.AUTO,
            width: 800,
            height: 600,
            parent: 'game-container',
            scene: {
                create: create,
                update: update
            }
        };

        const game = new Phaser.Game(config);
        let player;

        function create() {
            // Add your game code here
            this.add.text(400, 300, 'Hello Game!', {
                fontSize: '32px',
                fill: '#fff'
            });
        }

        function update() {
            // Update loop
        }
    </script>
</body>
</html>
```

Save this as `public/games/sample/index.html` and add to catalog.

## Service Worker Registration

Add to your main app entry point:

```typescript
// Register Service Worker for offline support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then((registration) => {
      console.log('Service Worker registered:', registration);
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
}
```

## CDN Setup (Production)

For production, host games on a CDN:

1. Upload games to S3/CloudFront or similar
2. Update `embed_url` in catalog:
```json
{
  "embed_url": "https://cdn.yourdomain.com/games/snake/index.html"
}
```

3. Update `GamePlayer.tsx` to use `embed_url` when available:
```typescript
const getGameUrl = () => {
  if (game.embed_url) {
    return game.embed_url;
  }
  return `/games/${game.id}/index.html`;
};
```

## Performance Optimization

1. **Lazy Load Thumbnails**: Use `loading="lazy"` on images
2. **Preload Popular Games**: Precache top 5 games
3. **Compress Assets**: Use WebP for thumbnails
4. **CDN**: Host games on CDN for fast loading

## Mobile Support

Games should:
- Support touch controls
- Be responsive (use `window.innerWidth/Height`)
- Handle orientation changes
- Work in fullscreen mode

## Analytics Integration

Track game plays:

```typescript
// In GamePlayer.tsx
useEffect(() => {
  if (selectedGame) {
    // Track play event
    analytics.track('game_played', {
      game_id: game.id,
      game_title: game.title,
      category: game.category,
    });
  }
}, [selectedGame]);
```

## Next Steps

1. Build 3-5 sample Phaser games
2. Set up CDN for game hosting
3. Add analytics tracking
4. Implement offline caching
5. Add more games to catalog

