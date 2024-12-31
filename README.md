# SDK for Holipoly Apps

## 🚨 Alpha phase

App SDK is in the early stage at the moment. Every API below 1.x.x release is likely to change.

Feel free to play with SDK and move its code directly to your app.

## Installing

```bash
npm i @holipoly/app-sdk
```

## Docs

You can find the documentation [here](https://docs.holipoly.io/docs/3.x/developer/extending/apps/developing-apps/app-sdk/overview).

## Development

### How to link development version to your project

If you would like to develop the SDK and test it with existing project:

1. In the Holipoly App SDK directory run command

```bash
pnpm watch
```

Now any code change will trigger build operation automatically.

2. In your project directory:

```bash
pnpm add ../holipoly-app-sdk/dist
```

As path to your local copy of the App SDK may be different, adjust it accordingly.

### Code style

Before committing the code, Git pre-hooks will check staged changes for
following the code styles. If you would like to format the code by yourself, run
the command:

```bash
pnpm lint
```
