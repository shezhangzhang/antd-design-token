import getDesignToken from "antd-token-previewer/es/utils/getDesignToken";
import * as vscode from "vscode";
import setupEventListener, { DisposableAndClear } from "./listener";
import setupAntdTokenCompletion from "./typing";

export function activate(context: vscode.ExtensionContext) {
  let isActive = true;
  let disposeTyping: vscode.Disposable;
  let disposableAndClear: DisposableAndClear;

  setup();

  const disposable = vscode.commands.registerCommand(
    "antd-design-token.toggle",
    () => {
      isActive = !isActive;

      if (isActive) {
        setup();
        vscode.window.showInformationMessage(
          "antd design token is active now."
        );
      } else {
        disposeTyping.dispose();
        disposableAndClear.disposable.forEach((disposable) =>
          disposable.dispose()
        );
        disposableAndClear.clear();
        vscode.window.showInformationMessage(
          "antd design token is inactive now."
        );
      }
    }
  );

  context.subscriptions.push(disposable);

  function setup() {
    const fullToken = getDesignToken();

    if (!fullToken) {
      vscode.window.showErrorMessage("Failed to get antd fullToken.");
      return;
    }

    disposeTyping = setupAntdTokenCompletion(fullToken);
    disposableAndClear = setupEventListener(context, fullToken);
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}
