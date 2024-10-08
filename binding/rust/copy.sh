#! /bin/bash

echo "Removing old data ..."
rm -rf ./data


echo "Preparing dir ..."
mkdir -p ./data/lib/


for platform in linux mac raspberry-pi windows
do
    echo "Copying Library Files for $platform ..."
    cp -r ../../lib/$platform ./data/lib/
done

echo "Copy complete!"
