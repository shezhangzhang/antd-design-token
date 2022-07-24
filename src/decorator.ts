import * as vscode from "vscode";
import { genMarkdownString, getColorTokenValue } from "./utils";

interface DecorationItem {
  line: number;
  disposable: vscode.TextEditorDecorationType;
}

export default function setupChangeEvent(
  context: vscode.ExtensionContext,
  fullToken: any
) {
  let timeout: NodeJS.Timer | undefined = undefined;
  let activeEditor = vscode.window.activeTextEditor;
  const fullTokenKeys = Object.keys(fullToken);
  const fileDecorationMap = new Map<string, DecorationItem[]>();
  const openedFileNameSet = new Set<string>();
  let lineCount = 0;

  if (activeEditor) {
    lineCount = activeEditor.document.lineCount;
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

      const startLine = event.contentChanges[0].range.start.line;
      let endLine = event.contentChanges[0].range.end.line;

      if (activeEditor && event.document === activeEditor.document) {
        /**
         * As undo (reason === 1) or redo (reason === 2) are very fast, do it very fast too.
         * Same as `delete` some code
         */
        const throttle =
          event.reason !== undefined
            ? false
            : event.document.lineCount - lineCount >= 0;
        triggerUpdateDecorations(throttle, true, startLine, endLine);
      }
    },
    null,
    context.subscriptions
  );

  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      activeEditor = editor;
      if (editor) {
        lineCount = editor.document.lineCount;
        const isOpened = checkOpenedFile(editor.document.fileName);

        if (!isOpened) {
          triggerUpdateDecorations();
        }
      }
    },
    null,
    context.subscriptions
  );

  function triggerUpdateDecorations(
    throttle = false,
    isEdit = false,
    startLine?: number,
    endLine?: number
  ) {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
    if (throttle) {
      timeout = setTimeout(() => {
        updateDecorations(isEdit, startLine, endLine);
      }, 500);
    } else {
      updateDecorations(isEdit, startLine, endLine);
    }
  }

  function updateDecorations(
    isEdit: boolean,
    startLine?: number,
    endLine?: number
  ) {
    if (activeEditor) {
      console.log("!!!!!!update!!!!", startLine, endLine);
      const text = activeEditor.document.getText();
      const fileName = activeEditor.document.fileName;

      if (!fileDecorationMap.has(fileName)) {
        fileDecorationMap.set(fileName, []);
      }

      const currentFileDecorations = fileDecorationMap.get(fileName) || [];
      const currentLineCount = activeEditor.document.lineCount;
      const diffLine = currentLineCount - lineCount;
      console.log("diffLine", diffLine);
      lineCount = currentLineCount;

      /**
       * Dispose the line decoration between start and end
       */
      if (
        startLine &&
        endLine &&
        currentFileDecorations.length &&
        diffLine <= 0
      ) {
        for (let i = startLine; i <= endLine; i++) {
          for (let j = 0; j < currentFileDecorations.length; j++) {
            if (currentFileDecorations[j].line === i) {
              currentFileDecorations[j].disposable.dispose();
              console.log("dispose", i);
              currentFileDecorations.splice(j--, 1);
            }
          }
        }
      }

      // if (diffLine > 0) {
      //   return;
      // }

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

          if (
            !isEdit ||
            // diffLine > 0 ||
            (startLine &&
              endLine &&
              currentLine >= startLine &&
              currentLine <= endLine)
          ) {
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

            currentFileDecorations.push({
              line: currentLine,
              disposable: decorationType,
            });
            console.log("setDecorations", currentLine);
            activeEditor.setDecorations(decorationType, valueDecorations);
          }
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
