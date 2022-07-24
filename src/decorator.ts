import * as vscode from "vscode";
import { genMarkdownString, getColorTokenValue } from "./utils";

export default function setupChangeEvent(
  context: vscode.ExtensionContext,
  fullToken: any
) {
  let timeout: NodeJS.Timer | undefined = undefined;
  let activeEditor = vscode.window.activeTextEditor;
  const fullTokenKeys = Object.keys(fullToken);
  const fileDecorationMap = new Map<
    string,
    vscode.TextEditorDecorationType[]
  >();
  const openedFileNameSet = new Set<string>();

  if (activeEditor) {
    const isOpened = checkOpenedFile(activeEditor.document.fileName);

    if (!isOpened) {
      triggerUpdateDecorations();
    }
  }

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (event.contentChanges.length === 0) {
        return;
      }

      if (activeEditor && event.document === activeEditor.document) {
        /**
         * As undo (reason === 1) or redo (reason === 2) are very fast, do it very fast too.
         */
        triggerUpdateDecorations(true);
      }
    },
    null,
    context.subscriptions
  );

  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      activeEditor = editor;
      if (editor) {
        const isOpened = checkOpenedFile(editor.document.fileName);

        if (!isOpened) {
          triggerUpdateDecorations();
        }
      }
    },
    null,
    context.subscriptions
  );

  function triggerUpdateDecorations(throttle = false) {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
    if (throttle) {
      timeout = setTimeout(() => {
        updateDecorations();
      }, 500);
    } else {
      updateDecorations();
    }
  }

  function updateDecorations() {
    if (activeEditor) {
      const text = activeEditor.document.getText();
      const fileName = activeEditor.document.fileName;
      let currentFileDecorations = fileDecorationMap.get(fileName) || [];

      /**
       * Dispose the line decoration between start and end
       */
      if (currentFileDecorations.length) {
        currentFileDecorations.forEach((item) => {
          item.dispose();
        });
        currentFileDecorations = [];
      }

      fullTokenKeys.forEach((key: string) => {
        if (!activeEditor) {
          return;
        }

        const regEx = new RegExp(`\\b(${key})\\b(?!-)`, "g");

        let match;
        while ((match = regEx.exec(text))) {
          const valueDecorations: vscode.DecorationOptions[] = [];
          let decorationType: vscode.TextEditorDecorationType;

          /**
           * TIPS:
           * Actually, they are always at the same line.
           */
          const startPos = activeEditor.document.positionAt(match.index);
          const endPos = activeEditor.document.positionAt(
            match.index + match[0].length
          );
          const currentLine = startPos.line;

          const value = String(fullToken[key]);
          const colorSpan = genMarkdownString(value);
          const markDownString = new vscode.MarkdownString(
            `<h3>antd design token: ${match[0]}</h3>${colorSpan}<code>${value}</code><br></br>`
          );
          markDownString.supportHtml = true;
          markDownString.isTrusted = true;

          const decoration = {
            range: new vscode.Range(startPos, endPos),
            hoverMessage: markDownString,
          };

          const colorValue = getColorTokenValue(fullToken[key]);
          valueDecorations.push(decoration);

          decorationType = vscode.window.createTextEditorDecorationType({
            after: {
              contentText: colorValue ? `**` : `(${String(fullToken[key])})`,
              backgroundColor: colorValue || "",
              margin: "0 0 0 4px;",
              color: colorValue || "#1890ff",
              fontWeight: "bolder",
            },
          });

          currentFileDecorations.push(decorationType);
          activeEditor.setDecorations(decorationType, valueDecorations);
        }
      });
      fileDecorationMap.set(fileName, currentFileDecorations);
    }
  }

  function checkOpenedFile(fileName: string): boolean {
    if (openedFileNameSet.has(fileName)) {
      return true;
    } else {
      openedFileNameSet.add(fileName);
      return false;
    }
  }
}
