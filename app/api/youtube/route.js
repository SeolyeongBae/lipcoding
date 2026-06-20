import { searchYouTubeVideos } from "../../../src/youtubeSearch";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const maxResults = searchParams.get("maxResults") || "4";

  if (!query) {
    return Response.json({ error: "q is required" }, { status: 400 });
  }

  const result = await searchYouTubeVideos({
    query,
    maxResults,
    apiKey: process.env.YOUTUBE_API_KEY,
  });

  return Response.json(result);
}
