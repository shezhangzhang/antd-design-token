import * as vscode from "vscode";
import { genMarkdownString, getColorTokenValue } from "./utils";

interface LineDecorationItem {
  line: number;
  disposable: vscode.TextEditorDecorationType;
}

export default function setupChangeEvent(
  context: vscode.ExtensionContext,
  fullToken: any
) {
  let timeout: NodeJS.Timer | undefined = undefined;
  let activeEditor = vscode.window.activeTextEditor;
  const fileDecorationMap = new Map<
    string,
    Map<number, vscode.TextEditorDecorationType[]>
  >();
  let fileLineCount = 0;

  if (activeEditor) {
    fileLineCount = activeEditor.document.lineCount;
    triggerUpdateDecorations();
  }

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (event.contentChanges.length === 0) {
        return;
      }

      const startLine = event.contentChanges[0].range.start.line;
      const endLine = event.contentChanges[0].range.end.line;

      if (activeEditor && event.document === activeEditor.document) {
        /**
         * As undo (reason === 1) or redo (reason === 2) are very fast, do it very fast too.
         * Same as `delete` some code
         */
        const throttle =
          event.reason !== undefined
            ? false
            : event.document.lineCount - fileLineCount >= 0;
        triggerUpdateDecorations(throttle, true, startLine, endLine);
      }
    },
    null,
    context.subscriptions
  );

  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      console.log("Active Editor!", editor?.document.fileName);
      activeEditor = editor;
      if (editor) {
        const fileName = editor.document.fileName;
        fileLineCount = editor.document.lineCount;

        if (fileDecorationMap.has(fileName)) {
          clearDecoration(fileName);
          fileDecorationMap.set(fileName, new Map());
        }

        triggerUpdateDecorations();
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
        updateDecorations(startLine, endLine);
      }, 500);
    } else {
      updateDecorations(startLine, endLine);
    }
  }

  function updateDecorations(startLine?: number, endLine?: number) {
    if (activeEditor) {
      if (startLine && endLine) {
        console.log("editing", startLine, endLine);
        const currentLineCount = activeEditor.document.lineCount;
        const diffLine = currentLineCount - fileLineCount;
        const fileName = activeEditor.document.fileName;
        console.log("diffLine", diffLine);

        if (diffLine < 0) {
          const lines = getLines(startLine, endLine);
          return clearDecoration(fileName, lines);
        }

        if (diffLine === 0) {
          clearDecoration(fileName, [startLine]);
        }
      }

      setupDecoration(startLine, endLine);
    }
  }

  function setupDecoration(startLine?: number, endLine?: number) {
    console.log("!!!!!!updating!!!!!", startLine, endLine);
    const fileName = activeEditor!.document.fileName;
    const text = activeEditor!.document.getText();
    const fullTokenKeys = Object.keys(fullToken);
    const lineDecorationMap = new Map<
      number,
      vscode.TextEditorDecorationType[]
    >();

    if (!fileDecorationMap.has(fileName)) {
      fileDecorationMap.set(fileName, new Map());
    }

    fullTokenKeys.forEach((key: string) => {
      const regEx = new RegExp(`\\b(${key})\\b(?!-)`, "g");
      let match;

      while ((match = regEx.exec(text))) {
        const valueDecorations: vscode.DecorationOptions[] = [];
        let decorationType: vscode.TextEditorDecorationType;

        /**
         * TIPS:
         * Actually, they are always at the same line.
         */
        const startPos = activeEditor!.document.positionAt(match.index);
        const endPos = activeEditor!.document.positionAt(
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
            contentText: colorValue ? `**` : `${String(fullToken[key])}`,
            backgroundColor: colorValue || "",
            margin: "0 0 0 5px;",
            color: colorValue || "#b37feb",
            fontWeight: "bolder",
          },
        });

        const lineValue = lineDecorationMap.get(currentLine);
        lineDecorationMap.set(
          currentLine,
          lineValue ? lineValue.concat([decorationType]) : [decorationType]
        );
        console.log("setDecorations", currentLine);
        activeEditor!.setDecorations(decorationType, valueDecorations);
      }
    });

    fileDecorationMap.set(fileName, lineDecorationMap);
    console.log(fileDecorationMap);
  }

  function clearDecoration(fileName: string, lines?: number[]) {
    const lineDecorationMap = fileDecorationMap.get(fileName);
    if (lineDecorationMap) {
      if (lines) {
        lines.forEach((line) => {
          console.log("dispose line", line);
          lineDecorationMap.get(line)?.forEach(dispose);
        });
      } else {
        lineDecorationMap.forEach((value) => {
          value.forEach(dispose);
        });
      }
    }
  }

  function dispose(disposable: vscode.TextEditorDecorationType) {
    disposable.dispose();
  }

  function getLines(start: number, end: number): number[] {
    const result: number[] = [];

    if (start > end) {
      return [];
    }

    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    return result;
  }
}
