const FALLBACK_IDS = ["jfKfPfyJRdk", "5qap5aO4i9A", "DWcJFNfaw9c", "M7lc1UVf-VE"];

function fallbackVideos(query, maxResults) {
  const count = Number(maxResults) || 4;
  return FALLBACK_IDS.slice(0, count).map((id, index) => ({
    id,
    title: `${query} 추천 영상 ${index + 1}`,
    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    channel: "Routine Picks",
    url: `https://www.youtube.com/watch?v=${id}`,
    publishedAt: null,
    viewCount: null,
  }));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const maxResults = searchParams.get("maxResults") || "4";

  if (!query) {
    return Response.json({ error: "q is required" }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return Response.json({ videos: fallbackVideos(query, maxResults), fallback: true });
  }

  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${apiKey}`;

  try {
    const res = await fetch(searchUrl);
    const data = await res.json();

    if (!res.ok) {
      return Response.json({ videos: fallbackVideos(query, maxResults), fallback: true });
    }

    const items = data.items || [];
    const videoIds = items.map((item) => item.id.videoId).join(",");

    // 조회수 통계 가져오기
    let statsMap = {};
    if (videoIds) {
      const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`;
      const statsRes = await fetch(statsUrl);
      const statsData = await statsRes.json();
      (statsData.items || []).forEach((item) => {
        statsMap[item.id] = item.statistics;
      });
    }

    const videos = items.map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail:
        item.snippet.thumbnails.medium?.url ||
        item.snippet.thumbnails.default?.url,
      channel: item.snippet.channelTitle,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      publishedAt: item.snippet.publishedAt ?? null,
      viewCount: statsMap[item.id.videoId]?.viewCount ?? null,
    }));

    return Response.json({ videos });
  } catch {
    return Response.json({ videos: fallbackVideos(query, maxResults), fallback: true });
  }
}
