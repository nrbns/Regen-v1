# Deployment Guide for Launch Page

## Quick Deploy Options

### Option 1: GitHub Pages

1. Create a new repository: `regenbrowser-landing`
2. Copy `launch/` folder contents to repository root
3. Enable GitHub Pages in repository settings
4. Point to `main` branch, `/` root directory
5. Access at: `https://yourusername.github.io/regenbrowser-landing`

### Option 2: Netlify

1. Install Netlify CLI: `npm install -g netlify-cli`
2. Navigate to `launch/` folder
3. Run: `netlify deploy --prod`
4. Follow prompts to link/create site
5. Access at: `https://your-site.netlify.app`

### Option 3: Vercel

1. Install Vercel CLI: `npm install -g vercel`
2. Navigate to `launch/` folder
3. Run: `vercel --prod`
4. Follow prompts
5. Access at: `https://your-site.vercel.app`

### Option 4: Custom Server

1. Copy `launch/` folder to your web server
2. Configure web server to serve `index.html` as default
3. Ensure proper MIME types for `.html`, `.css`, `.js`
4. Set up SSL certificate (Let's Encrypt recommended)
5. Configure domain DNS to point to server

## Pre-Deployment Checklist

- [ ] Update all URLs in `index.html` (GitHub links, download links)
- [ ] Add actual demo video URL (replace placeholder)
- [ ] Add screenshots to `images/` folder
- [ ] Optimize images (compress, WebP format)
- [ ] Test on mobile devices
- [ ] Test on different browsers
- [ ] Verify all links work
- [ ] Check SEO meta tags
- [ ] Test page speed (Google PageSpeed Insights)
- [ ] Set up analytics (optional)
- [ ] Configure custom domain (if needed)

## Post-Deployment

1. Submit to Google Search Console
2. Submit sitemap (if created)
3. Test all functionality
4. Monitor analytics
5. Share on social media
6. Submit to Product Hunt (when ready)

## Custom Domain Setup

### Netlify
1. Go to Site Settings → Domain Management
2. Add custom domain
3. Follow DNS configuration instructions

### Vercel
1. Go to Project Settings → Domains
2. Add custom domain
3. Configure DNS records

### GitHub Pages
1. Add `CNAME` file with domain name
2. Configure DNS records:
   - Type: `CNAME`
   - Name: `@` or `www`
   - Value: `yourusername.github.io`

## Performance Optimization

- Minify CSS/JS (use tools like `terser`, `cssnano`)
- Enable GZIP compression
- Use CDN for static assets
- Optimize images (WebP, lazy loading)
- Enable browser caching
- Use HTTP/2

## Analytics Setup

### Google Analytics
Add to `<head>`:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Plausible (Privacy-friendly)
Add to `<head>`:
```html
<script defer data-domain="regenbrowser.com" src="https://plausible.io/js/script.js"></script>
```

## SSL Certificate

Use Let's Encrypt (free):
```bash
# Certbot
sudo certbot --nginx -d regenbrowser.com -d www.regenbrowser.com
```

## Monitoring

- Set up uptime monitoring (UptimeRobot, Pingdom)
- Monitor page speed (Google PageSpeed Insights)
- Track errors (Sentry, LogRocket)
- Monitor analytics

## Backup

- Keep `launch/` folder in version control
- Regular backups of deployed files
- Document any custom configurations

