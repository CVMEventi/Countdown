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
    asar: {
      unpack: "**/node_modules/grandiose/**/*",
    },
    osxSign: {},
    osxNotarize: {
      tool: 'notarytool',
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    },
    icon: "icons/icon.icns",
    win32metadata: {
      "CompanyName": "CVM Eventi",
      "ProductName": "Countdown"
    },
    appCategoryType: "public.app-category.utilities",
    name: appName,
    executableName: "countdown",
    derefSymlinks: true,
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
    packageAfterPrune: async (config, buildPath, electronVersion, platform) => {
      if (platform !== 'win32') {
        const binsPath = 'node_modules/grandiose/build/node_gyp_bins/python3'
        fs.unlinkSync(path.join(buildPath, binsPath));
      }
    },
    postMake: async (forgeConfig, results) => {
      if (process.env.CI) {
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
            const outputDir = path.dirname(artifact);
            fs.renameSync(artifact, path.join(outputDir, newName));
            return path.join(outputDir, newName);
          })

          return result;
        })
      }
    },
  }
};

export default config;
