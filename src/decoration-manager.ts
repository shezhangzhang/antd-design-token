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
  private fileLineCount: number = 0;

  constructor($activeEditor: vscode.TextEditor | undefined, $fullToken: any) {
    this.activeEditor = $activeEditor;
    this.fullToken = $fullToken;
    this.fileDecorationMap = new Map();
  }

  setActiveEditor(editor: vscode.TextEditor) {
    this.activeEditor = editor;
    this.fileName = editor.document.fileName;
    this.fileLineCount = editor.document.lineCount;
  }

  triggerUpdateDecorations(
    throttle: boolean = false,
    isEdit: boolean = false,
    startLine?: number,
    endLine?: number
  ) {
    console.log("fileName", this.fileName);
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
        this.setupDecorations(startLine, endLine);
      }, 500);
    } else {
      this.setupDecorations(startLine, endLine);
    }
  }

  setupDecorations(startLine?: number, endLine?: number) {
    if (startLine && endLine) {
      console.log("editing", startLine, endLine);
      const currentLineCount = this.activeEditor!.document.lineCount;
      const diffLine = currentLineCount - this.fileLineCount;
      console.log("diffLine", diffLine);

      if (diffLine < 0) {
        const lines = this.getLines(startLine, endLine);
        return this.clearCurrentFileDecoration(lines);
      }

      if (diffLine === 0) {
        this.clearCurrentFileDecoration([startLine]);
      }
    }

    this.setDecorations();
  }

  setDecorations() {
    console.log("!!!!!!updating!!!!!");
    const text = this.activeEditor!.document.getText();
    const fullTokenKeys = Object.keys(this.fullToken);
    const lineDecorationMap = new Map<
      number,
      vscode.TextEditorDecorationType[]
    >();

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

        this.setDecoration(match, key, lineDecorationMap);
      }
    });

    this.fileDecorationMap.set(this.fileName, lineDecorationMap);
    console.log(this.fileDecorationMap);
  }

  clearCurrentFileDecoration(lines?: number[]) {
    const lineDecorationMapItem = this.fileDecorationMap.get(this.fileName);

    if (lineDecorationMapItem) {
      if (lines) {
        lines.forEach((line) => {
          console.log("dispose line", line);
          lineDecorationMapItem.get(line)?.forEach(this.dispose);
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
    // console.log("setDecorations", currentLine);
    this.activeEditor!.setDecorations(decorationType, valueDecorations);
  }
}
