import React from "react";
import { Text } from "ink";
import { marked } from "marked";
import TerminalRenderer from "marked-terminal";
import { Chalk } from "chalk";

const chalk = new Chalk();

marked.setOptions({
    renderer: (new TerminalRenderer({

        tab: 2,

        heading: (text: string) =>
            chalk.hex("#CC561E").bold.underline(
                text
                    .replace(/\n+$/g, "")
                    .trim()
            ),

        firstHeading: (text: string) =>
            "" +
            chalk.hex("#CC561E").bold.underline(`${text}`) +
            "",

        paragraph: (text: string) =>
            chalk.reset(
                text
                    .replace(/\n{2,}/g, "\n")   // collapse multiple blank lines
                    .replace(/\n+$/g, "")       // remove trailing real newlines
                    .replace(/(\\n)+$/g, "")    // remove trailing escaped newlines
                    .trimEnd()
            ),
        strong: chalk.bold.hex("#ffffff"),
        em: chalk.italic.hex("#d4d4d4"),
        del: chalk.dim.strikethrough.gray,

        // Code-related
        code: (text: string) =>
            chalk.bgHex("#1e1e1e").hex("#ffd866")(` ${text} `),

        codespan: (text: string) =>
            chalk.bgHex("#2a2a2a").hex("#ffcb6b")(` ${text} `),

        html: chalk.dim.gray,

        // Quotes / callouts
        blockquote: (text: string) =>
            chalk.hex("#7f8c8d").italic(`│ ${text}`),

        // Links
        link: chalk.hex("#4fc3f7"),
        href: chalk.blueBright.underline,


        hr: () => "\n" + chalk.dim('-'.repeat(process.stdout.columns - 6)) + "\n",

        // Lists
        listitem: (text: string) =>
            chalk.hex("#00bcd4")("") + text,

        list: (body: string, ordered?: boolean) => {
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

    }) as any),
});


export function MarkdownRenderer({ content }: { content: string }) {
    const html = marked(content);

    return <Text>{html}</Text>;
}