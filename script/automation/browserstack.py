import argparse
import requests
import time

APP_URI = 'https://api-cloud.browserstack.com/app-automate/{}/v2/app'
TEST_URI = 'https://api-cloud.browserstack.com/app-automate/{}/v2/test-suite'
BUILD_URI = 'https://api-cloud.browserstack.com/app-automate/{}/v2/build'
STATUS_URI = 'https://api-cloud.browserstack.com/app-automate/{}/v2/builds/{}'

ESPRESSO_DEVICES = [
    'Google Pixel 6 Pro-12.0'
]

XCUITEST_DEVICES = [
    'iPhone 12 Pro-17'
]

def get_devices(type: str):
    if type == 'espresso':
        return ESPRESSO_DEVICES
    elif type == 'xcuitest':
        return XCUITEST_DEVICES
    else:
        return []

def main(args: argparse.Namespace) -> None:
    app_files = {
        'file': open(args.app_path, 'rb')
    }

    app_response = requests.post(
        APP_URI.format(args.type),
        files=app_files,
        auth=(args.username, args.access_key)
    )
    app_response_json = app_response.json()

    if not app_response.ok:
        print('App Upload Failed', app_response_json)
        exit(1)

    test_files = {
        'file': open(args.test_path, 'rb')
    }
    test_response = requests.post(
        TEST_URI.format(args.type),
        files=test_files,
        auth=(args.username, args.access_key)
    )
    test_response_json = test_response.json()

    if not test_response.ok:
        print('Test Upload Failed', test_response_json)
        exit(1)

    build_headers = {
        'Content-Type': 'application/json'
    }
    build_data = {
        'app': app_response_json['app_url'],
        'testSuite': test_response_json['test_suite_url'],
        'project': args.project_name,
        'devices': get_devices(args.type)
    }
    build_response = requests.post(
        BUILD_URI.format(args.type),
        headers=build_headers,
        json=build_data,
        auth=(args.username, args.access_key)
    )
    build_response_json = build_response.json()

    if not build_response.ok:
        print('Build Failed', build_response_json)
        exit(1)

    if build_response_json['message'] != 'Success':
        print('Build Unsuccessful')
        exit(1)

    print('View build results at https://app-automate.browserstack.com/dashboard/v2/builds/{}'.format(build_response_json['build_id']))

    while True:
        time.sleep(60)
        status_response = requests.get(
            STATUS_URI.format(args.type, build_response_json['build_id']),
            auth=(args.username, args.access_key)
        )
        status_response_json = status_response.json()
        status = status_response_json['status']

        if not status_response.ok:
            print('Status Request Failed', status_response_json)
            exit(1)

        if status != 'queued' and status != 'running':
            break

    print('Status:', status)
    if status != 'passed':
        exit(1)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--type', choices=['espresso', 'xcuitest'], required=True)
    parser.add_argument('--username', required=True)
    parser.add_argument('--access_key', required=True)

    parser.add_argument('--project_name', required=True)
    parser.add_argument('--app_path', required=True)
    parser.add_argument('--test_path', required=True)
    args = parser.parse_args()

    main(args)