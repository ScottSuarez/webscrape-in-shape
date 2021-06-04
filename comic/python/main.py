import cloudscraper
import requests
import json
import sys
import os

def page_downloader(self, manga_url, scrapper_delay=5, **kwargs):
    headers = kwargs.get("headers")
    if not headers:
        headers = {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
            'Accept-Encoding': 'gzip, deflate'
        }

    sess = requests.session()
    sess = cloudscraper.create_scraper(sess, delay=scrapper_delay)

    connection = sess.get(manga_url, headers=headers, cookies=kwargs.get("cookies"))

    if connection.status_code != 200:
        print("Whoops! Seems like I can't connect to website.")
        print("It's showing : %s" % connection)
        print("Run this script with the --verbose argument and report the issue along with log file on Github.")
        raise Warning("can't connect to website %s" % manga_url)
    else:
        page_source = BeautifulSoup(connection.text.encode("utf-8"), "html.parser")
        connection_cookies = sess.cookies

        return page_source, connection_cookies

print('Hello World!')
