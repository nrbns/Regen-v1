# Game Hub - Friv-Style Game Browser

Legal, fast, browser-first game launcher for OmniBrowser.

## Features

- 🎮 **20+ Open-Source Games**: All legally sourced from GitHub repositories
- 🔍 **Search & Filter**: Find games by category, tags, or search query
- ⭐ **Favorites**: Save your favorite games
- 📱 **Responsive**: Works on desktop and mobile
- 🔒 **Sandboxed**: Games run in secure iframes
- 💾 **Offline Support**: Service Worker caching for offline-capable games
- 🎨 **Modern UI**: Beautiful grid/list views with smooth animations

## Legal Compliance

All games are:
- ✅ Open-source with MIT or compatible licenses
- ✅ Properly attributed with source links
- ✅ No proprietary content from Friv or other commercial portals
- ✅ Ready for commercial use (verify individual licenses)

See [LEGAL.md](./LEGAL.md) for detailed licensing information.

## Game Catalog

The catalog includes games from:
- **Phaser Examples** (MIT License)
- **Lee Reilly Games Archive** (MIT License)
- **Other Open-Source Repositories**

Each game entry includes:
- Title, description, thumbnail
- Category and tags
- Source repository link
- License information
- Attribution requirements
- Offline capability status

## Adding Games

To add a new game:

1. Find an open-source game (MIT or compatible license)
2. Add entry to `gameCatalog.json`:
```json
{
  "id": "unique-id",
  "title": "Game Title",
  "description": "Game description",
  "thumbnail": "https://...",
  "category": "arcade",
  "type": "html5",
  "source": "https://github.com/...",
  "embed_url": null,
  "offline_capable": true,
  "license": "MIT",
  "attribution": "Developer Name",
  "size_kb": 50,
  "tags": ["tag1", "tag2"]
}
```

3. Build/host the game at `/games/{id}/index.html`
4. Update Service Worker if offline support is needed

## Building Games

### Phaser Games

1. Clone Phaser examples: `git clone https://github.com/phaserjs/examples`
2. Build the game: `npm install && npm run build`
3. Copy to `public/games/{game-id}/`
4. Update catalog entry

### HTML5 Games

1. Clone the game repository
2. Build if needed (check README)
3. Copy to `public/games/{game-id}/`
4. Ensure all assets are relative paths
5. Test offline functionality

## Offline Support

Games marked `offline_capable: true` can be cached:

1. Service Worker caches game assets
2. Users can play offline after first visit
3. Cache is managed automatically

To enable offline for a game:
1. Mark `offline_capable: true` in catalog
2. Ensure all assets use relative paths
3. Test in offline mode

## Development

```bash
# The Game Hub is integrated into OmniBrowser
# Switch to Games mode to see it
```

## Resources

- [Phaser Examples](https://github.com/phaserjs/examples)
- [Open Source Games List](https://github.com/michelpereira/awesome-open-source-games)
- [Lee Reilly Games](https://github.com/leereilly/games)
- [Legal Documentation](./LEGAL.md)

## Next Steps

1. **Build Sample Games**: Create 3-5 Phaser example games
2. **CDN Setup**: Host games on CDN for fast loading
3. **Analytics**: Add play tracking and analytics
4. **More Games**: Expand catalog with more open-source games
5. **Embedding**: Contact publishers for embeddable games

