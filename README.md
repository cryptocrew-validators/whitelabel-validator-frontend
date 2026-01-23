# Injective Validator Control Frontend

A fully functional React TypeScript frontend for managing Injective network validators using Cosmos Kit wallet connector.

## Features

- Connect multiple wallet types (Keplr, Leap, Cosmostation) via Cosmos Kit
- Register validators with deeplink support for validator pubkey
- Register orchestrator address and Ethereum address
- Edit validator details (moniker, description, commission rates)
- Manage delegations (delegate/undelegate)
- View validator status, voting power, commission, and orchestrator mapping

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## CI/CD Pipeline

This project includes automated CI/CD pipelines using GitHub Actions:

### Continuous Integration

The CI pipeline runs on every push and pull request to `main`, `master`, or `develop` branches:

- **Linting**: Runs ESLint to check code quality
- **Type Checking**: Validates TypeScript types
- **Build**: Ensures the project builds successfully
- **Artifacts**: Uploads build artifacts for review

### Deployment

The deployment pipeline automatically deploys to GitHub Pages when code is pushed to `main` or `master`:

1. **Automatic Deployment**: Triggers on push to main/master branches
2. **Manual Deployment**: Can be triggered manually via GitHub Actions UI
3. **Build Process**: Runs production build with optimizations
4. **GitHub Pages**: Deploys the built static files

### Setting up GitHub Pages

1. Go to your repository Settings → Pages
2. Under "Source", select "GitHub Actions"
3. The deployment will run automatically on push to main/master

### Alternative Deployment Options

#### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Or connect your GitHub repo at [vercel.com](https://vercel.com)

#### Netlify

1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run `netlify deploy --prod --dir=dist`
3. Or connect your GitHub repo at [netlify.com](https://netlify.com)

### Environment Variables

If you need environment variables for deployment, create a `.env.production` file or configure them in your hosting platform's dashboard.
