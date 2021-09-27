#!/usr/bin/python3

import os
import sys
import threading
import time
from argparse import ArgumentParser
from http.server import HTTPServer, SimpleHTTPRequestHandler
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

def simple_http_server(host='localhost', port=4001, path='.'):
    server = HTTPServer((host, port), SimpleHTTPRequestHandler)
    thread = threading.Thread(target=server.serve_forever)
    thread.deamon = True

    cwd = os.getcwd()
    base_url = 'http://{}:{}'.format(host, port)

    def start():
        os.chdir(path)
        thread.start()
        print('starting server on port {}'.format(server.server_port))

    def stop():
        os.chdir(cwd)
        server.shutdown()
        server.socket.close()
        print('stopping server on port {}'.format(server.server_port))

    return start, stop, base_url


def main():
    parser = ArgumentParser()

    parser.add_argument('--root_path',
                        metavar='ROOT_PATH',
                        required=True,
                        type=str,
                        help='The root folder of zoo-dev repo')


    parser.add_argument('--app_id',
                        metavar='APP_ID',
                        required=True,
                        type=str)

    input_args = parser.parse_args()

    start, stop, base_url = simple_http_server(port=4005, path=input_args.root_path)
    test_url = base_url + "/cobra-web-factory/test"
    start()
    time.sleep(10)
    
    try:
        result = run_unit_test_selenium(test_url, input_args.app_id)
        stop()
        sys.exit(result)
    except Exception as e:
        print(e)
        stop()
        sys.exit(1)


def run_unit_test_selenium(url, app_id):
    desired_capabilities = DesiredCapabilities.CHROME
    desired_capabilities['goog:loggingPrefs'] = {'browser': 'ALL'}
    opts = Options()
    opts.headless = True
    driver = webdriver.Chrome(desired_capabilities=desired_capabilities, options=opts)

    driver.get(url)
    assert "unit test" in driver.title

    driver.find_element_by_id("appId").send_keys(app_id)
    driver.find_element_by_id("sumbit").click()
    time.sleep(10)

    for entry in driver.get_log('browser'):
        if 'Test failed' in entry['message']:
            print(f"unit test failed with \n {entry['message']}")
            driver.close()
            return 1

    driver.close()
    return 0


if __name__ == '__main__':
    main()
