if [ ! -d "./cobra-activity-demo-app/src/androidTest/assets/test_resources/audio" ]
then
    echo "Creating test audio samples directory..."
    mkdir -p ./cobra-activity-demo-app/src/androidTest/assets/test_resources/audio
fi

echo "Copying test audio samples..."
cp ../../../res/audio/sample.wav ./cobra-activity-demo-app/src/androidTest/assets/test_resources/audio/sample.wav
