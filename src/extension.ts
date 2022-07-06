// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import getDesignToken from "antd-token-previewer/es/utils/getDesignToken";
import rgbHex from "rgb-hex";
import { getMarkdownString } from "./utils";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  const fullToken = getDesignToken();

  // vscode hover widget only support color style in <span></span>
  // https://github.com/microsoft/vscode/blob/6d2920473c6f13759c978dd89104c4270a83422d/src/vs/base/browser/markdownRenderer.ts#L296
  vscode.languages.registerHoverProvider(
    [
      "javascript",
      "javascriptreact",
      "typescript",
      "typescriptreact",
      "vue",
      "vue-html",
      "html",
    ],
    {
      provideHover(document, position) {
        const range = document.getWordRangeAtPosition(position);
        const word = document.getText(range);

        if (fullToken.hasOwnProperty(word as string)) {
          const value = String(fullToken[word as keyof typeof fullToken]);
          const colorSpan = getMarkdownString(value);

          const markDownString = new vscode.MarkdownString(
            `<h3>antd design token: ${word}</h3>${colorSpan}<code>${value}</code><br></br>`
          );
          markDownString.supportHtml = true;
          markDownString.isTrusted = true;

          return new vscode.Hover(markDownString);
        }
      },
    }
  );

  // Add antd token value tips on typing
  // Note: 11 is a `value` kind of completion items.
  // Based on the kind an icon is chosen by the editor.
  const items: any[] | undefined = [];

  for (let key in fullToken) {
    const value = fullToken[key as keyof typeof fullToken];
    const item = new vscode.CompletionItem(`${key}: ${value}`, 11);
    item.insertText = key;
    item.filterText = key;
    item.sortText = key;

    const colorSpan = getMarkdownString(value);
    const markDownString = new vscode.MarkdownString(
      `<h3>antd design token: ${key}</h3>${colorSpan}<code>${value}</code><br></br>`
    );

    markDownString.supportHtml = true;
    markDownString.isTrusted = true;
    item.documentation = markDownString;

    items.push(item);
  }

  vscode.languages.registerCompletionItemProvider(
    [
      "javascript",
      "javascriptreact",
      "typescript",
      "typescriptreact",
      "vue",
      "vue-html",
      "html",
    ],
    {
      provideCompletionItems(document): any {
        return new vscode.CompletionList(items, false);
      },
    }
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "antd-design-token.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage(
        "Hello World from antd design token!"
      );
    }
  );

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
