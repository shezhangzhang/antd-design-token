import getDesignToken from "antd-token-previewer/es/utils/getDesignToken";
import * as vscode from "vscode";
import setupChangeEvent from "./decorator";
import setupAntdToken from "./typing";

export function activate(context: vscode.ExtensionContext) {
  let isActive = true;
  let disposeTyping: vscode.Disposable;

  const fullToken = getDesignToken();

  if (!fullToken) {
    vscode.window.showErrorMessage("Failed to get antd fullToken.");
    return;
  }

  disposeTyping = setupAntdToken(fullToken);
  setupChangeEvent(context, fullToken);

  const disposable = vscode.commands.registerCommand(
    "antd-design-token.toggle",
    () => {
      isActive = !isActive;

      if (isActive) {
        disposeTyping = setupAntdToken(fullToken);
        vscode.window.showInformationMessage(
          "antd design token is active now."
        );
      } else {
        disposeTyping.dispose();
        vscode.window.showInformationMessage(
          "antd design token is inactive now."
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
