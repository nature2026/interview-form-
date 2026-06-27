import os
import tweepy
import feedparser
from datetime import date
from dotenv import load_dotenv

load_dotenv()

RSS_FEEDS = [
    "https://www3.nhk.or.jp/nhkworld/en/news/feeds/",       # NHK World (無料)
    "https://feeds.reuters.com/reuters/topNews",             # Reuters Top News (無料)
    "https://rss.cnn.com/rss/edition_world.rss",            # CNN World (無料)
]


def fetch_top_news(count=3):
    articles = []
    for feed_url in RSS_FEEDS:
        if len(articles) >= count:
            break
        feed = feedparser.parse(feed_url)
        for entry in feed.entries:
            if len(articles) >= count:
                break
            title = entry.get("title", "").strip()
            link = entry.get("link", "").strip()
            if title and link:
                articles.append({"title": title, "url": link})
    return articles


def build_tweet(articles):
    today = date.today().strftime("%Y/%m/%d")
    lines = [f"📰 Today's News ({today})\n"]
    for i, article in enumerate(articles, 1):
        title = article["title"].split(" - ")[0]
        url = article["url"]
        lines.append(f"{i}. {title}\n{url}\n")
    return "\n".join(lines)


def post_to_x(text):
    client = tweepy.Client(
        consumer_key=os.getenv("X_API_KEY"),
        consumer_secret=os.getenv("X_API_SECRET"),
        access_token=os.getenv("X_ACCESS_TOKEN"),
        access_token_secret=os.getenv("X_ACCESS_TOKEN_SECRET"),
    )
    response = client.create_tweet(text=text)
    return response.data["id"]


def main():
    articles = fetch_top_news(count=3)
    if not articles:
        print("ニュースが取得できませんでした")
        return

    tweet = build_tweet(articles)
    print("--- 投稿内容 ---")
    print(tweet)
    print("---------------")

    tweet_id = post_to_x(tweet)
    print(f"投稿完了！ Tweet ID: {tweet_id}")


if __name__ == "__main__":
    main()
