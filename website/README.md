# BunServe Documentation Website

This is the documentation website for BunServe, built with [Next.js](https://nextjs.org/) and [Fumadocs](https://fumadocs.vercel.app/).

## Getting Started

### Prerequisites

- Bun v1.3.2 or later

### Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the documentation.

### Building for Production

```bash
# Build the website
bun run build

# Start production server
bun run start
```

## Project Structure

```
website/
├── app/                    # Next.js App Router
│   ├── docs/              # Documentation pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Homepage
│   └── source.ts          # Fumadocs source configuration
├── content/               # MDX documentation content
│   └── docs/              # Documentation pages
│       ├── index.mdx
│       ├── getting-started.mdx
│       ├── routing.mdx
│       ├── middleware.mdx
│       ├── error-handling.mdx
│       ├── cookies.mdx
│       ├── examples.mdx
│       ├── api-reference.mdx
│       └── meta.json      # Navigation configuration
├── public/                # Static assets
├── next.config.mjs        # Next.js configuration
├── tailwind.config.ts     # Tailwind CSS configuration
└── source.config.ts       # Fumadocs MDX configuration
```

## Adding Documentation

1. Create a new `.mdx` file in `content/docs/`
2. Add frontmatter with `title` and `description`
3. Update `content/docs/meta.json` to include the new page in navigation
4. Run `bun run dev` to see your changes

Example:

```mdx
---
title: "My New Page"
description: "Description of my new page"
---

# My New Page

Content goes here...
```

## Features

- ✨ **Fumadocs** - Beautiful documentation UI
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🔍 **Search** - Built-in search functionality
- 📱 **Responsive** - Mobile-friendly design
- 🌙 **Dark Mode** - Automatic dark mode support
- ⚡ **Fast** - Built on Next.js and Bun

## Deployment

The website can be deployed to any platform that supports Next.js:

- [Vercel](https://vercel.com)
- [Netlify](https://netlify.com)
- [Cloudflare Pages](https://pages.cloudflare.com)

## License

MIT
