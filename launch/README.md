# Launch Page Assets

This folder contains all assets for the RegenBrowser launch page.

## Structure

```
launch/
├── index.html          # Main landing page
├── assets/             # CSS, JS, fonts, etc.
├── videos/             # Demo videos, launch video
├── images/             # Screenshots, logos, graphics
└── README.md           # This file
```

## Files

- **index.html**: Main landing page with features, FAQ, privacy highlights, and SEO optimization
- **assets/**: Static assets (CSS, JavaScript, fonts)
- **videos/**: Demo videos and launch video (when ready)
- **images/**: Screenshots, logos, and promotional graphics

## Usage

### Local Development

Open `index.html` directly in a browser, or serve it with:

```bash
# Python
python -m http.server 8000

# Node.js
npx serve launch

# PHP
php -S localhost:8000 -t launch
```

### Production Deployment

1. Copy the `launch/` folder to your web server
2. Point your domain to `launch/index.html`
3. Ensure all asset paths are correct (use relative paths)

## SEO

The landing page includes:
- ✅ Meta tags (description, keywords, OG tags, Twitter cards)
- ✅ Structured data (JSON-LD Schema.org)
- ✅ Canonical URLs
- ✅ Mobile-responsive design
- ✅ Performance optimizations

## Features

- Hero section with CTAs
- Feature showcase (6 cards)
- Stats section
- Demo video placeholder
- FAQ section (7 questions)
- Privacy highlights
- Footer with links

## Next Steps

1. Add actual demo video to `videos/` folder
2. Add screenshots to `images/` folder
3. Optimize images for web
4. Add analytics (if needed)
5. Test on multiple devices/browsers

## Notes

- All paths in `index.html` are relative
- Update video embed URL when demo video is ready
- Add actual screenshots to replace placeholders
- Test SEO with Google Search Console

