import rgbHex from "rgb-hex";

/**
 * Get the MarkdownString for vscode.MarkdownString function
 * Note: should convert rgb color to hex
 * @param value string
 * @returns MarkdownString | string
 */
export function getMarkdownString(value: string) {
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
