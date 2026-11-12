import type { FC } from "hono/jsx";
import type { Tag } from "../db/schema";

export const TagAliasItem: FC<{ tagName: string; alias: string }> = ({ tagName, alias }) => (
    <li style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <span>{alias}</span>
        <button
            hx-delete={`/api/tags/${tagName}/alias/${alias}`}
            hx-target="closest li"
            hx-swap="outerHTML"
            style="background: #ef4444; color: white; border: none; padding: 2px 5px; cursor: pointer; font-size: 10px;"
        >
            Delete
        </button>
    </li>
);

export const TagImplicationItem: FC<{ sourceTagName: string; targetTag: Tag }> = ({ sourceTagName, targetTag }) => (
    <li style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <a href={`/tag/${targetTag.name}`} class={`tag-type-${targetTag.namespace}`}>{targetTag.name}</a>
        <button
            hx-delete={`/api/tags/${sourceTagName}/implication/${targetTag.id}`}
            hx-target="closest li"
            hx-swap="outerHTML"
            style="background: #ef4444; color: white; border: none; padding: 2px 5px; cursor: pointer; font-size: 10px;"
        >
            Delete
        </button>
    </li>
);
