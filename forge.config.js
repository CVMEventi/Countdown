const fs = require('fs');
const path = require('path');
const packageJson = require("./package.json");

const appName = "Countdown";

module.exports = {
  packagerConfig: {
    asar: true,
    icon: "icons/icon.icns",
    win32metadata: {
      "CompanyName": "CVM Eventi",
      "ProductName": "Countdown"
    },
    appCategoryType: "public.app-category.utilities",
    name: appName,
    executableName: "countdown"
  },
  rebuildConfig: {},"makers": [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "countdown"
      }
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: [
        "darwin"
      ]
    },
    {
      name: "@electron-forge/maker-deb",
      config: {}
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {}
    },
    {
      name: "@electron-forge/maker-dmg",
      config: {}
    }
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {}
    },
    {
      name: "@electron-forge/plugin-webpack",
      config: {
        mainConfig: "./webpack.main.config.js",
        renderer: {
          config: "./webpack.renderer.config.js",
          entryPoints: [
            {
              html: "./src/renderer/index.html",
              js: "./src/renderer/index.js",
              name: "main_window"
            }
          ]
        },
        loggerPort: 9050
      }
    }
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "CVMEventi",
          name: "Countdown"
        }
      }
    }
  ],
  hooks: {
    prePackage: async () => {
      fs.rmSync('node_modules/grandiose/build/node_gyp_bins', {recursive: true, force: true});
    },
    postMake: async (forgeConfig, options) => {
      if (process.env.CI) {
        const outputFolder = "artifacts";
        for (let i = 0; i < options.length; i++) {
          if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder);
          }
          const packageJson = require('./package.json');
          const version = packageJson.version;

          let currentArch = options[i].arch;

          if (options[i]["arch"] === "ia32") {
            currentArch = "x86";
          }

          for (let artifact = 0; artifact < options[i]["artifacts"].length; artifact++) {
            if (options[i]["artifacts"][artifact].includes("deb")) fs.rename(options[i]["artifacts"][artifact], path.join(outputFolder, `${appName}-Linux-${currentArch}-${version}.deb`), function(err) {});
            else if (options[i]["artifacts"][artifact].includes("rpm")) fs.rename(options[i]["artifacts"][artifact], path.join(outputFolder, `${appName}-Linux-${currentArch}-${version}.rpm`), function(err) {});
            else if (options[i]["artifacts"][artifact].includes("dmg")) fs.rename(options[i]["artifacts"][artifact], path.join(outputFolder, `${appName}-MacOS-${currentArch}-${version}.dmg`), function(err) {});
            else if (options[i]["artifacts"][artifact].includes("zip")) fs.rename(options[i]["artifacts"][artifact], path.join(outputFolder, `${appName}-MacOS-${currentArch}-${version}.zip`), function(err) {});
            else if (options[i]["artifacts"][artifact].includes("msi")) fs.rename(options[i]["artifacts"][artifact], path.join(outputFolder, `${appName}-Windows-${currentArch}-${version}.msi`), function(err) {});
            else if (options[i]["artifacts"][artifact].includes("exe")) fs.rename(options[i]["artifacts"][artifact], path.join(outputFolder, `${appName}-Windows-${currentArch}-${version}.exe`), function(err) {});
            else if (options[i]["artifacts"][artifact].includes("nupkg")) fs.rename(options[i]["artifacts"][artifact], path.join(outputFolder, `${appName}-Windows-${currentArch}-${version}.nupkg`), function(err) {});
          }
        }
      }
    },
  }
};
