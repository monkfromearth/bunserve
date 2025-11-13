# Publishing BunServe to npm

## ✅ Pre-flight Checklist

All checks passed:
- ✅ 85 tests passing (including 15 docs verification tests)
- ✅ TypeScript types generated
- ✅ Package.json configured correctly
- ✅ README with badges
- ✅ Documentation complete
- ✅ CI/CD configured

## 🧪 Test Locally First

Before publishing, test the package locally:

```bash
./scripts/test-package-locally.sh
```

This will:
1. Build the package
2. Create a tarball
3. Install it in a test directory
4. Run comprehensive tests
5. Verify everything works

## 📦 Publish to npm

### 1. Login to npm

```bash
npm login
```

### 2. Publish

```bash
npm publish
```

The `prepublishOnly` hook will automatically:
- Run `bun run typecheck` (verify types)
- Run `bun test` (all 85 tests)
- Run `bun run build` (build dist files)

### 3. Verify

```bash
# Check on npm
open https://www.npmjs.com/package/bunserve

# Install and test
mkdir /tmp/test-install
cd /tmp/test-install
bun add bunserve
```

## 🎯 Post-Publish

### 1. Create GitHub Release

1. Go to https://github.com/monkfromearth/bunserve/releases/new
2. Tag: `v0.1.0`
3. Title: "BunServe v0.1.0 - Initial Release"
4. Description: Copy from CHANGELOG.md
5. Click "Publish release"

### 2. Update README badges

The npm version and CI badges will automatically update after publishing.

### 3. Announce

Share on:
- Twitter/X: "Just published BunServe 🎉 - Express-like routing for Bun with <5% overhead"
- Reddit: r/node, r/typescript, r/programming
- Bun Discord
- Dev.to

## 🔄 Publishing Updates

For future releases:

```bash
# Update version
bun version patch  # 0.1.0 -> 0.1.1
bun version minor  # 0.1.0 -> 0.2.0
bun version major  # 0.1.0 -> 1.0.0

# Update CHANGELOG.md
# Commit changes
git add .
git commit -m "chore: release v0.1.1"
git push

# Publish
npm publish

# Create GitHub release
```

## 📊 Package Contents

What will be published (8.3 KB compressed):

```
bunserve-0.1.0.tgz
├── dist/
│   └── index.js (20.6 KB)
├── LICENSE (1.1 KB)
├── README.md (12.1 KB)
└── package.json (1.5 KB)
```

Total: 35.3 KB unpacked

## ✨ You're Ready!

Everything is configured correctly. Just run:

```bash
npm login
npm publish
```

🚀 Good luck!
