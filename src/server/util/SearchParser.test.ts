import { describe, expect, it } from "bun:test";
import { SearchParser } from "./SearchParser";

describe("SearchParser", () => {
  it("parses simple tags", () => {
    const query = SearchParser.parse("cat dog");
    expect(query.tags).toEqual([
      { name: "cat", namespace: "general", negated: false },
      { name: "dog", namespace: "general", negated: false }
    ]);
  });

  it("parses negated tags", () => {
    const query = SearchParser.parse("cat -dog");
    expect(query.tags).toEqual([
      { name: "cat", namespace: "general", negated: false },
      { name: "dog", namespace: "general", negated: true }
    ]);
  });

  it("parses namespaced tags", () => {
    const query = SearchParser.parse("artist:picasso");
    expect(query.tags).toEqual([
      { name: "picasso", namespace: "artist", negated: false }
    ]);
  });

  it("parses negated namespaced tags", () => {
    const query = SearchParser.parse("-char:miku");
    expect(query.tags).toEqual([
      { name: "miku", namespace: "character", negated: true }
    ]);
  });

  it("parses rating metatag", () => {
    const query = SearchParser.parse("rating:s");
    expect(query.rating).toBe("s");
  });

  it("parses short rating metatag", () => {
    const query = SearchParser.parse("r:q");
    expect(query.rating).toBe("q");
  });

  it("parses limit metatag", () => {
    const query = SearchParser.parse("limit:10");
    expect(query.limit).toBe(10);
  });

  it("parses order metatag", () => {
    const query = SearchParser.parse("order:id_desc");
    expect(query.order).toBe("id_desc");
  });

  it("parses type metatag", () => {
    const queryVideo = SearchParser.parse("type:video");
    expect(queryVideo.type).toBe("video");

    const queryImage = SearchParser.parse("type:image");
    expect(queryImage.type).toBe("image");
  });

  it("handles complex queries", () => {
    const query = SearchParser.parse("cat artist:miku -dog r:e type:video limit:20");
    expect(query.tags).toEqual([
      { name: "cat", namespace: "general", negated: false },
      { name: "miku", namespace: "artist", negated: false },
      { name: "dog", namespace: "general", negated: true }
    ]);
    expect(query.rating).toBe("e");
    expect(query.type).toBe("video");
    expect(query.limit).toBe(20);
  });
});
