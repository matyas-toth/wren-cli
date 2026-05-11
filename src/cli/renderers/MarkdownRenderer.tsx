import React from "react";
import { Text } from "ink";
import { marked } from "marked";
import TerminalRenderer from "marked-terminal";
import { Chalk } from "chalk";

const chalk = new Chalk();

marked.setOptions({
    renderer: new TerminalRenderer({

        tab: 2,

        heading: (text) =>
            "" + chalk.hex("#00ff87").bold.underline(text) + "",

        firstHeading: (text) =>
            "" +
            chalk.hex("#00d9ff").bold.underline(`${text}`) +
            "",

        paragraph: (text) => chalk.reset(text).replaceAll("\n", "").replaceAll("\\n", ""),
        strong: chalk.bold.hex("#ffffff"),
        em: chalk.italic.hex("#d4d4d4"),
        del: chalk.dim.strikethrough.gray,

        // Code-related
        code: (text) =>
            chalk.bgHex("#1e1e1e").hex("#ffd866")(` ${text} `),

        codespan: (text) =>
            chalk.bgHex("#2a2a2a").hex("#ffcb6b")(` ${text} `),

        html: chalk.dim.gray,

        // Quotes / callouts
        blockquote: (text) =>
            chalk.hex("#7f8c8d").italic(`│ ${text}`),

        // Links
        link: chalk.hex("#4fc3f7"),
        href: chalk.blueBright.underline,


        hr: () => "\n" + chalk.dim('-'.repeat(process.stdout.columns - 6)) + "\n",

        // Lists
        listitem: (text) =>
            chalk.hex("#00bcd4")("") + text,

        list: (body, ordered) => {
            // Remove excessive blank lines between nested list items
            const cleaned = body
                .replace(/\n{3,}/g, "\n\n")     // collapse huge gaps
                .replace(/\n\n(\s{2,}[*-])/g, "\n$1"); // nested items stay tight

            // Add spacing only between top-level items
            return cleaned.replace(
                /^([*-]|\d+\.)\s.+$/gm,
                (match, offset, full) => {
                    return offset === 0 ? match : `\n${match}`;
                }
            );
        },

        // Tables
        table: chalk.reset,
        tableOptions: {
            chars: {
                top: "─",
                "top-mid": "┬",
                "top-left": "┌",
                "top-right": "┐",
                bottom: "─",
                "bottom-mid": "┴",
                "bottom-left": "└",
                "bottom-right": "┘",
                left: "│",
                "left-mid": "├",
                mid: "─",
                "mid-mid": "┼",
                right: "│",
                "right-mid": "┤",
                middle: "│"
            },
            style: {
                head: [],
                border: ["gray"]
            }
        },

    }),
});


export function MarkdownRenderer({ content }: { content: string }) {
    const html = marked(content);

    return <Text>{html}</Text>;
}