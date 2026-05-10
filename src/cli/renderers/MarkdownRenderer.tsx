import React from "react";
import { Text } from "ink";
import { marked } from "marked";

export function MarkdownRenderer({ content }: { content: string }) {
    const html = marked.parse(content);

    return <Text>{html}</Text>;
}