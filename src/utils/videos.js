export const normalizeVideoSrc = (value = "") => {
  const src = String(value || "").trim();
  if (!src) return "";

  try {
    const url = new URL(src);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : src;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : src;
      }

      if (url.pathname.startsWith("/shorts/")) {
        const id = url.pathname.split("/").filter(Boolean)[1];
        return id ? `https://www.youtube.com/embed/${id}` : src;
      }
    }
  } catch {
    return src;
  }

  return src;
};

export const sortVideosNewestFirst = (videos = []) =>
  [...videos].sort(
    (a, b) => Number(b.videoNumber || 0) - Number(a.videoNumber || 0)
  );
