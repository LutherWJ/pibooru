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

  describe("applyDefaultRating", () => {
    it("does nothing if defaultRating is 'all' or undefined", () => {
      const q1 = SearchParser.parse("cat");
      SearchParser.applyDefaultRating(q1, "all");
      expect(q1.rating).toBeUndefined();
      expect(q1.ratings).toBeUndefined();

      const q2 = SearchParser.parse("cat");
      SearchParser.applyDefaultRating(q2, undefined);
      expect(q2.rating).toBeUndefined();
      expect(q2.ratings).toBeUndefined();
    });

    it("does not override an explicitly searched rating", () => {
      const q = SearchParser.parse("cat rating:e");
      SearchParser.applyDefaultRating(q, "s");
      expect(q.rating).toBe("e");
      expect(q.ratings).toBeUndefined();
    });

    it("applies 's' default rating", () => {
      const q = SearchParser.parse("cat");
      SearchParser.applyDefaultRating(q, "s");
      expect(q.rating).toBe("s");
    });

    it("applies 'e' default rating", () => {
      const q = SearchParser.parse("cat");
      SearchParser.applyDefaultRating(q, "e");
      expect(q.rating).toBe("e");
    });

    it("applies 's_q' default rating", () => {
      const q = SearchParser.parse("cat");
      SearchParser.applyDefaultRating(q, "s_q");
      expect(q.ratings).toEqual(["s", "q"]);
    });

    it("applies 'q_e' (explicit and up) default rating", () => {
      const q = SearchParser.parse("cat");
      SearchParser.applyDefaultRating(q, "q_e");
      expect(q.ratings).toEqual(["q", "e"]);
    });
  });
});
