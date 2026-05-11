import React from "react";
import katex from "katex";
import { linkify } from "@/lib/linkify";

type TokenType = "text" | "code" | "math";

type Token = {
  type: TokenType;
  value: string;
};

function tokenizePostContent(input: string): Token[] {
  const tokens: Token[] = [];
  let mode: TokenType = "text";
  let buffer = "";
  let i = 0;

  const pushToken = (type: TokenType, value: string) => {
    if (value.length > 0) {
      tokens.push({ type, value });
    }
  };

  while (i < input.length) {
    const char = input[i];

    if (mode === "text") {
      if (char === "\\") {
        if (i + 1 < input.length) {
          buffer += input[i + 1];
          i += 2;
          continue;
        }
        buffer += "\\";
        i += 1;
        continue;
      }

      if (char === "`") {
        pushToken("text", buffer);
        buffer = "";
        mode = "code";
        i += 1;
        continue;
      }

      if (char === "$" && input[i + 1] === "$") {
        pushToken("text", buffer);
        buffer = "";
        mode = "math";
        i += 2;
        continue;
      }

      buffer += char;
      i += 1;
      continue;
    }

    if (mode === "code") {
      if (char === "`") {
        pushToken("code", buffer);
        buffer = "";
        mode = "text";
        i += 1;
        continue;
      }

      buffer += char;
      i += 1;
      continue;
    }

    if (mode === "math") {
      if (char === "\\") {
        if (i + 1 < input.length) {
          buffer += input.slice(i, i + 2);
          i += 2;
          continue;
        }
        buffer += "\\";
        i += 1;
        continue;
      }

      if (char === "$" && input[i + 1] === "$") {
        pushToken("math", buffer);
        buffer = "";
        mode = "text";
        i += 2;
        continue;
      }

      buffer += char;
      i += 1;
      continue;
    }
  }

  if (mode === "text") {
    pushToken("text", buffer);
  } else if (mode === "code") {
    pushToken("text", "`" + buffer);
  } else if (mode === "math") {
    pushToken("text", "$$" + buffer);
  }

  return tokens;
}

export function renderPostContent(content: string): React.ReactNode[] {
  const tokens = tokenizePostContent(content);
  const nodes: React.ReactNode[] = [];

  tokens.forEach((token, tokenIndex) => {
    if (token.type === "text") {
      const parts = linkify(token.value);
      parts.forEach((part, partIndex) => {
        nodes.push(
          <React.Fragment key={`text-${tokenIndex}-${partIndex}`}>
            {part}
          </React.Fragment>
        );
      });
      return;
    }

    if (token.type === "code") {
      nodes.push(
        <code
          key={`code-${tokenIndex}`}
          className="rounded bg-gray-800/70 px-1 py-0.5 font-mono text-xs text-gray-200"
        >
          {token.value}
        </code>
      );
      return;
    }

    const html = katex.renderToString(token.value, {
      displayMode: true,
      throwOnError: false,
    });

    nodes.push(
      <span
        key={`math-${tokenIndex}`}
        className="my-2 block max-w-full overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  });

  return nodes;
}
