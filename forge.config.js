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
    postMake: async (forgeConfig, results) => {
      if (process.env.CI) {
        const outputFolder = "artifacts";
        if (!fs.existsSync(outputFolder)) {
          fs.mkdirSync(outputFolder);
        }

        const packageJson = require('./package.json');
        const version = packageJson.version;

        return results.map((result) => {
          let currentArch = result.arch;
          if (result.arch === "ia32") {
            currentArch = "x86";
          }

          result.artifacts = result.artifacts.map((artifact) => {
            let os = 'Unknown';
            if (artifact.includes('deb')
              || artifact.includes('rpm')) {
              os = 'Linux';
            } else if (artifact.includes("dmg")
              || artifact.includes("zip")) {
              os = 'macOS';
            } else if (artifact.includes("msi")
              || artifact.includes("exe")
              || artifact.includes("nupkg")) {
              os = 'Windows';
            }
            const extension = path.extname(artifact)
            const newName = `${appName}-${os}-${currentArch}-${version}${extension}`;
            fs.renameSync(artifact, path.join(outputFolder, newName));
            return newName;
          })

          return result;
        })
      }
    },
  }
};
