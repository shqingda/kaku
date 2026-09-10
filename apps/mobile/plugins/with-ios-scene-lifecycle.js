const fs = require('node:fs');
const path = require('node:path');

const {
  IOSConfig,
  createRunOncePlugin,
  withAppDelegate,
  withInfoPlist,
} = require('expo/config-plugins');

const LEGACY_REACT_NATIVE_START = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif`;

const SCENE_REACT_NATIVE_START = `    // The window is created and React Native is started by SceneDelegate.
    // iOS 27 requires apps built with its SDK to use the scene-based life cycle.`;

const SCENE_DELEGATE = `internal import ExpoModulesCore
import React

@objc(SceneDelegate)
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else {
      return
    }
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory else {
      fatalError("SceneDelegate could not access the React Native factory from AppDelegate.")
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: nil
    )

    route(urlContexts: connectionOptions.urlContexts)
    connectionOptions.userActivities.forEach(route(userActivity:))
    if let shortcutItem = connectionOptions.shortcutItem {
      route(shortcutItem: shortcutItem) { _ in }
    }
  }

  func sceneDidDisconnect(_ scene: UIScene) {
    window = nil
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    appDelegate?.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    appDelegate?.applicationWillResignActive(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    appDelegate?.applicationWillEnterForeground(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    appDelegate?.applicationDidEnterBackground(UIApplication.shared)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    route(urlContexts: URLContexts)
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    route(userActivity: userActivity)
  }

  func windowScene(
    _ windowScene: UIWindowScene,
    performActionFor shortcutItem: UIApplicationShortcutItem,
    completionHandler: @escaping (Bool) -> Void
  ) {
    route(shortcutItem: shortcutItem, completionHandler: completionHandler)
  }

  private var appDelegate: AppDelegate? {
    UIApplication.shared.delegate as? AppDelegate
  }

  private func route(urlContexts: Set<UIOpenURLContext>) {
    guard let appDelegate else {
      return
    }

    for context in urlContexts {
      var options: [UIApplication.OpenURLOptionsKey: Any] = [
        .openInPlace: context.options.openInPlace,
      ]
      if let sourceApplication = context.options.sourceApplication {
        options[.sourceApplication] = sourceApplication
      }
      if let annotation = context.options.annotation {
        options[.annotation] = annotation
      }
      _ = appDelegate.application(UIApplication.shared, open: context.url, options: options)
    }
  }

  private func route(userActivity: NSUserActivity) {
    guard let appDelegate else {
      return
    }

    _ = appDelegate.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }

  private func route(
    shortcutItem: UIApplicationShortcutItem,
    completionHandler: @escaping (Bool) -> Void
  ) {
    guard let appDelegate else {
      completionHandler(false)
      return
    }

    appDelegate.application(
      UIApplication.shared,
      performActionFor: shortcutItem,
      completionHandler: completionHandler
    )
  }
}
`;

function expoAlreadySupportsScenes() {
  const expoRoot = path.dirname(require.resolve('expo/package.json'));
  return fs.existsSync(
    path.join(expoRoot, 'ios/AppDelegates/ExpoAppSceneDelegate.swift'),
  );
}

function withIosSceneLifecycle(config) {
  if (expoAlreadySupportsScenes()) {
    return config;
  }

  config = withInfoPlist(config, (infoPlistConfig) => {
    infoPlistConfig.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return infoPlistConfig;
  });

  config = withAppDelegate(config, (appDelegateConfig) => {
    if (appDelegateConfig.modResults.language !== 'swift') {
      throw new Error('The iOS 27 scene lifecycle plugin requires a Swift AppDelegate.');
    }

    const { contents } = appDelegateConfig.modResults;
    if (contents.includes(SCENE_REACT_NATIVE_START)) {
      return appDelegateConfig;
    }
    if (!contents.includes(LEGACY_REACT_NATIVE_START)) {
      throw new Error(
        'Could not find the Expo React Native startup block in AppDelegate.swift.',
      );
    }

    appDelegateConfig.modResults.contents = contents.replace(
      LEGACY_REACT_NATIVE_START,
      SCENE_REACT_NATIVE_START,
    );
    return appDelegateConfig;
  });

  return IOSConfig.XcodeProjectFile.withBuildSourceFile(config, {
    filePath: 'SceneDelegate.swift',
    contents: SCENE_DELEGATE,
    overwrite: true,
  });
}

module.exports = createRunOncePlugin(
  withIosSceneLifecycle,
  'with-ios-scene-lifecycle',
  '1.0.0',
);
