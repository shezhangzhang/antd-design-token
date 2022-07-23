// The module 'vscode' contains the VS Code extensibility API
import * as vscode from "vscode";
import setupChangeEvent from "./decorator";
import setupAntdToken from "./hover";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
let isActive = true;

export function activate(context: vscode.ExtensionContext) {
  // This line of code will only be executed once when your extension is activated
  let disposeHover: vscode.Disposable;
  let disposeTyping: vscode.Disposable;
  [disposeHover, disposeTyping] = setupAntdToken();
  setupChangeEvent();

  vscode.commands.registerCommand("antd-design-token.toggle", () => {
    isActive = !isActive;

    if (isActive) {
      [disposeHover, disposeTyping] = setupAntdToken();
      vscode.window.showInformationMessage("antd design token is active now.");
    } else {
      disposeHover.dispose();
      disposeTyping.dispose();
      vscode.window.showInformationMessage(
        "antd design token is inactive now."
      );
    }
  });
}

// this method is called when your extension is deactivated
export function deactivate() {}
