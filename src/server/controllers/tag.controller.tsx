import type { Context } from "hono";
import { TagModel } from "../models/Tag";
import { PostModel } from "../models/Post";
import { Tags } from "../views/Tags";
import { TagDetail } from "../views/TagDetail";
import { TagSuggestions, type SuggestionItem } from "../components/TagSuggestions";
import { TagAliasItem, TagImplicationItem } from "../components/TagFragments";
import type { AppEnv } from "../types";

const QUERY_MODIFIERS: { prefix: string; values: { val: string; desc: string }[] }[] = [
    {
        prefix: "order:",
        values: [
            { val: "order:random", desc: "Random shuffle order" },
            { val: "order:newest", desc: "Newest posts first" },
            { val: "order:oldest", desc: "Oldest posts first" },
            { val: "order:id_desc", desc: "Highest post ID first" },
            { val: "order:id_asc", desc: "Lowest post ID first" },
        ]
    },
    {
        prefix: "rating:",
        values: [
            { val: "rating:s", desc: "Safe / General audience" },
            { val: "rating:q", desc: "Questionable / Sensitive content" },
            { val: "rating:e", desc: "Explicit / Adult content" },
        ]
    },
    {
        prefix: "r:",
        values: [
            { val: "r:s", desc: "Safe / General audience" },
            { val: "r:q", desc: "Questionable / Sensitive content" },
            { val: "r:e", desc: "Explicit / Adult content" },
        ]
    },
    {
        prefix: "type:",
        values: [
            { val: "type:image", desc: "Images only (PNG, JPG, WebP, GIF)" },
            { val: "type:video", desc: "Videos only (MP4, WebM)" },
        ]
    },
    {
        prefix: "limit:",
        values: [
            { val: "limit:20", desc: "20 posts per page" },
            { val: "limit:50", desc: "50 posts per page" },
            { val: "limit:100", desc: "100 posts per page" },
        ]
    },
    {
        prefix: "id:",
        values: [
            { val: "id:<", desc: "Posts with ID less than (older)" },
            { val: "id:>", desc: "Posts with ID greater than (newer)" },
        ]
    }
];

const MODIFIER_PREFIXES = [
    { prefix: "order:", desc: "Sort order modifier (random, newest, oldest...)" },
    { prefix: "rating:", desc: "Content rating modifier (s/q/e)" },
    { prefix: "type:", desc: "Media type filter (image/video)" },
    { prefix: "limit:", desc: "Results per page (e.g. limit:50)" },
    { prefix: "id:", desc: "Post ID range (id:<100, id:>100)" },
    { prefix: "artist:", desc: "Artist namespace" },
    { prefix: "character:", desc: "Character namespace" },
    { prefix: "copyright:", desc: "Copyright / series namespace" },
    { prefix: "meta:", desc: "Metadata tag namespace" },
];

export class TagController {
    static async suggestTags(c: Context<AppEnv>) {
        const { q, tags } = c.req.valid("query" as never) as { q?: string; tags?: string };
        const input = q || tags || "";

        let lastToken = "";
        if (input.length > 0 && !input.endsWith(' ')) {
            const tokens = input.trim().split(/\s+/);
            lastToken = tokens[tokens.length - 1] || "";
        }

        if (!lastToken) {
            return c.html("");
        }

        const isNegated = lastToken.startsWith("-");
        const tokenToMatch = isNegated ? lastToken.substring(1).toLowerCase() : lastToken.toLowerCase();
        const negPrefix = isNegated ? "-" : "";

        const suggestionItems: SuggestionItem[] = [];

        // 1. Token contains colon (e.g. "order:", "order:r", "rating:s", "type:v", "artist:p")
        if (tokenToMatch.includes(":")) {
            for (const mod of QUERY_MODIFIERS) {
                if (tokenToMatch.startsWith(mod.prefix)) {
                    const subquery = tokenToMatch.substring(mod.prefix.length);
                    for (const v of mod.values) {
                        const valAfterPrefix = v.val.substring(mod.prefix.length);
                        if (!subquery || valAfterPrefix.startsWith(subquery)) {
                            suggestionItems.push({
                                value: negPrefix + v.val,
                                name: negPrefix + v.val,
                                namespace: "modifier",
                                description: v.desc,
                                isModifier: true
                            });
                        }
                    }
                }
            }

            // Also search TagModel for namespaced tags (e.g. artist:picasso, character:miku)
            const tagResults = TagModel.search(tokenToMatch, 10);
            for (const t of tagResults) {
                const tagValue = t.namespace === 'general' ? t.name : `${t.namespace}:${t.name}`;
                suggestionItems.push({
                    id: t.id,
                    value: negPrefix + tagValue,
                    name: negPrefix + t.name,
                    namespace: t.namespace,
                    post_count: t.post_count,
                    isModifier: false
                });
            }

            return c.html(<TagSuggestions suggestions={suggestionItems} />);
        }

        // 2. Token does not contain colon (e.g. "ord", "rat", "typ", "cat")
        // Suggest matching modifier prefixes first (e.g. "order:", "rating:")
        for (const p of MODIFIER_PREFIXES) {
            if (p.prefix.startsWith(tokenToMatch)) {
                suggestionItems.push({
                    value: negPrefix + p.prefix,
                    name: negPrefix + p.prefix,
                    namespace: "modifier",
                    description: p.desc,
                    isModifier: true
                });
            }
        }

        // Query regular tags
        const tagResults = TagModel.search(tokenToMatch, 10);
        for (const t of tagResults) {
            const tagValue = t.namespace === 'general' ? t.name : `${t.namespace}:${t.name}`;
            suggestionItems.push({
                id: t.id,
                value: negPrefix + tagValue,
                name: negPrefix + t.name,
                namespace: t.namespace,
                post_count: t.post_count,
                isModifier: false
            });
        }

        return c.html(<TagSuggestions suggestions={suggestionItems} />);
    }

    static async listTags(c: Context<AppEnv>) {
        const { q, page: pageStr } = c.req.valid("query" as never) as { q: string; page: string };
        const limit = 100;
        const page = parseInt(pageStr, 10) || 1;
        const offset = (page - 1) * limit;

        const tags = TagModel.getPaginated(q, limit, offset);
        const totalCount = TagModel.countTotal(q);

        return c.render(
            <Tags
                tags={tags}
                query={q}
                page={page}
                totalCount={totalCount}
                limit={limit}
            />,
            { title: "Tags" }
        );
    }

    static async showTag(c: Context<AppEnv>) {
        const { name } = c.req.valid("param" as never) as { name: string };
        const tag = TagModel.getByName(name);
        if (!tag) return c.notFound();

        const aliases = TagModel.getAliases(tag.id);
        const implications = TagModel.getImplications(tag.id);
        const posts = PostModel.search({ tags: [{ name: tag.name, namespace: tag.namespace, negated: false }] }, 20);

        return c.render(
            <TagDetail
                tag={tag}
                aliases={aliases}
                implications={implications}
                posts={posts}
            />,
            { title: `Tag: ${tag.name}` }
        );
    }

    static async addAlias(c: Context<AppEnv>) {
        const { name } = c.req.valid("param" as never) as { name: string };
        const { alias } = c.req.valid("form" as never) as { alias: string };
        const tag = TagModel.getByName(name);
        if (!tag) return c.notFound();

        TagModel.addAlias(tag.id, alias);
        return c.html(<TagAliasItem tagName={tag.name} alias={alias} />);
    }

    static async removeAlias(c: Context<AppEnv>) {
        const { alias_name } = c.req.valid("param" as never) as { alias_name: string };
        TagModel.removeAlias(alias_name);
        return c.body(null, 204);
    }

    static async addImplication(c: Context<AppEnv>) {
        const { name } = c.req.valid("param" as never) as { name: string };
        const { target_tag: targetTagName } = c.req.valid("form" as never) as { target_tag: string };

        const sourceTag = TagModel.getByName(name);
        if (!sourceTag) return c.notFound();

        const { name: targetName, namespace: targetNamespace } = TagModel.parseRaw(targetTagName);
        const targetTagId = TagModel.getOrCreate(targetName, targetNamespace);
        const targetTag = TagModel.getById(targetTagId);

        if (!targetTag) return c.notFound();

        TagModel.addImplication(sourceTag.id, targetTag.id);
        return c.html(<TagImplicationItem sourceTagName={sourceTag.name} targetTag={targetTag} />);
    }

    static async removeImplication(c: Context<AppEnv>) {
        const { name, target_id } = c.req.valid("param" as never) as { name: string; target_id: number };
        const sourceTag = TagModel.getByName(name);
        if (!sourceTag) return c.notFound();

        TagModel.removeImplication(sourceTag.id, target_id);
        return c.body(null, 204);
    }
}
