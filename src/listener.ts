import * as vscode from "vscode";
import DecorationManager from "./decoration-manager";

export default function setupEventListener(
  context: vscode.ExtensionContext,
  fullToken: any
) {
  let diffLine: number = 0;
  let fileLineCount: number = 0;
  let activeEditor = vscode.window.activeTextEditor;
  const decorationManager = new DecorationManager(activeEditor, fullToken);

  if (activeEditor) {
    fileLineCount = activeEditor.document.lineCount;
    decorationManager.setActiveEditor(activeEditor);
    decorationManager.triggerUpdateDecorations();
  }

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (event.contentChanges.length === 0) {
        return;
      }

      if (activeEditor && event.document === activeEditor.document) {
        console.log("change", event.contentChanges[0]);

        diffLine = activeEditor.document.lineCount - fileLineCount;
        fileLineCount = activeEditor.document.lineCount;

        const [startLine, endLine] = getStartEndLine(
          event.document,
          event.contentChanges[0]
        );

        console.log("editing", startLine, endLine);
        decorationManager.setActiveEditor(activeEditor);
        decorationManager.triggerUpdateDecorations(
          diffLine === 0,
          true,
          diffLine,
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
        fileLineCount = editor.document.lineCount || 0;
        decorationManager.setActiveEditor(editor);
        decorationManager.triggerUpdateDecorations();
      }
    },
    null,
    context.subscriptions
  );

  function getStartEndLine(
    document: vscode.TextDocument,
    change: vscode.TextDocumentContentChangeEvent
  ) {
    const newLines = change.text.split("\n").length;
    let startLine = change.range.start.line;
    let endLine = change.range.end.line;
    const startLinePos = document.lineAt(startLine);

    const isStartLineEmpty = startLinePos.isEmptyOrWhitespace;
    const startLineLastPos = new vscode.Position(
      startLine,
      Math.max(startLinePos.text.length, 0)
    );
    const isStartLineLastPos = startLineLastPos.isEqual(change.range.start);

    console.log("original", startLine, endLine);
    console.log("isStartLineEmpty", isStartLineEmpty);
    console.log("isStartLineLastPos", isStartLineLastPos);

    /**
     * paste multiple lines
     * there are some `\n` in `text`, but currentChange[0].range is always a single line
     */
    if (newLines > 1 && !change.text.startsWith("\n")) {
      endLine = startLine + newLines - 1;
    }

    /**
     * cmd + x
     */
    if (
      change.range.start.character === 0 &&
      change.range.end.character === 0
    ) {
      endLine -= 1;
    }

    /**
     * enter
     */
    if (!isStartLineEmpty && diffLine === 1) {
      startLine += 1;
      endLine += 1;
    }

    /**
     * delete to the end of the previous line
     */
    if (!isStartLineEmpty && isStartLineLastPos && diffLine < 0) {
      startLine += 1;
    }

    return [startLine, endLine];
  }
}
