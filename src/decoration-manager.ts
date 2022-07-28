import * as vscode from "vscode";
import { genMarkdownString, getColorTokenValue } from "./utils";

export default class DecorationManager {
  private activeEditor: vscode.TextEditor | undefined;
  private fullToken: any;
  private fileDecorationMap: Map<
    string,
    Map<number, vscode.TextEditorDecorationType[]>
  >;
  private timeout: NodeJS.Timer | undefined = undefined;
  private fileName: string = "";

  constructor($activeEditor: vscode.TextEditor | undefined, $fullToken: any) {
    this.activeEditor = $activeEditor;
    this.fullToken = $fullToken;
    this.fileDecorationMap = new Map();
  }

  setActiveEditor(editor: vscode.TextEditor) {
    this.activeEditor = editor;
    this.fileName = editor.document.fileName;
  }

  triggerUpdateDecorations(
    throttle: boolean = false,
    isEdit: boolean = false,
    diffLine: number = 0,
    startLine?: number,
    endLine?: number
  ) {
    /**
     * Active editor changed event
     */
    if (!isEdit) {
      if (this.fileDecorationMap.has(this.fileName)) {
        this.clearCurrentFileDecoration();
        this.fileDecorationMap.set(this.fileName, new Map());
      }
    }

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }

    if (throttle) {
      this.timeout = setTimeout(() => {
        this.setupDecorations(diffLine, startLine, endLine);
      }, 500);
    } else {
      this.setupDecorations(diffLine, startLine, endLine);
    }
  }

  setupDecorations(diffLine: number, startLine?: number, endLine?: number) {
    if (startLine && endLine) {
      const lines = this.getLines(startLine, endLine);

      if (diffLine < 0) {
        this.clearCurrentFileDecoration(lines);
        this.updateFileDecorationMap(diffLine, startLine);
      }

      if (diffLine === 0) {
        this.clearCurrentFileDecoration([startLine]);
        this.setDecorations([startLine]);
      }

      if (diffLine > 0) {
        this.updateFileDecorationMap(diffLine, startLine);
        this.setDecorations(lines);
      }
    } else {
      this.setDecorations();
    }
  }

  setDecorations(sepecificLines?: number[]) {
    const text = this.activeEditor!.document.getText();
    const fullTokenKeys = Object.keys(this.fullToken);
    const lineDecorationMap: Map<number, vscode.TextEditorDecorationType[]> =
      this.fileDecorationMap.get(this.fileName) || new Map();

    if (!this.fileDecorationMap.has(this.fileName)) {
      this.fileDecorationMap.set(this.fileName, new Map());
    }

    fullTokenKeys.forEach((key: string) => {
      const regEx = new RegExp(`\\b(${key})\\b(?!-)`, "g");
      let match;

      while ((match = regEx.exec(text))) {
        const currentLine = this.activeEditor!.document.positionAt(
          match.index
        ).line;

        if (
          !sepecificLines ||
          (sepecificLines && sepecificLines.includes(currentLine))
        ) {
          this.setDecoration(match, key, lineDecorationMap);
        }
      }
    });

    this.fileDecorationMap.set(this.fileName, lineDecorationMap);
  }

  clearCurrentFileDecoration(lines?: number[]) {
    const lineDecorationMapItem = this.fileDecorationMap.get(this.fileName);
    if (lineDecorationMapItem?.size) {
      if (lines) {
        lines.forEach((line) => {
          if (lineDecorationMapItem.has(line)) {
            lineDecorationMapItem.get(line)?.forEach(this.dispose);
            lineDecorationMapItem.delete(line);
          }
        });
      } else {
        lineDecorationMapItem.forEach((value) => {
          value.forEach(this.dispose);
        });
      }
    }
  }

  dispose(disposable: vscode.TextEditorDecorationType) {
    disposable.dispose();
  }

  getLines(start: number, end: number): number[] {
    const result: number[] = [];

    if (start > end) {
      return [];
    }

    for (let i = start; i <= end; i++) {
      result.push(i);
    }

    return result;
  }

  setDecoration(
    match: RegExpExecArray,
    key: string,
    lineDecorationMap: Map<number, vscode.TextEditorDecorationType[]>
  ) {
    const valueDecorations: vscode.DecorationOptions[] = [];
    const startPos = this.activeEditor!.document.positionAt(match.index);
    const endPos = this.activeEditor!.document.positionAt(
      match.index + match[0].length
    );
    const currentLine = startPos.line;
    const value = String(this.fullToken[key]);
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

    const colorValue = getColorTokenValue(this.fullToken[key]);
    valueDecorations.push(decoration);

    const decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: colorValue ? `**` : `${String(this.fullToken[key])}`,
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
    this.activeEditor!.setDecorations(decorationType, valueDecorations);
  }

  updateFileDecorationMap(diffLine: number, startLine: number) {
    const lineDecorationMapItem = this.fileDecorationMap.get(this.fileName);
    const newMap: Map<number, vscode.TextEditorDecorationType[]> = new Map();

    if (lineDecorationMapItem?.size) {
      lineDecorationMapItem.forEach((value, key) => {
        if (key >= startLine) {
          newMap.set(
            diffLine > 0 ? key + diffLine : key - Math.abs(diffLine),
            lineDecorationMapItem.get(key)!
          );
        } else {
          newMap.set(key, lineDecorationMapItem.get(key)!);
        }
      });
    }

    this.fileDecorationMap.set(this.fileName, newMap);
  }
}
