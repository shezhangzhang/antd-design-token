import * as vscode from "vscode";
import { genMarkdownString, getColorTokenValue } from "./utils";

export default function setupChangeEvent(
  context: vscode.ExtensionContext,
  fullToken: any
) {
  let timeout: NodeJS.Timer | undefined = undefined;
  let activeEditor = vscode.window.activeTextEditor;
  const fullTokenKeys = Object.keys(fullToken);
  const decorationSet = new Set<vscode.TextEditorDecorationType>();

  if (activeEditor) {
    triggerUpdateDecorations();
  }

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (activeEditor && event.document === activeEditor.document) {
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
        triggerUpdateDecorations();
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
      timeout = setTimeout(updateDecorations, 500);
    } else {
      updateDecorations();
    }
  }

  function updateDecorations() {
    if (activeEditor) {
      const text = activeEditor.document.getText();
      decorationSet.forEach((value) => {
        value.dispose();
      });

      fullTokenKeys.forEach((key: string) => {
        if (!activeEditor) {
          return;
        }
        const regEx = new RegExp(`\\b(${key})\\b(?!-)`, "g");

        let match;
        while ((match = regEx.exec(text))) {
          const valueDecorations: vscode.DecorationOptions[] = [];
          let decorationType: vscode.TextEditorDecorationType;

          const startPos = activeEditor.document.positionAt(match.index);
          const endPos = activeEditor.document.positionAt(
            match.index + match[0].length
          );

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

          decorationSet.add(decorationType);
          activeEditor.setDecorations(decorationType, valueDecorations);
        }
      });
    }
  }
}
