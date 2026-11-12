import type { Context } from "hono";
import { TagModel } from "../models/Tag";
import { PostModel } from "../models/Post";
import { Tags } from "../views/Tags";
import { TagDetail } from "../views/TagDetail";
import { TagSuggestions } from "../components/TagSuggestions";
import { TagAliasItem, TagImplicationItem } from "../components/TagFragments";
import type { AppEnv } from "../types";

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

        if (lastToken.startsWith("-")) {
            lastToken = lastToken.substring(1);
        }

        const suggestions = TagModel.search(lastToken);
        return c.html(<TagSuggestions tags={suggestions} />);
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
