module.exports = {
  packagerConfig: {
    icon: "icons/icon.icns",
    win32metadata: {
      "CompanyName": "CVM Eventi",
      "ProductName": "Countdown"
    },
    appCategoryType: "public.app-category.utilities",
    name: "Countdown",
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
    }
  ],
  plugins: [
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
  ]
};
