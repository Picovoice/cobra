import argparse
import datetime
import requests
import time
import random
import string
import os

import boto3


# TODO: These ARNS should be supplied as arguments
PROJECT_ARN = ""
ANDROID_TEST_SPEC_ARN = ""
ANDROID_DEVICE_POOL_ARN = ""


def upload_device_farm(
        client,
        run_uuid,
        project_arn,
        filepath,
        df_type,
        mime='application/octet-stream'):
    response = client.create_upload(projectArn=project_arn,
        name = f"{run_uuid}_{os.path.basename(filepath)}",
        type=df_type,
        contentType=mime)
    upload_arn = response['upload']['arn']
    upload_url = response['upload']['url']

    with open(filepath, 'rb') as file_stream:
        print(f"Uploading {filepath} to Device Farm as {response['upload']['name']}... ", end='')
        put_req = requests.put(upload_url, data=file_stream, headers={"content-type": mime})
        print(" done")
        if not put_req.ok:
            raise Exception("Couldn't upload, requests said we're not ok. Requests says: "+ put_req.reason)

    started = datetime.datetime.now()
    while True:
        print(f"Upload of {filepath} in state {response['upload']['status']} after "+ str(datetime.datetime.now() - started))
        if response['upload']['status'] == 'FAILED':
            raise Exception("The upload failed processing. DeviceFarm says reason is: \n"+(response['upload']['message'] if 'message' in response['upload'] else response['upload']['metadata']))
        if response['upload']['status'] == 'SUCCEEDED':
            break
        time.sleep(5)
        response = client.get_upload(arn=upload_arn)

    return upload_arn


def schedule_run(
        client,
        run_uuid,
        project_arn,
        app_arn,
        test_arn,
        test_spec_arn,
        test_df_type,
        device_pool_arn):
    response = client.schedule_run(
        projectArn = project_arn,
        appArn = app_arn,
        devicePoolArn = device_pool_arn,
        name=run_uuid,
        test = {
            "type": test_df_type,
            "testSpecArn": test_spec_arn,
            "testPackageArn": test_arn
            }
        )
    run_arn = response['run']['arn']
    return run_arn


def wait_for_run(
        client,
        run_uuid,
        run_arn):
    start_time = datetime.datetime.now()
    try:
        while True:
            response = client.get_run(arn=run_arn)
            state = response['run']['status']
            if state == 'COMPLETED' or state == 'ERRORED':
                break
            else:
                print(f"Run {run_uuid} in state {state}, total time "+str(datetime.datetime.now()-start_time))
                time.sleep(10)
    except Exception as e:
        client.stop_run(arn=run_arn)
        print(e)
        exit(1)

    print(f"Tests finished in state {state} after "+str(datetime.datetime.now() - start_time))
    # TODO: Get output and print


def main(args: argparse.Namespace) -> None:
    run_uuid = f"cobra-{args.type}-{args.run_name}-{datetime.date.today().isoformat()}-{''.join(random.sample(string.ascii_letters,8))}"
    client = boto3.client("devicefarm", region_name="us-west-2")

    print(f"Starting device farm run: {run_uuid}")

    if (args.type == 'android'):
        app_arn = upload_device_farm(
            client,
            run_uuid,
            PROJECT_ARN,
            args.app_path,
            "ANDROID_APP")
        test_arn = upload_device_farm(
            client,
            run_uuid,
            PROJECT_ARN,
            args.test_path,
            "INSTRUMENTATION_TEST_PACKAGE")
        print(f"app_arn: {app_arn}")
        print(f"test_arn: {test_arn}")

        run_arn = schedule_run(
            client,
            run_uuid,
            PROJECT_ARN,
            app_arn,
            test_arn,
            ANDROID_TEST_SPEC_ARN,
            "INSTRUMENTATION",
            ANDROID_DEVICE_POOL_ARN)

        print(f"run_arn: {run_arn}")
        wait_for_run(client, run_uuid, run_arn)
    elif (args.type == 'ios'):
        app_arn = upload_device_farm(
            client,
            run_uuid,
            PROJECT_ARN,
            args.app_path,
            "IOS_APP")
        test_arn = upload_device_farm(
            client,
            run_uuid,
            PROJECT_ARN,
            args.test_path,
            "XCTEST_UI_TEST_PACKAGE")
        print(f"app_arn: {app_arn}")
        print(f"test_arn: {test_arn}")

        run_arn = schedule_run(
            client,
            run_uuid,
            PROJECT_ARN,
            app_arn,
            test_arn,
            IOS_TEST_SPEC_ARN,
            "XCTEST_UI",
            IOS_DEVICE_POOL_ARN)

        print(f"run_arn: {run_arn}")
        wait_for_run(client, run_uuid, run_arn)
    else:
        print("Invalid device type")
        exit(1)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--type', choices=['android', 'ios'], required=True)

    parser.add_argument('--run_name', required=True)
    parser.add_argument('--app_path', required=True)
    parser.add_argument('--test_path', required=True)
    args = parser.parse_args()

    # TODO: LIST DEVICE POOLS

    main(args)
