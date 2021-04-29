
# Snapshot build of @angular-devkit/build-webpack

This repository is a snapshot of a commit on the original repository. The original code used to
generate this is located at http://github.com/angular/angular-cli.

We do not accept PRs or Issues opened on this repository. You should not use this over a tested and
released version of this package.

To test this snapshot in your own project, use

```bash
npm install git+https://github.com/angular/angular-devkit-build-webpack-builds.git
```

----
# Webpack Builder for Architect

This package allows you to run Webpack and Webpack Dev Server using Architect.

To use it on your Angular CLI app, follow these steps:

- run `npm install @angular-devkit/build-webpack`.
- create a webpack configuration.
- add the following targets inside `angular.json`.

```
  "projects": {
    "app": {
      // ...
      "architect": {
        // ...
        "build-webpack": {
          "builder": "@angular-devkit/build-webpack:webpack",
          "options": {
            "webpackConfig": "webpack.config.js"
          }
        },
        "serve-webpack": {
          "builder": "@angular-devkit/build-webpack:webpack-dev-server",
          "options": {
            "webpackConfig": "webpack.config.js"
          }
        }
      }
```

- run `ng run app:build-webpack` to build, and `ng run app:serve-webpack` to serve.

All options, including `watch` and `stats`, are looked up inside the webpack configuration.
