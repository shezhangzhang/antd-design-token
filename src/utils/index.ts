import rgbHex from "rgb-hex";

/**
 * Generate the MarkdownString for vscode.MarkdownString function
 * Note: should convert rgb color to hex
 *
 * vscode hover widget only support color style in <span></span>
 * https://github.com/microsoft/vscode/blob/6d2920473c6f13759c978dd89104c4270a83422d/src/vs/base/browser/markdownRenderer.ts#L296
 * @param value string
 * @returns MarkdownString | string
 */
export function genMarkdownString(value: string): string {
  let hexColor = "";
  if (/#[0-9a-fA-F]+/.test(value)) {
    hexColor = value;
  } else if (value.startsWith("rgb")) {
    hexColor = `#${rgbHex(value)}`;
  }
  return hexColor
    ? `<span style='background-color:${hexColor};'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;&nbsp;`
    : "";
}
