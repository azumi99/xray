/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js'
    },
    jest: {
      setupTimeout: 120000
    }
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/gluestackdemo.app',
      build: 'xcodebuild -workspace ios/gluestackdemo.xcworkspace -scheme gluestackdemo -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/gluestackdemo.app',
      build: 'xcodebuild -workspace ios/gluestackdemo.xcworkspace -scheme gluestackdemo -configuration Release -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'android.debug': {
      type: 'android.apk',
      build: 'cd android && .\\gradlew.bat assembleDebug assembleAndroidTest -DtestBuildType=debug',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      package: 'com.masters.xray',
      launchActivity: 'com.masters.xray.MainActivity',
    },
    'android.release': {
      type: 'android.apk',
      build: 'cd android && .\\gradlew.bat assembleRelease assembleAndroidTest -DtestBuildType=release',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk'
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15'
      }
    },
    attached: {
      type: 'android.attached',
      device: {
        adbName: '.*'
      }
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Resizable_Experimental'
      }
    }
  },
  configurations: {
    "android.emu.debug": {
      "device": "emulator",
      "app": "android.debug"
    },
    "android.manual": {
      "device": "emulator",
      "app": "android.debug",
      "behavior": {
        "launchApp": "manual"
      },
      "session": {
        "autoStart": true,
        "debugSynchronization": 0,
        "server": "ws://localhost:8099",
        "sessionId": "test"
      },
      "testRunner": {
        "args": {
          "testTimeout": 999999
        }
      },
      "artifacts": false
    }
  }
};
