import * as vscode from "vscode";
import DecorationManager from "./decoration-manager";

export default function setupEventListener(
  context: vscode.ExtensionContext,
  fullToken: any
) {
  let activeEditor = vscode.window.activeTextEditor;
  const decorationManager = new DecorationManager(activeEditor, fullToken);

  if (activeEditor) {
    decorationManager.setActiveEditor(activeEditor);
    decorationManager.triggerUpdateDecorations();
  }

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (event.contentChanges.length === 0) {
        return;
      }

      const startLine = event.contentChanges[0].range.start.line;
      const endLine = event.contentChanges[0].range.end.line;

      if (activeEditor && event.document === activeEditor.document) {
        decorationManager.setActiveEditor(activeEditor);
        decorationManager.triggerUpdateDecorations(
          true,
          true,
          startLine,
          endLine
        );
      }
    },
    null,
    context.subscriptions
  );

  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      activeEditor = editor;
      if (editor) {
        decorationManager.setActiveEditor(editor);
        decorationManager.triggerUpdateDecorations();
      }
    },
    null,
    context.subscriptions
  );
}
