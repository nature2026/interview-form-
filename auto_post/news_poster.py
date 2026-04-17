import os
import tweepy
import requests
from datetime import date
from dotenv import load_dotenv

load_dotenv()

# --- News 取得 ---
def fetch_top_news(page_size=3):
    api_key = os.getenv("NEWS_API_KEY")
    url = "https://newsapi.org/v2/everything"
    params = {
        "q": "日本 OR Japan",
        "language": "ja",
        "sortBy": "publishedAt",
        "pageSize": page_size,
        "apiKey": api_key,
    }
    res = requests.get(url, params=params, timeout=10)
    res.raise_for_status()
    articles = res.json().get("articles", [])
    return articles


# --- ツイート本文を組み立てる ---
def build_tweet(articles):
    today = date.today().strftime("%Y/%m/%d")
    lines = [f"📰 今日のニュース ({today})\n"]
    for i, article in enumerate(articles, 1):
        title = article.get("title", "").split(" - ")[0]  # 媒体名を除去
        url = article.get("url", "")
        lines.append(f"{i}. {title}\n{url}\n")
    return "\n".join(lines)


# --- X に投稿 ---
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
    articles = fetch_top_news(page_size=3)
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
