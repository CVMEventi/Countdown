import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

import * as fs from "fs";
import * as path from "path";
import { APP_VERSION } from "./src/version";
import MakerDMG from "@electron-forge/maker-dmg";
import PublisherGithub from "@electron-forge/publisher-github";

const packageJson = require("./package.json");

const appName = "Countdown";

const config: ForgeConfig = {
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
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: "countdown",
    }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
    new MakerDMG(),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/renderer/index.html',
            js: './src/renderer/index.js',
            name: 'main_window',
          },
        ],
      },
      loggerPort: 9050
    }),
    {
      name: "@timfish/forge-externals-plugin",
      config: {
        "externals": ["grandiose"],
        "includeDeps": true,
      }
    }
  ],
  publishers: [
    new PublisherGithub({
      repository: {
        owner: "CVMEventi",
        name: "Countdown"
      }
    })
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

        const version = APP_VERSION;

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

export default config;
