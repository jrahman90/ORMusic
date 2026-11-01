import { useEffect } from "react";

export default function ProfileSeo({ artist, missing }) {
  useEffect(() => {
    if (!artist && !missing) return;
    const name = artist?.name || "Event specialist";
    const title = missing ? "Team Profile Not Found | OR Music Events" : `${name} | OR Music Events`.slice(0, 59);
    const description = missing ? "This team profile could not be found." : `Meet ${name}, part of the OR Music Events team for NYC weddings, corporate events and private celebrations.`.slice(0, 155);
    document.title = title;
    for (const [selector, value] of [
      ['meta[name="description"]', description],
      ['meta[property="og:title"]', title],
      ['meta[property="og:description"]', description],
      ['meta[name="twitter:title"]', title],
      ['meta[name="twitter:description"]', description],
      ['meta[name="robots"]', missing ? "noindex, follow" : "index, follow, max-image-preview:large"],
    ]) document.head.querySelector(selector)?.setAttribute("content", value);
    const schema = document.getElementById("page-schema");
    if (schema) {
      const value = JSON.parse(schema.textContent);
      value.name = title;
      value.description = description;
      schema.textContent = JSON.stringify(value);
    }
  }, [artist, missing]);
  return null;
}
