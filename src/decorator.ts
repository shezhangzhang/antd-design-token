import * as vscode from "vscode";

export default function setupChangeEvent() {
  let activeEditor = vscode.window.activeTextEditor;

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      console.log(event);
      // if (activeEditor && event.document === activeEditor.document) {
      // 	triggerUpdateDecorations(true);
      // }
    },
    null
    // context.subscriptions
  );
}
