import * as vscode from "vscode";
import DecorationManager from "./decoration-manager";
import { checkAntdProject } from "./utils";

export interface DisposableAndClear {
  disposable: vscode.Disposable[];
  clear: () => void;
}

export default function setupEventListenerAndDecorations(
  context: vscode.ExtensionContext,
  fullToken: any
): DisposableAndClear {
  let diffLine: number = 0;
  let fileLineCount: number = 0;
  let activeEditor = vscode.window.activeTextEditor;
  const decorationManager = new DecorationManager(activeEditor, fullToken);

  if (activeEditor) {
    fileLineCount = activeEditor.document.lineCount;
    decorationManager.setActiveEditor(activeEditor);
    console.log(44444);
    decorationManager.triggerUpdateDecorations();
  }

  const disposableTextChange = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (event.contentChanges.length === 0) {
        return;
      }

      if (activeEditor && event.document === activeEditor.document) {
        /**
         * redo, undo and line change
         */
        diffLine = activeEditor.document.lineCount - fileLineCount;
        fileLineCount = activeEditor.document.lineCount;
        if (event.reason || diffLine !== 0) {
          decorationManager.triggerUpdateDecorations(true);
        } else {
          // const [startLine, endLine] = getStartEndLine(
          //   event.document,
          //   event.contentChanges[0]
          // );
          const startLine = event.contentChanges[0].range.start.line;
          const endLine = event.contentChanges[0].range.end.line;

          decorationManager.setActiveEditor(activeEditor);
          decorationManager.triggerUpdateDecorations(
            true,
            true,
            diffLine,
            startLine,
            endLine
          );
        }
      }
    },
    null,
    context.subscriptions
  );

  const disposableActiveChange = vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      console.log("change!!!!!");
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
    const originalStartLine = startLine;
    const originalEndLine = endLine;
    const startLinePos = document.lineAt(startLine);

    const isStartLineEmpty = startLinePos.isEmptyOrWhitespace;
    const isSecondLineEmpty = document.lineAt(
      startLine + 1
    ).isEmptyOrWhitespace;
    const startLineLastPos = new vscode.Position(
      startLine,
      Math.max(startLinePos.text.length, 0)
    );
    const startRange = change.range.start;
    const isStartLineLastPos = startLineLastPos.isEqual(startRange);

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
    if (!isStartLineEmpty && isSecondLineEmpty && diffLine === 1) {
      startLine += 1;
      endLine += 1;
    }

    /**
     * delete to the end of the previous line
     */
    if (!isStartLineEmpty && isStartLineLastPos && diffLine < 0) {
      startLine += 1;
    }

    /**
     * paste override copyed lines
     */
    if (!isStartLineLastPos) {
      return [startLine, endLine, originalStartLine, originalEndLine];
    }

    return [startLine, endLine];
  }

  return {
    disposable: [disposableTextChange, disposableActiveChange],
    clear: () => decorationManager.clearAllFileDecorations(),
  };
}
