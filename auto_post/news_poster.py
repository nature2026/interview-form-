import os
import time
import urllib.request
import xml.etree.ElementTree as ET
import tweepy
from datetime import date
from dotenv import load_dotenv

load_dotenv()

X_URL_LENGTH = 23  # X の t.co 短縮後の固定文字数
MAX_TWEET_LENGTH = 280

RSS_FEEDS = [
    "https://www3.nhk.or.jp/nhkworld/en/news/feeds/",
    "https://feeds.reuters.com/reuters/topNews",
    "https://rss.cnn.com/rss/edition_world.rss",
]

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; news-poster-bot/1.0)"}


def fetch_feed(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=15) as resp:
                return resp.read()
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
            else:
                print(f"[WARN] {url} 取得失敗: {e}")
    return None


def parse_rss(content):
    try:
        root = ET.fromstring(content)
    except ET.ParseError:
        return []

    articles = []
    # RSS 2.0
    for item in root.findall(".//item"):
        title = item.findtext("title", "").strip()
        link = item.findtext("link", "").strip()
        if title and link:
            articles.append({"title": title, "url": link})

    # Atom フィード
    if not articles:
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        for entry in root.findall(".//atom:entry", ns):
            title = entry.findtext("atom:title", "", ns).strip()
            link_el = entry.find("atom:link", ns)
            link = (link_el.get("href", "") if link_el is not None else "").strip()
            if title and link:
                articles.append({"title": title, "url": link})

    return articles


def fetch_top_news(count=3):
    articles = []
    for url in RSS_FEEDS:
        if len(articles) >= count:
            break
        content = fetch_feed(url)
        if content is None:
            continue
        fetched = parse_rss(content)
        for a in fetched:
            if len(articles) >= count:
                break
            articles.append(a)
    return articles


def tweet_display_length(text):
    """X の文字数カウント: URL は t.co 短縮で固定23文字として計算"""
    import re
    url_pattern = re.compile(r"https?://\S+")
    urls = url_pattern.findall(text)
    non_url = url_pattern.sub("", text)
    return len(non_url) + len(urls) * X_URL_LENGTH


def build_tweet(articles):
    today = date.today().strftime("%Y/%m/%d")
    header = f"📰 Today's News ({today})\n\n"
    budget = MAX_TWEET_LENGTH - tweet_display_length(header)

    lines = []
    for i, article in enumerate(articles, 1):
        title = article["title"].split(" - ")[0].strip()
        url = article["url"]
        # URL は23文字固定 + 番号・改行・スペース の分を引く
        overhead = len(f"{i}. \n{url}\n\n") - len(url) + X_URL_LENGTH
        max_title = budget - overhead
        if max_title <= 0:
            break
        if len(title) > max_title:
            title = title[: max_title - 1] + "…"
        line = f"{i}. {title}\n{url}\n"
        budget -= tweet_display_length(line) + 1  # +1 for \n separator
        lines.append(line)

    return header + "\n".join(lines)


def post_to_x(text, retries=3):
    client = tweepy.Client(
        consumer_key=os.getenv("X_API_KEY"),
        consumer_secret=os.getenv("X_API_SECRET"),
        access_token=os.getenv("X_ACCESS_TOKEN"),
        access_token_secret=os.getenv("X_ACCESS_TOKEN_SECRET"),
    )
    for attempt in range(retries):
        try:
            response = client.create_tweet(text=text)
            return response.data["id"]
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
            else:
                raise


def main():
    articles = fetch_top_news(count=3)
    if not articles:
        print("ERROR: ニュースが1件も取得できませんでした")
        raise SystemExit(1)

    tweet = build_tweet(articles)
    display_len = tweet_display_length(tweet)
    print(f"--- 投稿内容 (表示文字数: {display_len}/{MAX_TWEET_LENGTH}) ---")
    print(tweet)
    print("---")

    if display_len > MAX_TWEET_LENGTH:
        print(f"ERROR: ツイートが{display_len}文字で上限超過")
        raise SystemExit(1)

    tweet_id = post_to_x(tweet)
    print(f"投稿完了！ Tweet ID: {tweet_id}")


if __name__ == "__main__":
    main()
