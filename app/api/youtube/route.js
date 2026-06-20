export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const maxResults = searchParams.get("maxResults") || "4";

  if (!query) {
    return Response.json({ error: "q is required" }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "YouTube API key not configured" },
      { status: 500 },
    );
  }

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    return Response.json(
      { error: data.error?.message || "YouTube API error" },
      { status: res.status },
    );
  }

  const videos = (data.items || []).map((item) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    thumbnail:
      item.snippet.thumbnails.medium?.url ||
      item.snippet.thumbnails.default?.url,
    channel: item.snippet.channelTitle,
  }));

  return Response.json({ videos });
}
